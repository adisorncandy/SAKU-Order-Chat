import { GoogleGenAI, Type } from "@google/genai";
import { db } from "./db.js";
import { Product, AddressDetails } from "../src/types.js";

// Initialize the Gemini API client safely.
// We set the recommended 'User-Agent' header for telemetry.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Generates an automated or suggested reply for a customer thread using the Knowledge Base & Catalog.
 */
export async function generateAiReply(threadId: string, customContext: string = ""): Promise<string> {
  const settings = db.getSettings();
  const thread = db.getThread(threadId);
  const kb = db.getKnowledgeBase();
  const products = db.getProducts();

  if (!thread) {
    throw new Error(`Thread not found with ID: ${threadId}`);
  }

  // Format the knowledge base for context
  const kbContext = kb.map((item, idx) => `คำถามที่ ${idx + 1}: ${item.question}\nคำตอบ: ${item.answer}`).join('\n\n');

  // Format products catalog for context
  const productContext = products.map((p, idx) => `สินค้าที่ ${idx + 1}: รหัส [${p.code}] - ${p.name}, ราคา ${p.price} บาท (คงเหลือ: ${p.stock} ชิ้น), รายละเอียด: ${p.description}`).join('\n');

  // Format thread message history
  const recentMessages = thread.messages.slice(-10); // Get last 10 messages for context
  const messageHistory = recentMessages.map(msg => `${msg.sender === 'customer' ? 'ลูกค้า' : 'แอดมิน/AI'}: ${msg.text}`).join('\n');

  const systemInstruction = `คุณเป็นแอดมินตอบแชทเพจ Facebook ชื่อร้าน "${settings.companyName}" มีหน้าที่คอยให้บริการลูกค้าอย่างสุภาพ อ่อนน้อม และเป็นกันเอง ใช้หางเสียง "ครับ" หรือ "ค่ะ" อย่างสม่ำเสมอและเหมาะสมกับบริบท 

กติกาในการตอบแชท:
1. ตอบคำถามลูกค้าโดยอ้างอิงข้อมูลจาก "ฐานข้อมูลความรู้ (Knowledge Base)" และ "รายการสินค้าในร้าน (Product Catalog)" ที่ให้ไว้เท่านั้น!
2. หากไม่มีคำตอบในฐานข้อมูล หรือข้อมูลไม่เพียงพอ ให้ตอบอย่างสุภาพว่าขอประสานงานกับผู้ดูแลร้านให้ตรวจสอบให้ และอย่าเมคข้อมูลขึ้นมาเองเด็ดขาด
3. หากลูกค้าต้องการโอนเงิน ให้แจ้งข้อมูลเลขบัญชีธนาคารตามที่บันทึกไว้ในฐานข้อมูลความรู้อย่างถูกต้องชัดเจน
4. ห้ามตอบนอกเรื่องหรือไม่เกี่ยวข้องกับร้านค้าเด็ดขาด

ข้อมูลร้านค้าและเลขบัญชี:
${settings.senderAddress} | เบอร์โทร: ${settings.senderPhone}

ฐานข้อมูลความรู้ (Knowledge Base):
${kbContext}

รายการสินค้าในร้าน (Product Catalog):
${productContext}

บริบทเพิ่มเติม:
${customContext}`;

  const prompt = `ประวัติการแชทล่าสุด:
${messageHistory}

จงวิเคราะห์ความต้องการของลูกค้าจากแชทล่าสุด และเขียนข้อความตอบกลับที่เหมาะสม เป็นมิตร สุภาพ มีหางเสียงตามข้อกำหนด และสั้นกระชับตรงประเด็น`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3, // Low temperature for highly grounded and factual answers
      },
    });

    return response.text?.trim() || "ขออภัยค่ะ ขณะนี้ระบบไม่สามารถประมวลผลข้อความได้ แอดมินจะรีบติดต่อกลับนะคะ";
  } catch (error) {
    console.error("Gemini Error during generateAiReply:", error);
    throw error;
  }
}

/**
 * Parses unstructured Thai text (copy-pasted address + items) into structured address fields and products list.
 */
