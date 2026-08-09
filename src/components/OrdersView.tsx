import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  Search, 
  Clock, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Printer, 
  User, 
  Phone, 
  MapPin, 
  ChevronRight,
  RefreshCw,
  Eye,
  Download,
  FileText,
  AlertCircle
} from "lucide-react";
import { Order, OrderItem } from "../types";

export default function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // printable label view overlay state
  const [showPrintLabel, setShowPrintLabel] = useState(false);

  // delete order confirmation modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // system settings (for sender printout)
  const [senderName, setSenderName] = useState("Happy Shop (สำนักงานใหญ่)");
  const [senderAddress, setSenderAddress] = useState("99/9 ถ.พหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900");
  const [senderPhone, setSenderPhone] = useState("0812345678");

  const fetchOrdersAndSettings = async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json() as Order[];
        // Sort descending by date
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(data);
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
    fetchOrdersAndSettings();
  }, []);

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.address.phone.includes(search);
    
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Change order status
  const handleUpdateStatus = async (id: string, newStatus: Order['status']) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const updated = await res.json() as Order;
        setOrders(orders.map(o => o.id === id ? updated : o));
        if (selectedOrder && selectedOrder.id === id) {
          setSelectedOrder(updated);
        }
      } else {
        alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Order
  const handleDeleteOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setOrders(orders.filter(o => o.id !== id));
        if (selectedOrder && selectedOrder.id === id) {
          setSelectedOrder(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const map = {
      pending: { label: "รอดำเนินการ", bg: "bg-amber-50 text-amber-700 border-amber-200" },
      processing: { label: "กำลังแพ็คของ", bg: "bg-blue-50 text-blue-700 border-blue-200" },
      shipped: { label: "จัดส่งแล้ว", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
      completed: { label: "สำเร็จแล้ว", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      cancelled: { label: "ยกเลิกแล้ว", bg: "bg-rose-50 text-rose-700 border-rose-200" },
    };
    const details = map[status] || { label: status, bg: "bg-slate-50 text-slate-700 border-slate-200" };
    return (
      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${details.bg}`}>
        {details.label}
      </span>
    );
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPDF = async () => {
    const element = document.getElementById("selected-sticker-printout");
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
      pdf.save(`shipping-label-${selectedOrder?.customerName || "order"}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      // Give fallback warning since iframe downloads are often blocked by browsers
      alert("ไม่สามารถดาวน์โหลดไฟล์โดยตรงได้เนื่องจากข้อจำกัดความปลอดภัยของเบราว์เซอร์ในหน้าพรีวิว\n\nแนะนำให้ลูกค้ากดปุ่ม 'สั่งพิมพ์' แล้วเลือกเครื่องพิมพ์เป็น 'Save as PDF' (บันทึกเป็น PDF) เพื่อบันทึกไฟล์แทนนะคะ");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full space-y-6" id="orders-tab-container">
      
      {/* Top Banner Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4" id="orders-header-card">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
            <ShoppingBag className="w-6 h-6 mr-2 text-blue-600" />
            ระบบจัดการออเดอร์ & ใบปะหน้ากล่อง (Orders Manager)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            ดูรายการสั่งซื้อ ค้นหาออเดอร์ อัปเดตสถานะการขนส่ง และจัดเตรียมพิมพ์ใบปะหน้าสินค้า
          </p>
        </div>
        <button
          onClick={fetchOrdersAndSettings}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 rounded-lg flex items-center self-start md:self-center transition"
          id="btn-refresh-orders"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          รีเฟรชข้อมูล
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="orders-workspace">
        
        {/* Left Side: Orders list */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]" id="orders-left-column">
          
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 bg-slate-50/50" id="orders-filter-bar">
            {/* Search Input */}
            <div className="relative flex-1" id="order-search-wrapper">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อลูกค้า, เลขออเดอร์, เบอร์โทร..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                id="order-search-input"
              />
            </div>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              id="order-status-filter"
            >
              <option value="all">กรองทุกสถานะ</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="processing">กำลังแพ็คของ</option>
              <option value="shipped">จัดส่งแล้ว</option>
              <option value="completed">สำเร็จแล้ว</option>
              <option value="cancelled">ยกเลิกแล้ว</option>
            </select>
          </div>

          {/* List content */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100" id="orders-list-wrapper">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm" id="empty-orders-state">
                ไม่พบข้อมูลออเดอร์จัดส่งสินค้า
              </div>
            ) : (
              filteredOrders.map((ord) => {
                const isSelected = selectedOrder?.id === ord.id;
                const formattedDate = new Date(ord.createdAt).toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <button
                    key={ord.id}
                    id={`order-item-row-${ord.id}`}
                    onClick={() => {
                      setSelectedOrder(ord);
                      setShowPrintLabel(false);
                    }}
                    className={`w-full text-left p-4 flex items-center justify-between hover:bg-slate-50 transition ${
                      isSelected ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-3" id={`order-meta-info-${ord.id}`}>
                      <div className="flex items-center space-x-2" id={`order-top-row-${ord.id}`}>
                        <span className="font-mono text-xs font-bold text-slate-950 uppercase">{ord.id.substr(0, 10)}</span>
                        {getStatusBadge(ord.status)}
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800 mt-1 truncate">{ord.customerName}</h4>
                      
                      <div className="flex items-center text-[11px] text-slate-500 mt-1 space-x-3" id={`order-summary-row-${ord.id}`}>
                        <span>ยอดรวม: <strong className="text-slate-800">฿{ord.total}</strong></span>
                        <span>•</span>
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0" id={`order-chev-arrow-${ord.id}`}>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Order Detail Details & Printable Coverage sticker */}
        <div className="lg:col-span-5" id="orders-right-column">
          {selectedOrder ? (
            <div className="space-y-6" id="order-detail-card">
              
              {/* Main Panel details */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">รายละเอียดออเดอร์</h3>
                    <p className="font-mono text-xs text-slate-400 mt-0.5">ID: {selectedOrder.id}</p>
                  </div>
                  <button
                    onClick={() => setShowPrintLabel(!showPrintLabel)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-lg border border-blue-100 font-semibold flex items-center transition"
                    id="btn-toggle-shipping-print"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    พรีวิวใบปะหน้า
                  </button>
                </div>

                {/* Receiver Contacts Card */}
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-700" id="detail-recipient-card">
                  <h4 className="font-bold text-slate-800 flex items-center mb-1">
                    <User className="w-4 h-4 mr-1.5 text-blue-600" />
                    ข้อมูลผู้รับจัดส่ง
                  </h4>
                  <p><span className="text-slate-400 font-medium">ชื่อ-สกุล:</span> {selectedOrder.customerName}</p>
                  <p><span className="text-slate-400 font-medium">เบอร์โทร:</span> {selectedOrder.address.phone}</p>
                  <p className="leading-relaxed">
                    <span className="text-slate-400 font-medium">ที่อยู่:</span> {selectedOrder.address.fullAddress} ต.{selectedOrder.address.subdistrict} อ.{selectedOrder.address.district} จ.{selectedOrder.address.province} {selectedOrder.address.zipcode}
                  </p>
                </div>

                {/* Products detail lists */}
                <div className="space-y-2 text-xs" id="detail-items-list-wrapper">
                  <h4 className="font-bold text-slate-800 flex items-center pb-1 border-b border-slate-100">
                    <ShoppingBag className="w-4 h-4 mr-1.5 text-blue-600" />
                    รายการสินค้าที่สั่งซื้อ
                  </h4>
                  <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto" id="detail-items-list">
                    {selectedOrder.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between py-2 text-slate-700 font-sans">
                        <div>
                          <span className="font-mono bg-slate-100 text-slate-700 px-1 rounded font-bold mr-1.5">{it.code}</span>
                          <span>{it.name}</span>
                        </div>
                        <span className="font-bold text-slate-900">{it.qty} x ฿{it.price}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center py-2.5 px-3 bg-blue-50 rounded-xl text-xs font-bold text-blue-950 mt-2">
                    <span>ยอดรวมสุทธิ</span>
                    <span>฿{selectedOrder.total} บาท</span>
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="space-y-2 pt-4 border-t border-slate-100" id="detail-status-actions">
                  <label className="block text-xs font-bold text-slate-600 mb-2">อัปเดตสถานะการขนส่งพัสดุ:</label>
                  
                  <div className="grid grid-cols-2 gap-2" id="status-buttons-grid">
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, "processing")}
                      className={`text-xs font-semibold py-2 rounded-lg border transition ${
                        selectedOrder.status === "processing" 
                          ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10" 
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      กำลังแพ็คของ
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, "shipped")}
                      className={`text-xs font-semibold py-2 rounded-lg border transition ${
                        selectedOrder.status === "shipped" 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10" 
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      จัดส่งสินค้าแล้ว
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, "completed")}
                      className={`text-xs font-semibold py-2 rounded-lg border transition col-span-2 ${
                        selectedOrder.status === "completed" 
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/10" 
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      จัดส่งสำเร็จแล้ว (Completed)
                    </button>
                    
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, "cancelled")}
                      className={`text-xs font-semibold py-1.5 rounded-lg border transition ${
                        selectedOrder.status === "cancelled" 
                          ? "bg-rose-600 text-white border-rose-600" 
                          : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
                      }`}
                    >
                      ยกเลิกออเดอร์
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(selectedOrder.id)}
                      className="bg-white hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center transition"
                      id="btn-delete-order"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      ลบออเดอร์
                    </button>
                  </div>
                </div>

              </div>

              {/* Show label preview below if requested */}
              {showPrintLabel && (
                <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-blue-300 shadow-sm space-y-4" id="printable-area-label-selected">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center">
                      <Printer className="w-4 h-4 mr-1" />
                      ใบแปะหน้าพัสดุสำหรับพิมพ์
                    </h4>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleDownloadPDF}
                          disabled={isGeneratingPdf}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center cursor-pointer shadow-sm"
                          id="btn-trigger-download-pdf-orders"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          {isGeneratingPdf ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}
                        </button>
                        <button
                          onClick={handlePrint}
                          className="bg-slate-850 text-white px-2.5 py-1 rounded text-[11px] font-bold hover:bg-slate-950 transition flex items-center cursor-pointer border border-slate-700 shadow-sm"
                          id="btn-trigger-print-orders"
                        >
                          <Printer className="w-3 h-3 mr-1" />
                          สั่งพิมพ์
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-500 text-right max-w-xs mt-1 leading-normal no-print">
                        💡 หากดาวน์โหลดไม่ได้ในหน้าพรีวิวนี้ แนะนำให้กด <span className="font-semibold text-blue-600">"สั่งพิมพ์"</span> แล้วเลือก <span className="font-semibold text-slate-700">"บันทึกเป็น PDF"</span> แทนได้ทันที หรือกดปุ่มเปิดแอปในแท็บใหม่ค่ะ
                      </p>
                    </div>
                  </div>

                  <div className="p-4 border-2 border-black rounded bg-white text-black font-sans text-xs leading-relaxed max-w-sm mx-auto printable-area" id="selected-sticker-printout">
                    <div className="grid grid-cols-2 gap-2 pb-3 border-b border-dashed border-slate-300">
                      <div>
                        <p className="font-bold text-[10px] text-slate-600 uppercase">ผู้ส่ง (Sender):</p>
                        <p className="font-bold">{senderName}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-2">{senderAddress}</p>
                        <p className="font-semibold text-[10px] mt-0.5">โทร: {senderPhone}</p>
                      </div>
                      <div className="text-right flex flex-col justify-between items-end">
                        <span className="bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded">
                          EMS / FLASH
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono mt-1">ORD-ID: {selectedOrder.id.substr(4, 6).toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="py-4 border-b border-dashed border-slate-300">
                      <p className="font-bold text-[10px] text-slate-600 uppercase">ผู้รับ (Receiver):</p>
                      <p className="text-sm font-bold text-black">{selectedOrder.customerName}</p>
                      <p className="text-slate-800 mt-0.5">{selectedOrder.address.fullAddress}</p>
                      <p className="font-semibold">ต.{selectedOrder.address.subdistrict} อ.{selectedOrder.address.district} จ.{selectedOrder.address.province}</p>
                      
                      <div className="flex justify-between items-center mt-3">
                        <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded font-mono font-bold tracking-widest text-sm">
                          {selectedOrder.address.zipcode}
                        </span>
                        <span className="font-bold">โทร: {selectedOrder.address.phone}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="font-bold text-[10px] text-slate-600 uppercase mb-1">สิ่งของในกล่อง:</p>
                      <div className="space-y-0.5">
                        {selectedOrder.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[10px] font-mono text-slate-700">
                            <span>• [{it.code}] {it.name}</span>
                            <span className="font-bold">x{it.qty}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-400 mt-2 text-center border-t border-slate-100 pt-1">
                        ขอบคุณที่อุดหนุนสินค้าของร้านเราค่ะ
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white p-12 text-center text-slate-400 text-sm rounded-2xl border border-slate-200 shadow-sm" id="empty-selected-detail">
              กรุณาเลือกรายการออเดอร์จัดส่งทางด้านซ้ายเพื่อเปิดดูรายละเอียดและพิมพ์ใบปะหน้าสินค้า
            </div>
          )}
        </div>

      </div>

      {/* Delete Confirmation Modal Overlay */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="order-delete-confirm-overlay">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200" id="order-delete-confirm-modal">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">ยืนยันการลบออเดอร์</h4>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  คุณแน่ใจว่าต้องการลบออเดอร์นี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmId) {
                    handleDeleteOrder(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition shadow-md shadow-rose-500/10 cursor-pointer"
                id="btn-confirm-order-delete"
              >
                ยืนยันลบออเดอร์
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
