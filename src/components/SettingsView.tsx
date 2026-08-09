import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Facebook, 
  Lock, 
  Cpu, 
  Building, 
  Check, 
  AlertCircle, 
  HelpCircle,
  Clipboard,
  ExternalLink,
  Save,
  CheckCircle2
} from "lucide-react";
import { Settings as SettingsType } from "../types";

export default function SettingsView() {
  const [settings, setSettings] = useState<SettingsType>({
    pageId: "",
    pageAccessToken: "",
    verifyToken: "",
    aiEnabled: true,
    companyName: "",
    senderAddress: "",
    senderPhone: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Auto-calculated Callback Webhook URL based on browser origin
  const webhookUrl = `${window.location.origin}/api/facebook/webhook`;

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json() as SettingsType;
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: keyof SettingsType, val: any) => {
    setSettings({ ...settings, [key]: val });
    setSaveSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaveSuccess(true);
        // Fade success badge after 3s
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError("ไม่สามารถบันทึกการตั้งค่าได้ กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 font-medium text-xs">
        กำลังโหลดการตั้งค่าระบบ...
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-full space-y-6" id="settings-tab-container">
      
      {/* Top Title Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm" id="settings-header-card">
        <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-blue-600 animate-spin" style={{ animationDuration: '8s' }} />
          ตั้งค่าระบบ & เชื่อมโยง Facebook Webhook
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          กำหนดคีย์สำหรับเชื่อมต่อเพจ Facebook Fanpage, สลับโหมดทำงาน AI อัตโนมัติ และตั้งค่าที่อยู่ผู้จัดส่งพัสดุ
        </p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="settings-form">
        
        {/* Left Side: Parameters input fields */}
        <div className="lg:col-span-7 space-y-6" id="settings-left-column">
          
          {/* A. Facebook API Connection Fields */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4" id="section-fb-credentials">
            <h3 className="text-sm font-bold text-slate-800 flex items-center pb-2 border-b border-slate-100">
              <Facebook className="w-4.5 h-4.5 mr-2 text-blue-600" />
              1. คีย์เชื่อมโยง Facebook Messenger API
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="fb-credentials-grid">
              <div id="set-pageid-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Facebook Page ID:</label>
                <input
                  type="text"
                  value={settings.pageId}
                  onChange={(e) => handleChange("pageId", e.target.value)}
                  placeholder="เช่น 109552145893"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                  id="settings-input-pageid"
                />
              </div>

              <div id="set-verifytoken-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Verify Token (สำหรับ Webhook):</label>
                <input
                  type="text"
                  value={settings.verifyToken}
                  onChange={(e) => handleChange("verifyToken", e.target.value)}
                  placeholder="พิมพ์คีย์อะไรก็ได้ เช่น my_fb_verify_token_123"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                  id="settings-input-verifytoken"
                />
              </div>

              <div className="md:col-span-2" id="set-accesstoken-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                  <span>Page Access Token (โทเค็นเพจถาวร):</span>
                  <span className="text-[10px] text-slate-400 font-normal flex items-center">
                    <Lock className="w-3 h-3 mr-0.5" /> ความปลอดภัยสูง คีย์จะถูกเข้ารหัสเซิร์ฟเวอร์
                  </span>
                </label>
                <textarea
                  value={settings.pageAccessToken}
                  onChange={(e) => handleChange("pageAccessToken", e.target.value)}
                  rows={3}
                  placeholder="วางคีย์ยาวเหยียดที่ได้จาก Meta Developers Console (เริ่มต้นด้วย EAAb...)"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono break-all"
                  id="settings-input-accesstoken"
                />
              </div>
            </div>
          </div>

          {/* B. AI Settings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4" id="section-ai-options">
            <h3 className="text-sm font-bold text-slate-800 flex items-center pb-2 border-b border-slate-100">
              <Cpu className="w-4.5 h-4.5 mr-2 text-emerald-600 animate-pulse" />
              2. โหมดการทำงานแอดมิน AI ช่วยตอบ (Gemini Model)
            </h3>

            <div className="flex items-center justify-between bg-emerald-50/50 p-4 rounded-xl border border-emerald-100" id="ai-toggle-box">
              <div className="pr-4" id="ai-toggle-text">
                <h4 className="text-xs font-bold text-emerald-950">เปิดใช้งาน AI Auto-Reply (ระบบตอบแชทอัตโนมัติ)</h4>
                <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                  เมื่อตรวจพบข้อความใหม่ที่ลูกค้าส่งเข้าทาง Webhook ระบบจะประมวลผลผ่านโมเดล Gemini อ้างอิงจากฐานข้อมูลสินค้าและ FAQ เพื่อตอบลูกค้าทันทีโดยไม่ต้องใช้แอดมินจริง
                </p>
              </div>

              <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in" id="ai-switch">
                <input
                  type="checkbox"
                  name="aiEnabled"
                  id="aiEnabled"
                  checked={settings.aiEnabled}
                  onChange={(e) => handleChange("aiEnabled", e.target.checked)}
                  className="sr-only"
                />
                <label 
                  htmlFor="aiEnabled" 
                  className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ${
                    settings.aiEnabled ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span 
                    className={`block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-1 ${
                      settings.aiEnabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* C. Merchant Information Settings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4" id="section-merchant-info">
            <h3 className="text-sm font-bold text-slate-800 flex items-center pb-2 border-b border-slate-100">
              <Building className="w-4.5 h-4.5 mr-2 text-slate-600" />
              3. ข้อมูลผู้จัดส่งสินค้า (สำหรับจัดพิมพ์ใบปะหน้า)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="merchant-fields-grid">
              <div id="set-companyname-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อร้านค้าหลัก:</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                  placeholder="เช่น Happy Shop"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-semibold"
                  id="settings-input-companyname"
                />
              </div>

              <div id="set-senderphone-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">เบอร์โทรศัพท์ร้านค้า:</label>
                <input
                  type="text"
                  value={settings.senderPhone}
                  onChange={(e) => handleChange("senderPhone", e.target.value)}
                  placeholder="เช่น 0812345678"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                  id="settings-input-senderphone"
                />
              </div>

              <div className="md:col-span-2" id="set-senderaddress-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">ที่อยู่จัดส่งของผู้ส่ง (เต็มรูปแบบ):</label>
                <textarea
                  value={settings.senderAddress}
                  onChange={(e) => handleChange("senderAddress", e.target.value)}
                  rows={2.5}
                  placeholder="99/9 ถ.พหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-sans leading-relaxed"
                  id="settings-input-senderaddress"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center space-x-3 justify-end pt-2" id="settings-save-row">
            {error && (
              <p className="text-xs text-rose-600 font-medium flex items-center mr-auto">
                <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" /> {error}
              </p>
            )}
            
            {saveSuccess && (
              <span className="text-emerald-600 text-xs font-semibold flex items-center animate-bounce mr-3" id="save-success-indicator">
                <CheckCircle2 className="w-4 h-4 mr-1 flex-shrink-0" /> บันทึกการตั้งค่าเรียบร้อยแล้ว!
              </span>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/10 flex items-center transition"
              id="settings-submit-btn"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {isSaving ? "กำลังจัดเก็บ..." : "บันทึกการตั้งค่าทั้งหมด"}
            </button>
          </div>

        </div>

        {/* Right Side: Webhook Integration Steps Guideline */}
        <div className="lg:col-span-5 space-y-6" id="settings-right-column">
          
          {/* Webhook Endpoint URLs Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3" id="webhook-url-panel">
            <h4 className="text-xs font-bold text-slate-800 flex items-center">
              <ExternalLink className="w-4 h-4 mr-1.5 text-blue-500" />
              Webhook Callback URL ปลายทาง
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              นำ URL และ Token นี้นำไปวางใน Meta Developer Console เพื่อผูกระบบตรวจจับข้อความแชท
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[10.5px] space-y-2 relative" id="webhook-endpoints-box">
              <div id="endpoint-callback">
                <span className="block text-[9px] text-slate-400 font-semibold font-sans uppercase">Callback URL (GET / POST):</span>
                <div className="flex items-center justify-between mt-1 bg-white p-1.5 rounded border border-slate-300">
                  <span className="text-blue-900 truncate pr-2 select-all">{webhookUrl}</span>
                  <button
                    type="button"
                    onClick={handleCopyWebhook}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 transition"
                    title="คัดลอกลิงก์"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> : <Clipboard className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div id="endpoint-verify-token">
                <span className="block text-[9px] text-slate-400 font-semibold font-sans uppercase">Verify Token:</span>
                <span className="block font-bold text-slate-800 bg-white p-1.5 rounded border border-slate-300 mt-1 select-all">
                  {settings.verifyToken || "ยังไม่ได้ตั้งค่า"}
                </span>
              </div>
            </div>
          </div>

          {/* Setup Instructions Tutorial Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm" id="webhook-instructions-card">
            <h4 className="text-xs font-bold text-slate-800 flex items-center mb-3">
              <HelpCircle className="w-4.5 h-4.5 mr-1.5 text-blue-500" />
              คู่มือขั้นตอนการตั้งค่า Webhook (5 นาทีเสร็จ)
            </h4>
            
            <ol className="text-[11px] text-slate-600 space-y-3.5 list-decimal pl-4.5 leading-relaxed">
              <li>
                เข้าไปยังเว็บไซต์ <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline inline-flex items-center">developers.facebook.com <ExternalLink className="w-3 h-3 ml-0.5" /></a> จากนั้นลงชื่อเข้าใช้ แล้วกด <strong>"สร้างแอพ (Create App)"</strong>
              </li>
              <li>
                เพิ่มผลิตภัณฑ์ <strong>"Messenger"</strong> เข้าไปในแอพของคุณ
              </li>
              <li>
                ในหัวข้อ <strong>"การตั้งค่า Webhook (Webhook Setup)"</strong> กดปุ่ม <strong>"กำหนดค่า Webhooks (Configure Webhooks)"</strong>
              </li>
              <li>
                ป้อนข้อมูลช่อง <strong>Callback URL</strong> และ <strong>Verify Token</strong> ตามที่ระบุในกล่องด้านบน จากนั้นคลิกปุ่ม <strong>"ยืนยันและบันทึก"</strong> ของ Facebook
              </li>
              <li>
                ที่แถบหัวข้อ Messenger ให้กดเชื่อมต่อเพจ Facebook Fanpage ที่ต้องการ เพื่อสร้างคีย์ <strong>"โทเค็นการเข้าถึงเพจ (Page Access Token)"</strong> แล้วนำมาบันทึกในช่องที่ 1 ฝั่งซ้าย
              </li>
              <li>
                สุดท้าย ในหัวข้อ Webhook Subscription ให้กดปุ่ม <strong>"แก้ไขข้อมูล (Edit)"</strong> แล้วติ๊กเปิดใช้งานเหตุการณ์ <code>messages</code> และ <code>messaging_postbacks</code> เพื่อให้เซิร์ฟเวอร์ดักข้อความ
              </li>
            </ol>
          </div>

        </div>

      </form>

    </div>
  );
}
