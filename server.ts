import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { db } from "./server/db.js";
import { generateAiReply, parseAddressText } from "./server/ai.js";

dotenv.config();

export async function createApp(includeFrontend = true) {
  const app = express();
  const GRAPH_API_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION || "v26.0";

  // Middleware for parsing JSON bodies
  app.use(express.json());

  // ==========================================
  // FACEBOOK WEBHOOK ENDPOINTS
  // ==========================================

  // 1. Webhook Verification (GET /api/facebook/webhook)
  // Used by Facebook to verify your server when you register the Webhook URL
  app.get("/api/facebook/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const settings = db.getSettings();

    if (mode === "subscribe" && token === settings.verifyToken) {
      console.log("Facebook Webhook Verified successfully!");
      res.status(200).send(challenge);
    } else {
      console.warn("Facebook Webhook Verification failed. Token mismatch.");
      res.sendStatus(403);
    }
  });

  // Helper to send a message to Facebook Messenger using the Send API
  async function sendFacebookMessage(recipientId: string, text: string) {
    const settings = db.getSettings();
    const pageAccessToken = settings.pageAccessToken?.trim();

    if (!pageAccessToken || pageAccessToken === "EAAb..." || pageAccessToken.includes("YOUR_")) {
      console.log(`[Facebook Send API Simulated] To: ${recipientId} | Message: ${text}`);
      return;
    }

    try {
      const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${pageAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: text },
        }),
      });

      const data = await response.json() as any;
      if (response.ok) {
        console.log(`Successfully sent message to Facebook customer ${recipientId}`);
      } else {
        console.error("Facebook Send API Error:", data.error?.message || data);
      }
    } catch (err) {
      console.error("Failed to connect to Facebook Send API:", err);
    }
  }

  // 2. Webhook Event Receiver (POST /api/facebook/webhook)
  // Receives customer messages from Facebook Fanpage
  app.post("/api/facebook/webhook", async (req, res) => {
    const body = req.body;

    // Check if this is an event from a page subscription
    if (body.object === "page") {
      res.status(200).send("EVENT_RECEIVED");

      // Iterate over each entry - there may be multiple if batched
      for (const entry of body.entry || []) {
        for (const webhookEvent of entry.messaging || []) {
          if (!webhookEvent) continue;

          const senderId = webhookEvent.sender?.id;
          const message = webhookEvent.message;

          if (senderId && message && message.text && !message.is_echo) {
            const text = message.text;
            console.log(`Received message from FB sender ${senderId}: "${text}"`);

            // 1. Create or retrieve thread and save the customer's message
            db.addMessage(senderId, "customer", text);

            // 2. Check if AI Auto-Reply is enabled
            const settings = db.getSettings();
            if (settings.aiEnabled) {
              try {
                // Generate AI response
                const aiReplyText = await generateAiReply(senderId);
              
                // Save AI's message
                db.addMessage(senderId, "ai", aiReplyText);

                // Send the reply back to the actual Facebook user via API
                await sendFacebookMessage(senderId, aiReplyText);
              } catch (error) {
                console.error("Failed to generate AI auto-reply for webhook:", error);
              }
            }
          }
        }
      }
    } else {
      // Returns a '404 Not Found' if event is not from a page subscription
      res.sendStatus(404);
    }
  });


  // ==========================================
  // APP SETTINGS API
  // ==========================================
  app.get("/api/settings", (req, res) => {
    res.json(db.getSettings());
  });

  app.post("/api/settings", (req, res) => {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  });


  // ==========================================
  // CHATS API
  // ==========================================
  app.get("/api/chats", (req, res) => {
    res.json(db.getThreads());
  });

  app.get("/api/chats/:id", (req, res) => {
    const thread = db.getThread(req.params.id);
    if (thread) {
      db.markAsRead(req.params.id);
      res.json(thread);
    } else {
      res.status(404).json({ error: "Thread not found" });
    }
  });

  // Admin manually replies to a thread
  app.post("/api/chats/:id/messages", async (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Message text is required" });
    }

    try {
      // Save admin's message in local DB
      const message = db.addMessage(req.params.id, "admin", text);

      // Send the message to the customer's actual Facebook account
      await sendFacebookMessage(req.params.id, text);

      res.status(201).json(message);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/chats/:id", (req, res) => {
    db.clearChat(req.params.id);
    res.json({ success: true });
  });

  // Simulator Endpoint: Simulate a customer sending a message
  app.post("/api/chats/:id/simulate", async (req, res) => {
    const { customerName, text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Message text is required" });
    }

    const threadId = req.params.id;
    
    // Ensure thread is created with the custom name if provided
    if (customerName) {
      db.createThread(customerName, threadId);
    }

    // 1. Save simulated message from customer
    const msg = db.addMessage(threadId, "customer", text);

    // 2. Trigger AI auto-reply if enabled
    let aiReply = null;
    const settings = db.getSettings();
    if (settings.aiEnabled) {
      try {
        const aiText = await generateAiReply(threadId);
        aiReply = db.addMessage(threadId, "ai", aiText);
        // Also simulate FB send call log
        console.log(`[Simulated Facebook AI reply to ${threadId}]: ${aiText}`);
      } catch (err) {
        console.error("AI auto reply simulation error:", err);
      }
    }

    res.json({ customerMessage: msg, aiReply });
  });


  // ==========================================
  // KNOWLEDGE BASE (FAQ) API
  // ==========================================
  app.get("/api/knowledge-base", (req, res) => {
    res.json(db.getKnowledgeBase());
  });

  app.post("/api/knowledge-base", (req, res) => {
    const { question, answer, keywords } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: "Question and Answer are required" });
    }
    const item = db.addKnowledgeItem({ question, answer, keywords: keywords || [] });
    res.status(201).json(item);
  });

  app.put("/api/knowledge-base/:id", (req, res) => {
    const updated = db.updateKnowledgeItem(req.params.id, req.body);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: "Knowledge item not found" });
    }
  });

  app.delete("/api/knowledge-base/:id", (req, res) => {
    const success = db.deleteKnowledgeItem(req.params.id);
    res.json({ success });
  });


  // ==========================================
  // PRODUCTS API
  // ==========================================
  app.get("/api/products", (req, res) => {
    res.json(db.getProducts());
  });

  app.post("/api/products", (req, res) => {
    const { code, name, price, stock, description } = req.body;
    if (!code || !name || price === undefined) {
      return res.status(400).json({ error: "Code, Name, and Price are required" });
    }
    const product = db.addProduct({ code, name, price: Number(price), stock: Number(stock || 0), description: description || "" });
    res.status(201).json(product);
  });

  app.put("/api/products/:id", (req, res) => {
    const updated = db.updateProduct(req.params.id, req.body);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    const success = db.deleteProduct(req.params.id);
    res.json({ success });
  });


  // ==========================================
  // ORDERS API
  // ==========================================
  app.get("/api/orders", (req, res) => {
    res.json(db.getOrders());
  });

  app.post("/api/orders", (req, res) => {
    const { customerId, customerName, items, status, address } = req.body;
    if (!customerName || !items || !address) {
      return res.status(400).json({ error: "CustomerName, Items, and Address are required" });
    }
    
    // Calculate total
    const total = items.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0);

    const order = db.addOrder({
      customerId: customerId || "manual",
      customerName,
      items,
      total,
      status: status || "pending",
      address,
    });
    res.status(201).json(order);
  });

  app.put("/api/orders/:id", (req, res) => {
    const updated = db.updateOrder(req.params.id, req.body);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: "Order not found" });
    }
  });

  app.delete("/api/orders/:id", (req, res) => {
    const success = db.deleteOrder(req.params.id);
    res.json({ success });
  });


  // ==========================================
  // AI ASSISTED API
  // ==========================================

  // Request an AI Suggested Reply (for Admin to edit/send manually)
  app.post("/api/ai/suggest", async (req, res) => {
    const { threadId, customContext } = req.body;
    if (!threadId) {
      return res.status(400).json({ error: "threadId is required" });
    }

    try {
      const text = await generateAiReply(threadId, customContext || "");
      res.json({ text });
    } catch (error: any) {
      console.error("AI suggest failed:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI response" });
    }
  });

  // Parse address details from unstructured Thai text paste
  app.post("/api/ai/parse-address", async (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    try {
      const catalog = db.getProducts();
      const parsed = await parseAddressText(text, catalog);

      // Now enrich the matched item codes with actual prices and product details from the DB
      const enrichedItems = (parsed.items || []).map((parsedItem) => {
        const product = catalog.find((p) => p.code.toLowerCase() === parsedItem.code.toLowerCase() || p.name.includes(parsedItem.code));
        if (product) {
          return {
            productId: product.id,
            code: product.code,
            name: product.name,
            price: product.price,
            qty: parsedItem.qty,
          };
        } else {
          return {
            productId: "",
            code: parsedItem.code,
            name: `สินค้าไม่ทราบรหัส (${parsedItem.code})`,
            price: 0,
            qty: parsedItem.qty,
          };
        }
      });

      res.json({
        address: parsed.address,
        items: enrichedItems,
      });
    } catch (error: any) {
      console.error("AI parse address failed:", error);
      res.status(500).json({ error: error.message || "Failed to parse address" });
    }
  });


  // ==========================================
  // VITE STATIC / ROUTER DEV OR PROD MIDDLEWARE
  // ==========================================

  if (includeFrontend) {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  return app;
}

async function startServer() {
  const app = await createApp(true);
  const PORT = Number(process.env.PORT || 3000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`🚀 FB Fanpage Chat & Order Manager running at:`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`👉 Webhook URL: /api/facebook/webhook`);
    console.log(`====================================================`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("Error starting express-vite server:", err);
  });
}
