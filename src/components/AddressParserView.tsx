import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  MapPin, 
  User, 
  Phone, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  Printer, 
  CheckCircle, 
  RotateCcw,
  AlertCircle,
  Download,
  FileText
} from "lucide-react";
import { Product, AddressDetails, OrderItem } from "../types";

interface AddressParserViewProps {
  onOrderCreated?: () => void;
}

export default function AddressParserView({ onOrderCreated }: AddressParserViewProps) {
  // Free text paste input
  const [pasteText, setPasteText] = useState(
    "ส่งให้ นายพรเทพ มณีวรรณ โทร 0891234567\n" +
    "99/55 หมู่บ้านรุ่งอรุณ ซอยสุขุมวิท 101 ถนนสุขุมวิท ตำบลบางจาก อำเภอพระโขนง กรุงเทพมหานคร 10260\n" +
    "เอาหมวกแก๊ปเกาหลี CAP-001 2 ใบ กับกระเป๋าเป้ BAG-004 1 ใบครับ"
  );
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState("");

  // Target edited values
  const [address, setAddress] = useState<AddressDetails>({
    name: "",
    phone: "",
    fullAddress: "",
    subdistrict: "",
    district: "",
    province: "",
    zipcode: "",
  });

  // Selected products for this order
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // System settings for sender address
  const [senderName, setSenderName] = useState("Happy Shop (สำนักงานใหญ่)");
  const [senderAddress, setSenderAddress] = useState("99/9 ถ.พหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900");
  const [senderPhone, setSenderPhone] = useState("0812345678");

  // Show printable invoice / cover label
  const [showLabelPreview, setShowLabelPreview] = useState(false);

  // Fetch product catalog & settings
  const fetchProductsAndSettings = async () => {
    try {
      const resProducts = await fetch("/api/products");
      if (resProducts.ok) {
        const prodData = await resProducts.json() as Product[];
        setAllProducts(prodData);
      }

      const resSettings = await fetch("/api/settings");
      if (resSettings.ok) {
        const setts = await resSettings.json();
        setSenderName(setts.companyName || "Happy Shop");
        setSenderAddress(setts.senderAddress || "");
        setSenderPhone(setts.senderPhone || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProductsAndSettings();
  }, []);

  // AI Parser action
  const handleParseText = async () => {
    if (!pasteText.trim()) return;
    setIsParsing(true);
    setError("");
    try {
      const res = await fetch("/api/ai/parse-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddress(data.address);
        setOrderItems(data.items || []);
        setShowLabelPreview(true);
      } else {
        setError(data.error || "ไม่สามารถสกัดข้อมูลได้สำเร็จ กรุณาตรวจสอบรูปแบบข้อความ");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ AI");
    } finally {
      setIsParsing(false);
    }
  };

  // Form Field Changers
  const handleAddressChange = (key: keyof AddressDetails, val: string) => {
    setAddress({ ...address, [key]: val });
  };

  // Order Items Manipulations
  const handleAddItem = (productId: string) => {
    const prod = allProducts.find(p => p.id === productId);
    if (!prod) return;

    // Check if already in items
    const existing = orderItems.find(item => item.productId === prod.id);
    if (existing) {
      setOrderItems(orderItems.map(item => 
        item.productId === prod.id ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      const newItem: OrderItem = {
        productId: prod.id,
        code: prod.code,
        name: prod.name,
        price: prod.price,
        qty: 1,
      };
      setOrderItems([...orderItems, newItem]);
    }
  };

  const handleUpdateQty = (prodId: string, delta: number) => {
    setOrderItems(orderItems.map(item => {
      if (item.productId === prodId) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const handleRemoveItem = (prodId: string) => {
    setOrderItems(orderItems.filter(item => item.productId !== prodId));
  };

  // Calculate Order Total Price
  const orderTotal = orderItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // Clear Form State
  const handleReset = () => {
    setAddress({
      name: "",
      phone: "",
      fullAddress: "",
      subdistrict: "",
      district: "",
      province: "",
      zipcode: "",
    });
    setOrderItems([]);
    setShowLabelPreview(false);
    setError("");
  };

  // Save parsed items & address as a real Order
  const handleSaveOrder = async () => {
    if (!address.name || !address.fullAddress) {
      alert("กรุณากรอกข้อมูล ชื่อ-ที่อยู่ ผู้รับให้ครบถ้วน");
      return;
    }

    if (orderItems.length === 0) {
      alert("กรุณาเพิ่มสินค้าลงในใบสั่งซื้ออย่างน้อย 1 ชิ้น");
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: "manual",
          customerName: address.name,
          items: orderItems,
          status: "pending",
          address: address,
        }),
      });

      if (res.ok) {
        alert("บันทึกออเดอร์ใบสั่งซื้อสำเร็จเรียบร้อย!");
        handleReset();
        if (onOrderCreated) {
          onOrderCreated();
        }
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึกออเดอร์");
      }
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถสร้างออเดอร์ได้");
    }
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPDF = async () => {
    const element = document.getElementById("shipping-sticker-sticker");
    if (!element) return;
    
    setIsGeneratingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      // Extract and sanitize active stylesheets to remove "oklch" colors which cause html2canvas to crash
      const cssRulesText = (() => {
        let cssText = "";
        try {
          for (let i = 0; i < document.styleSheets.length; i++) {
            const sheet = document.styleSheets[i];
            try {
              const rules = sheet.cssRules || sheet.rules;
              if (rules) {
                for (let j = 0; j < rules.length; j++) {
                  cssText += rules[j].cssText + "\n";
                }
              }
            } catch (e) {
              // Ignore cross-origin stylesheet errors
            }
          }
        } catch (e) {
          console.warn("Could not read stylesheets:", e);
        }
        
        if (!cssText) {
          const styleTags = document.getElementsByTagName("style");
          for (let i = 0; i < styleTags.length; i++) {
            cssText += styleTags[i].innerHTML + "\n";
          }
        }
        
        // Replace oklch with compatible fallback colors based on Lightness
        return cssText.replace(/oklch\(\s*([0-9.]+%?)\s+[^)]+\)/g, (match, p1) => {
          const lVal = p1.endsWith("%") ? parseFloat(p1) / 100 : parseFloat(p1);
          if (lVal > 0.75) {
            return "rgb(248, 250, 252)";
          } else if (lVal > 0.6) {
            return "rgb(226, 232, 240)";
          } else {
            return "rgb(30, 41, 59)";
          }
        });
      })();
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: false,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        imageTimeout: 2000,
        onclone: (clonedDoc) => {
          // Remove all style and link stylesheet elements in cloned document
          const styles = clonedDoc.querySelectorAll("style, link[rel='stylesheet']");
          styles.forEach(el => el.remove());
          
          // Inject our sanitized style block
          const styleEl = clonedDoc.createElement("style");
          styleEl.innerHTML = cssRulesText;
          clonedDoc.head.appendChild(styleEl);

          // Clean up oklch inline styles in elements
          const allElements = clonedDoc.getElementsByTagName("*");
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            if (el.style && el.style.cssText) {
              const cssText = el.style.cssText;
              if (cssText.includes("oklch")) {
                el.style.cssText = cssText.replace(/oklch\(\s*([0-9.]+%?)\s+[^)]+\)/g, (match, p1) => {
                  const lVal = p1.endsWith("%") ? parseFloat(p1) / 100 : parseFloat(p1);
                  if (lVal > 0.75) {
                    return "rgb(248, 250, 252)";
                  } else if (lVal > 0.6) {
                    return "rgb(226, 232, 240)";
                  } else {
                    return "rgb(30, 41, 59)";
                  }
                });
              }
            }
          }
        }
      });
      
      const imgData = canvas.toDataURL("image/png");
      
      // A6 paper dimensions: 105 x 148 mm
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a6"
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 5;
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
      pdf.save(`shipping-label-${address.name || "order"}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      // Give fallback warning since iframe downloads are often blocked by browsers
      alert("ไม่สามารถดาวน์โหลดไฟล์โดยตรงได้เนื่องจากข้อจำกัดความปลอดภัยของเบราว์เซอร์ในหน้าพรีวิว\n\nแนะนำให้ลูกค้ากดปุ่ม 'สั่งพิมพ์ใบปะหน้า' แล้วเลือกเครื่องพิมพ์เป็น 'Save as PDF' (บันทึกเป็น PDF) เพื่อบันทึกไฟล์แทนนะคะ");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full space-y-6" id="address-parser-container">
      
      {/* Top Banner Guide */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" id="parser-header-card">
        <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
          <Sparkles className="w-6 h-6 mr-2 text-blue-600 animate-pulse" />
          ระบบแยกที่อยู่อัจฉริยะ (AI Address & Order Extractor)
        </h2>
        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
          นำข้อความแชทที่ลูกค้าพิมพ์ส่งมา (ชื่อ เบอร์โทร ที่อยู่ และรหัสสินค้าที่สั่งซื้อ) คัดลอกและวางลงในกล่องข้อความด้านล่าง 
          ระบบ AI จะแปลงเป็นฟอร์มแยกที่อยู่ พร้อมเลือกสินค้าในร้าน สร้างใบปะหน้าพัสดุ และเตรียมออกออเดอร์อย่างรวดเร็ว
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="parser-workspace">
        
        {/* Left Side: Paste Zone */}
        <div className="lg:col-span-5 space-y-4" id="parser-left-column">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full mr-2 font-bold">1</span>
              วางข้อความจากลูกค้า
            </h3>

            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="วางที่อยู่และสินค้าที่ลูกค้าส่งมาที่นี่..."
              rows={10}
              className="w-full text-sm border border-slate-300 rounded-xl p-4 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition resize-y font-sans leading-relaxed text-slate-700"
              id="unstructured-address-pastebox"
            />

            {error && (
              <div className="mt-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center" id="parser-error-box">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}

            <div className="mt-4 flex space-x-2" id="parser-left-actions">
              <button
                onClick={handleReset}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                เคลียร์ฟอร์ม
              </button>
              <button
                onClick={handleParseText}
                disabled={isParsing || !pasteText.trim()}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center shadow-lg shadow-blue-500/10"
                id="btn-trigger-ai-parse"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                {isParsing ? "กำลังจำแนกข้อมูล..." : "จำแนกที่อยู่และสกัดสินค้าด้วย AI"}
              </button>
            </div>
          </div>

          {/* Quick catalog helper */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold text-slate-700 mb-2.5">คลังสินค้าในระบบ (คลิกดึงข้อมูลรหัสส่งป้อนบ็อกซ์)</h4>
            <div className="max-h-48 overflow-y-auto space-y-1 text-xs" id="parser-products-helper">
              {allProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPasteText(prev => prev + `\nรหัส: ${p.code} (1 ชิ้น)`)}
                  className="w-full text-left p-2 rounded hover:bg-slate-50 border border-slate-100 flex justify-between items-center transition"
                >
                  <div>
                    <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded mr-1.5 font-bold">{p.code}</span>
                    <span className="text-slate-600">{p.name}</span>
                  </div>
                  <span className="font-bold text-blue-600">฿{p.price}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Edited Form & Cover Label preview */}
        <div className="lg:col-span-7 space-y-6" id="parser-right-column">
          
          {/* Main Parsed Fields Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-700 pb-2 border-b border-slate-100 flex items-center">
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full mr-2 font-bold">2</span>
              ตรวจสอบและแก้ไขข้อมูลผู้รับ
            </h3>

            {/* Address fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="recipient-fields-grid">
              <div id="field-name-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อผู้รับ:</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={address.name}
                    onChange={(e) => handleAddressChange("name", e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ชื่อผู้รับเงิน/สินค้า"
                    id="parsed-input-name"
                  />
                </div>
              </div>

              <div id="field-phone-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">เบอร์โทรศัพท์:</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={address.phone}
                    onChange={(e) => handleAddressChange("phone", e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="เบอร์โทร 10 หลัก"
                    id="parsed-input-phone"
                  />
                </div>
              </div>

              <div className="md:col-span-2" id="field-full-address-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">ที่อยู่จัดส่ง:</label>
                <textarea
                  value={address.fullAddress}
                  onChange={(e) => handleAddressChange("fullAddress", e.target.value)}
                  rows={2}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="บ้านเลขที่ หมู่ ซอย ถนน คอนโด ตึก"
                  id="parsed-input-fulladdress"
                />
              </div>

              <div id="field-subdistrict-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">แขวง / ตำบล:</label>
                <input
                  type="text"
                  value={address.subdistrict}
                  onChange={(e) => handleAddressChange("subdistrict", e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ตำบล"
                  id="parsed-input-subdistrict"
                />
              </div>

              <div id="field-district-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">เขต / อำเภอ:</label>
                <input
                  type="text"
                  value={address.district}
                  onChange={(e) => handleAddressChange("district", e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="อำเภอ"
                  id="parsed-input-district"
                />
              </div>

              <div id="field-province-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">จังหวัด:</label>
                <input
                  type="text"
                  value={address.province}
                  onChange={(e) => handleAddressChange("province", e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="จังหวัด"
                  id="parsed-input-province"
                />
              </div>

              <div id="field-zipcode-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">รหัสไปรษณีย์:</label>
                <input
                  type="text"
                  value={address.zipcode}
                  onChange={(e) => handleAddressChange("zipcode", e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="รหัสไปรษณีย์"
                  id="parsed-input-zipcode"
                />
              </div>
            </div>

            {/* Ordered Items Selector Section */}
            <div className="mt-5 border-t border-slate-100 pt-4" id="order-items-builder">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center">
                  <ShoppingBag className="w-4 h-4 mr-1 text-blue-600" />
                  สินค้าในออเดอร์นี้
                </h4>
                
                {/* Simple quick item adding dropdown */}
                <select 
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddItem(e.target.value);
                      e.target.value = ""; // Reset
                    }
                  }}
                  className="text-xs px-2 py-1 bg-slate-100 border-0 rounded font-medium text-slate-700 cursor-pointer"
                  id="quick-add-item-dropdown"
                >
                  <option value="">+ เพิ่มสินค้าแมนนวล...</option>
                  {allProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name} (฿{p.price})</option>
                  ))}
                </select>
              </div>

              {orderItems.length === 0 ? (
                <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                  ไม่มีสินค้าในออเดอร์นี้ แปะรหัสสินค้า หรือใช้ปุ่ม + เพิ่มสินค้าแมนนวล
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto" id="order-items-builder-list">
                  {orderItems.map((item) => (
                    <div key={item.productId || item.code} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="font-mono bg-blue-50 text-blue-700 px-1 py-0.5 rounded font-bold mr-1.5">{item.code}</span>
                        <span className="text-slate-700">{item.name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <div className="text-slate-500 font-medium">฿{item.price}</div>
                        <div className="flex items-center border border-slate-300 rounded bg-white">
                          <button 
                            onClick={() => handleUpdateQty(item.productId, -1)} 
                            className="px-1.5 py-0.5 font-bold hover:bg-slate-100 text-slate-600"
                          >
                            -
                          </button>
                          <span className="px-2 font-semibold font-mono text-slate-800">{item.qty}</span>
                          <button 
                            onClick={() => handleUpdateQty(item.productId, 1)} 
                            className="px-1.5 py-0.5 font-bold hover:bg-slate-100 text-slate-600"
                          >
                            +
                          </button>
                        </div>
                        <div className="font-bold text-slate-800 w-16 text-right">฿{item.price * item.qty}</div>
                        <button 
                          onClick={() => handleRemoveItem(item.productId)} 
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded-xl text-xs font-bold text-blue-950 mt-1">
                    <span>ยอดรวมค่าสินค้า</span>
                    <span>฿{orderTotal}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3" id="parser-right-actions">
              <button
                onClick={handleSaveOrder}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center shadow-lg shadow-blue-500/10 transition"
                id="btn-save-formal-order"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                เปิดบิลและบันทึกออเดอร์
              </button>
            </div>
          </div>

          {/* 3. Coverage Packaging Label Preview Box */}
          {showLabelPreview && address.name && (
            <div className="bg-white p-6 rounded-2xl border border-dashed border-blue-300 shadow-sm space-y-4" id="printable-area-label">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
                <h4 className="text-sm font-bold text-blue-950 flex items-center">
                  <Printer className="w-4 h-4 mr-1.5" />
                  พรีวิวใบปะหน้าสำหรับพิมพ์ (Shipping Label)
                </h4>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleDownloadPDF}
                      disabled={isGeneratingPdf}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition flex items-center shadow-sm cursor-pointer"
                      id="btn-trigger-download-pdf"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      {isGeneratingPdf ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}
                    </button>
                    <button
                      onClick={handlePrint}
                      className="bg-slate-850 text-white font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-slate-950 transition flex items-center shadow-sm cursor-pointer border border-slate-700"
                      id="btn-trigger-print-shipping"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                      สั่งพิมพ์ใบปะหน้า
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 text-right max-w-xs mt-1 leading-normal no-print">
                    💡 หากดาวน์โหลดไม่ได้ในหน้าพรีวิวนี้ แนะนำให้กด <span className="font-semibold text-blue-600">"สั่งพิมพ์ใบปะหน้า"</span> แล้วเลือก <span className="font-semibold text-slate-700">"บันทึกเป็น PDF"</span> แทนได้ทันที หรือกดปุ่มเปิดแอปในแท็บใหม่ค่ะ
                  </p>
                </div>
              </div>

              {/* Printable Packaging Sticker Box */}
              <div className="p-6 border-2 border-slate-800 rounded-lg bg-white text-black font-sans shadow-inner max-w-lg mx-auto printable-area" id="shipping-sticker-sticker">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed border-slate-300">
                  {/* Sender */}
                  <div className="text-[11px] leading-relaxed border-r border-slate-200 pr-2">
                    <p className="font-bold text-slate-800 mb-0.5">ผู้ส่ง (Sender)</p>
                    <p className="font-bold">{senderName}</p>
                    <p className="text-slate-600">{senderAddress}</p>
                    <p className="font-bold mt-1 text-slate-800">เบอร์โทร: {senderPhone}</p>
                  </div>
                  {/* Shipping method info */}
                  <div className="text-right flex flex-col justify-between items-end">
                    <div className="bg-slate-900 text-white font-extrabold text-xs px-3 py-1 rounded text-center">
                      EMS / FLASH
                    </div>
                    <div className="text-[10px] text-slate-400 mt-2">
                      <p>วันที่สั่งพิมพ์: {new Date().toLocaleDateString('th-TH')}</p>
                      <p className="font-mono">ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                {/* Receiver Info */}
                <div className="py-6 border-b border-dashed border-slate-300">
                  <p className="text-[11px] font-bold text-slate-800 mb-1">ผู้รับ (Receiver)</p>
                  <p className="text-base font-bold text-black">{address.name}</p>
                  <p className="text-sm text-slate-800 mt-1">{address.fullAddress}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">
                    ต.{address.subdistrict} อ.{address.district} จ.{address.province}
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-lg font-black tracking-widest bg-slate-100 px-3 py-1 rounded border border-slate-300">
                      {address.zipcode}
                    </p>
                    <p className="text-sm font-black">
                      เบอร์โทร: {address.phone}
                    </p>
                  </div>
                </div>

                {/* Packaging Items slip details */}
                <div className="pt-3 text-[10px] leading-tight text-slate-700">
                  <p className="font-bold text-slate-800 mb-1.5">รายการสิ่งของที่สั่งซื้อ (Order Items):</p>
                  <div className="space-y-1">
                    {orderItems.map((it, idx) => (
                      <div key={idx} className="flex justify-between font-mono">
                        <span>• [{it.code}] {it.name}</span>
                        <span className="font-bold">x {it.qty}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100 font-bold text-slate-900">
                    <span>ยอดที่ต้องเรียกเก็บปลายทาง (COD) / โอนแล้ว</span>
                    <span className="text-xs">฿{orderTotal} บาท (โอนเรียบร้อย)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