export async function parseAddressText(text: string, catalog: Product[]): Promise<{
  address: AddressDetails;
  items: { code: string; qty: number }[];
}> {
  const productCatalogText = catalog.map(p => `- รหัส: ${p.code}, ชื่อสินค้า: ${p.name}, ราคา: ${p.price}`).join('\n');

  const prompt = `คุณคือระบบ AI อัจฉริยะสำหรับคัดแยกข้อมูลที่อยู่จัดส่งและรายการสินค้าสำหรับร้านค้าออนไลน์ (E-Commerce)
หน้าของคุณคือวิเคราะห์ข้อความที่ผู้ใช้คัดลอกและวาง (ซึ่งเป็นข้อความปนเปกันระหว่าง ชื่อ, เบอร์โทรศัพท์, ที่อยู่ และสินค้าที่ลูกค้าสั่ง) แล้วแปลงเป็นข้อมูล JSON ที่มีโครงสร้างถูกต้องแม่นยำ

ข้อความที่คุณต้องวิเคราะห์:
"""
${text}
"""

รายการรหัสสินค้าในร้านที่เรามี (Product Catalog):
${productCatalogText}

คำแนะนำพิเศษในการทำงาน:
1. "name": ค้นหาชื่อจริงและนามสกุลของผู้รับ (เช่น นายประสิทธิ์ พลเมืองดี หรือ ประสิทธิ์)
2. "phone": ค้นหาเบอร์โทรศัพท์ (เช่น 0812223333, 081-222-3333, 09x-xxxx-xxx) ให้ดึงออกมาเฉพาะตัวเลข 10 หลัก ไม่ต้องใส่ขีดคั่น
3. "fullAddress": ที่อยู่จัดส่งทั้งหมด ตัดส่วนที่เป็น ชื่อ เบอร์โทร และสินค้าออกไป เหลือเฉพาะบ้านเลขที่ หมู่ ซอย ถนน ตำบล อำเภอ จังหวัด
4. "subdistrict", "district", "province", "zipcode": ดึงข้อมูลตำบล/แขวง, อำเภอ/เขต, จังหวัด, และรหัสไปรษณีย์ ออกมาแยกช่อง หากไม่มีให้วิเคราะห์จากชื่อที่อยู่ที่เหลืออยู่
5. "items": ค้นหาชื่อสินค้าหรือรหัสสินค้าที่ลูกค้าต้องการสั่ง และจับคู่กับ "Product Catalog" ด้านบนให้ใกล้เคียงที่สุด เพื่อดึง "code" และระบุจำนวน "qty" ที่สั่ง (เช่น "หมวก 2 ใบ" จะตรงกับรหัส CAP-001 จำนวน 2 ชิ้น) หากไม่มีในระบบให้พยายามสร้างรหัสใกล้เคียง หรือปล่อยว่างไว้ถ้าไม่ใช่สินค้าในร้าน`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["address", "items"],
          properties: {
            address: {
              type: Type.OBJECT,
              required: ["name", "phone", "fullAddress", "subdistrict", "district", "province", "zipcode"],
              properties: {
                name: { type: Type.STRING, description: "ชื่อผู้รับสินค้า" },
                phone: { type: Type.STRING, description: "เบอร์โทรศัพท์ติดต่อ 10 หลัก" },
                fullAddress: { type: Type.STRING, description: "ที่อยู่จัดส่งแบบเต็ม (ไม่รวมชื่อและเบอร์โทร)" },
                subdistrict: { type: Type.STRING, description: "ตำบล หรือ แขวง" },
                district: { type: Type.STRING, description: "อำเภอ หรือ เขต" },
                province: { type: Type.STRING, description: "จังหวัด" },
                zipcode: { type: Type.STRING, description: "รหัสไปรษณีย์ 5 หลัก" },
              },
            },
            items: {
              type: Type.ARRAY,
              description: "รายการสินค้าที่วิเคราะห์ได้",
              items: {
                type: Type.OBJECT,
                required: ["code", "qty"],
                properties: {
                  code: { type: Type.STRING, description: "รหัสสินค้าที่ตรงกับ Catalog เช่น CAP-001" },
                  qty: { type: Type.INTEGER, description: "จำนวนชิ้นที่สั่งซื้อ" },
                },
              },
            },
          },
        },
      },
    });

    const resultText = response.text?.trim();
    if (!resultText) {
      throw new Error("No response from Gemini parse address");
    }

    return JSON.parse(resultText);
  } catch (error) {
    console.error("Gemini Error during parseAddressText:", error);
    throw error;
  }
}
