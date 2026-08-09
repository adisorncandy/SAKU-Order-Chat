# คู่มือเชื่อมเว็บกับแชทเพจ Facebook

โปรเจกต์นี้มีหน้าเว็บจัดการแชท/ออเดอร์ และมี Webhook สำหรับรับข้อความจาก Facebook Page อยู่แล้วที่:

```text
/api/facebook/webhook
```

## Meta App ที่สร้างไว้

- App name: `SAKULANGBAN Chat Manager`
- App ID: `1754540925812064`
- Use case: Messenger from Meta
- Business portfolio: `อร่อยหลังบ้าน.พัทลุง`

เมื่อรันบนเครื่องจะเป็น:

```text
http://localhost:3000/api/facebook/webhook
```

แต่ Meta ต้องใช้ Callback URL แบบ HTTPS ที่เข้าจากอินเทอร์เน็ตได้จริง ดังนั้นก่อนต่อเพจจริงต้อง deploy หรือเปิด tunnel เช่น ngrok/cloudflared แล้วใช้ URL แบบนี้:

```text
https://your-domain.com/api/facebook/webhook
```

## 1. ตั้งค่าเว็บ

1. คัดลอก `.env.example` เป็น `.env.local`
2. ใส่ `GEMINI_API_KEY` ถ้าต้องการให้ AI ช่วยตอบแชทและแยกที่อยู่
3. รันเว็บ แล้วเข้าเมนู `ตั้งค่าระบบ`
4. ใส่ข้อมูล:
   - `Facebook Page ID`
   - `Verify Token` ตั้งเป็นข้อความลับอะไรก็ได้ เช่น `sakulangban_webhook_2026`
   - `Page Access Token` ที่ได้จาก Meta Developers
   - ชื่อร้าน เบอร์โทร และที่อยู่ผู้ส่ง

## 2. ตั้งค่าใน Meta Developers

1. เข้า [Meta Developers](https://developers.facebook.com/)
2. สร้างหรือเลือก App ของร้าน
3. เพิ่ม product `Messenger`
4. ในส่วน Webhooks ให้กด Configure
5. ใส่ Callback URL:

```text
https://your-domain.com/api/facebook/webhook
```

6. ใส่ Verify Token ให้ตรงกับที่บันทึกในเว็บ
7. เลือก event อย่างน้อย:
   - `messages`
   - `messaging_postbacks`
8. ผูก App กับ Facebook Page `SAKULANGBAN`
9. สร้าง Page Access Token แล้วนำมาใส่ในหน้า Settings ของเว็บ

## 3. ทดสอบ

ส่งข้อความหาเพจ Facebook จากบัญชีอื่น ข้อความควรเข้าหน้าแชทในเว็บ ถ้าเปิด AI Auto-Reply และตั้งค่า `GEMINI_API_KEY` แล้ว ระบบจะสร้างคำตอบและส่งกลับ Messenger อัตโนมัติ

## หมายเหตุสำคัญ

- ถ้ายังไม่ได้ผ่าน App Review จะใช้งานจริงได้จำกัดกับผู้ใช้ที่มีบทบาทใน App/Page
- Meta Send API ต้องใช้ Page Access Token ของเพจที่ส่งข้อความ และ permission สำหรับ Messenger
- Graph API version ในโปรเจกต์ตั้งไว้ที่ `v26.0` ผ่าน `FACEBOOK_GRAPH_API_VERSION`
- ห้าม commit หรือส่งต่อ Page Access Token เพราะใช้ส่งข้อความแทนเพจได้
