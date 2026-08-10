import express from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { db } from "./server/db.js";
import { generateAiReply, parseAddressText } from "./server/ai.js";

dotenv.config();

export async function createApp(includeFrontend = true) {
  const app = express();
  const GRAPH_API_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION || "v26.0";
  const getFacebookVerifyToken = () =>
    (process.env.FACEBOOK_VERIFY_TOKEN || db.getSettings().verifyToken).trim();
  const getFacebookPageAccessToken = () =>
    (process.env.FACEBOOK_PAGE_ACCESS_TOKEN || db.getSettings().pageAccessToken || "").trim();
  const getAdminPassword = () => process.env.ADMIN_PASSWORD?.trim();
  const getSessionSecret = () => process.env.ADMIN_SESSION_SECRET || getAdminPassword() || "local-dev-session";
  const signSession = (expiresAt: number) =>
    crypto.createHmac("sha256", getSessionSecret()).update(String(expiresAt)).digest("hex");
  const createSessionCookie = () => {
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
    return `${expiresAt}.${signSession(expiresAt)}`;
  };
  const parseCookies = (cookieHeader = "") =>
    Object.fromEntries(cookieHeader.split(";").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, decodeURIComponent(value.join("=") || "")];
    }).filter(([key]) => key));
  const isValidSession = (cookieValue?: string) => {
    if (!getAdminPassword()) return true;
    if (!cookieValue) return false;
    const [expiresAtRaw, signature] = cookieValue.split(".");
    const expiresAt = Number(expiresAtRaw);
    if (!expiresAt || Date.now() > expiresAt || !signature) return false;
    const expected = signSession(expiresAt);
    return signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  };
  const getPublicSettings = () => ({
    ...db.getSettings(),
    pageAccessToken: "",
  });

  // Middleware for parsing JSON bodies
  app.use(express.json());
  app.use(async (_req, _res, next) => {
    try {
      await db.ready();
      next();
    } catch (error) {
      next(error);
    }
  });

  // ==========================================
  // FACEBOOK WEBHOOK ENDPOINTS
  // ==========================================

  // 1. Webhook Verification (GET /api/facebook/webhook)
  // Used by Facebook to verify your server when you register the Webhook URL
  app.get("/api/facebook/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === getFacebookVerifyToken()) {
      console.log("Facebook Webhook Verified successfully!");
      res.status(200).send(challenge);
    } else {
      console.warn("Facebook Webhook Verification failed. Token mismatch.");
      res.sendStatus(403);
    }
  });

  // Helper to send a message to Facebook Messenger using the Send API
  async function sendFacebookMessage(recipientId: string, text: string) {
    const pageAccessToken = getFacebookPageAccessToken();

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
            await db.flush();

            // 2. Check if AI Auto-Reply is enabled
            const settings = db.getSettings();
            if (settings.aiEnabled && process.env.GEMINI_API_KEY) {
              try {
                // Generate AI response
                const aiReplyText = await generateAiReply(senderId);
              
                // Save AI's message
                db.addMessage(senderId, "ai", aiReplyText);
                await db.flush();

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
  // ADMIN AUTH API
  // ==========================================
  app.get("/api/auth/status", (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    res.json({
      enabled: Boolean(getAdminPassword()),
      authenticated: isValidSession(cookies.saku_admin),
    });
  });

  app.post("/api/auth/login", (req, res) => {
    const adminPassword = getAdminPassword();
    if (!adminPassword) {
      return res.json({ ok: true });
    }

    if (req.body?.password !== adminPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    res.setHeader(
      "Set-Cookie",
      `saku_admin=${encodeURIComponent(createSessionCookie())}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}`
    );
    res.json({ ok: true });
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.setHeader("Set-Cookie", "saku_admin=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
    res.json({ ok: true });
  });

  app.use("/api", (req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    if (isValidSession(cookies.saku_admin)) {
      return next();
    }
    res.status(401).json({ error: "Authentication required" });
  });


  // ==========================================
  // APP SETTINGS API
  // ==========================================
  app.get("/api/settings", (req, res) => {
    res.json(getPublicSettings());
  });

  app.post("/api/settings", async (req, res) => {
    const updated = db.updateSettings(req.body);
    await db.flush();
    res.json({ ...updated, pageAccessToken: "" });
  });


  // ==========================================
  // CHATS API
  // ==========================================
  app.get("/api/chats", (req, res) => {
    res.json(db.getThreads());
  });

  app.get("/api/chats/:id", async (req, res) => {
    const thread = db.getThread(req.params.id);
    if (thread) {
      db.markAsRead(req.params.id);
      await db.flush();
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
      await db.flush();

      // Send the message to the customer's actual Facebook account
      await sendFacebookMessage(req.params.id, text);

      res.status(201).json(message);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/chats/:id", async (req, res) => {
    db.clearChat(req.params.id);
    await db.flush();
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
      await db.flush();
    }

    // 1. Save simulated message from customer
    const msg = db.addMessage(threadId, "customer", text);
    await db.flush();

    // 2. Trigger AI auto-reply if enabled
    let aiReply = null;
    const settings = db.getSettings();
    if (settings.aiEnabled) {
      try {
        const aiText = await generateAiReply(threadId);
        aiReply = db.addMessage(threadId, "ai", aiText);
        await db.flush();
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

  app.post("/api/knowledge-base", async (req, res) => {
    const { question, answer, keywords } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: "Question and Answer are required" });
    }
    const item = db.addKnowledgeItem({ question, answer, keywords: keywords || [] });
    await db.flush();
    res.status(201).json(item);
  });

  app.put("/api/knowledge-base/:id", async (req, res) => {
    const updated = db.updateKnowledgeItem(req.params.id, req.body);
    if (updated) {
      await db.flush();
      res.json(updated);
    } else {
      res.status(404).json({ error: "Knowledge item not found" });
    }
  });

  app.delete("/api/knowledge-base/:id", async (req, res) => {
    const success = db.deleteKnowledgeItem(req.params.id);
    if (success) await db.flush();
    res.json({ success });
  });


  // ==========================================
  // PRODUCTS API
  // ==========================================
  app.get("/api/products", (req, res) => {
    res.json(db.getProducts());
  });

  app.post("/api/products", async (req, res) => {
    const { code, name, price, stock, description } = req.body;
    if (!code || !name || price === undefined) {
      return res.status(400).json({ error: "Code, Name, and Price are required" });
    }
    const product = db.addProduct({ code, name, price: Number(price), stock: Number(stock || 0), description: description || "" });
    await db.flush();
    res.status(201).json(product);
  });

  app.put("/api/products/:id", async (req, res) => {
    const updated = db.updateProduct(req.params.id, req.body);
    if (updated) {
      await db.flush();
      res.json(updated);
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    const success = db.deleteProduct(req.params.id);
    if (success) await db.flush();
    res.json({ success });
  });


  // ==========================================
  // ORDERS API
  // ==========================================
  app.get("/api/orders", (req, res) => {
    res.json(db.getOrders());
  });

  app.post("/api/orders", async (req, res) => {
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
    await db.flush();
    res.status(201).json(order);
  });

  app.put("/api/orders/:id", async (req, res) => {
    const updated = db.updateOrder(req.params.id, req.body);
    if (updated) {
      await db.flush();
      res.json(updated);
    } else {
      res.status(404).json({ error: "Order not found" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    const success = db.deleteOrder(req.params.id);
    if (success) await db.flush();
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
      const { createServer: createViteServer } = await import("vite");
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
