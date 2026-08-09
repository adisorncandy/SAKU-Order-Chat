import React, { useState, useEffect } from "react";
import { 
  Package, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  AlertCircle, 
  Tag, 
  DollarSign, 
  Boxes, 
  X, 
  Check,
  RefreshCw
} from "lucide-react";
import { Product } from "../types";

export default function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  // Editor modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Fields state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [description, setDescription] = useState("");

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json() as Product[];
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter lists
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  // Trigger Add new product mode
  const handleOpenAdd = () => {
    setEditId(null);
    setCode("");
    setName("");
    setPrice(0);
    setStock(0);
    setDescription("");
    setError("");
    setIsEditing(true);
  };

  // Trigger Edit product mode
  const handleOpenEdit = (p: Product) => {
    setEditId(p.id);
    setCode(p.code);
    setName(p.name);
    setPrice(p.price);
    setStock(p.stock);
    setDescription(p.description);
    setError("");
    setIsEditing(true);
  };

  // Save (Create or Update) handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code.trim() || !name.trim() || price <= 0) {
      setError("กรุณากรอกข้อมูล รหัสสินค้า, ชื่อสินค้า และราคาให้ถูกต้องครบถ้วน");
      return;
    }

    const payload = { code: code.toUpperCase(), name, price, stock, description };

    try {
      let res;
      if (editId) {
        // Update product
        res = await fetch(`/api/products/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create product
        res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setIsEditing(false);
        fetchProducts();
      } else {
        const d = await res.json();
        setError(d.error || "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  // Delete product
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts(products.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full space-y-6" id="products-tab-container">
      
      {/* Header Banner row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4" id="products-header-card">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
            <Package className="w-6 h-6 mr-2 text-blue-600" />
            ระบบจัดการคลังสินค้า & รหัสออเดอร์ (Products Catalog)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            บันทึกรายการสินค้า กำหนดรหัสสินค้า (SKU) ราคา และตรวจสอบจำนวนสต็อกสินค้าในร้าน เพื่อให้ AI ใช้จำแนกยอดคำสั่งซื้อได้ถูกต้อง
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center self-start md:self-center transition shadow-lg shadow-blue-500/10"
          id="btn-add-new-product"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          เพิ่มสินค้าใหม่
        </button>
      </div>

      {/* Main Catalog View Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" id="products-main-view">
        
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 bg-slate-50/50 justify-between items-center" id="products-filter-bar">
          <div className="relative flex-1 max-w-md w-full" id="prod-search-wrapper">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหารหัส หรือชื่อสินค้าในคลัง..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              id="prod-search-input"
            />
          </div>
          
          <button
            onClick={fetchProducts}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition"
            title="โหลดตารางสินค้าใหม่"
            id="btn-refresh-products"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Catalog Table */}
        <div className="overflow-x-auto" id="products-table-scroll-wrapper">
          <table className="w-full text-left border-collapse text-xs" id="products-data-table">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100" id="table-header-row">
                <th className="p-4 w-32">รหัสสินค้า (SKU)</th>
                <th className="p-4">รายละเอียดสินค้า</th>
                <th className="p-4 w-28 text-right">ราคาต่อชิ้น</th>
                <th className="p-4 w-28 text-center">คงเหลือในคลัง</th>
                <th className="p-4 w-24 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100" id="table-body">
              {filteredProducts.length === 0 ? (
                <tr id="table-empty-row">
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    ไม่พบรายการสินค้าจัดเก็บในระบบ
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors" id={`product-row-${p.id}`}>
                    <td className="p-4 font-mono font-bold text-blue-700" id={`p-code-${p.id}`}>
                      <span className="bg-blue-50 border border-blue-100 px-2 py-1 rounded">
                        {p.code}
                      </span>
                    </td>
                    <td className="p-4" id={`p-details-${p.id}`}>
                      <h4 className="font-bold text-slate-800 text-sm">{p.name}</h4>
                      <p className="text-slate-500 mt-0.5 max-w-md truncate">{p.description || "ไม่มีรายละเอียดสินค้า"}</p>
                    </td>
                    <td className="p-4 text-right font-extrabold text-slate-900 text-sm" id={`p-price-${p.id}`}>
                      ฿{p.price.toLocaleString()}
                    </td>
                    <td className="p-4 text-center" id={`p-stock-${p.id}`}>
                      <span className={`px-2 py-0.5 rounded-full font-bold font-mono ${
                        p.stock <= 5 
                          ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {p.stock} ชิ้น
                      </span>
                    </td>
                    <td className="p-4 text-center" id={`p-actions-${p.id}`}>
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                          title="แก้ไขรายละเอียด"
                          id={`p-edit-btn-${p.id}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(p.id)}
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="ลบสินค้า"
                          id={`p-delete-btn-${p.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Editor Modal Overlay Drawer */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="products-editor-overlay">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" id="products-editor-modal">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50" id="modal-header">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center">
                <Tag className="w-4 h-4 mr-1.5 text-blue-600" />
                {editId ? "แก้ไขรายละเอียดสินค้า" : "เพิ่มสินค้าใหม่ลงระบบ"}
              </h3>
              <button 
                onClick={() => setIsEditing(false)} 
                className="text-slate-400 hover:text-slate-600 rounded p-1 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4" id="modal-form">
              
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center" id="modal-error">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </div>
              )}

              <div id="modal-code-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  รหัสสินค้า (SKU / Code): <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="เช่น CAP-001, TSH-002"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 uppercase font-mono"
                  id="modal-input-code"
                />
              </div>

              <div id="modal-name-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  ชื่อสินค้า: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น หมวกแฟชั่นมินิมอลเกาหลี"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                  id="modal-input-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4" id="modal-prices-stock-row">
                <div id="modal-price-wrapper">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    ราคาสินค้า (บาท): <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-slate-400 font-bold text-[10px]">฿</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={price || ""}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      placeholder="เช่น 250"
                      className="w-full text-xs pl-6 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-semibold"
                      id="modal-input-price"
                    />
                  </div>
                </div>

                <div id="modal-stock-wrapper">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    คงเหลือในสต็อก (ชิ้น):
                  </label>
                  <div className="relative">
                    <Boxes className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="number"
                      min={0}
                      value={stock || ""}
                      onChange={(e) => setStock(Number(e.target.value))}
                      placeholder="เช่น 50"
                      className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                      id="modal-input-stock"
                    />
                  </div>
                </div>
              </div>

              <div id="modal-desc-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  รายละเอียดเพิ่มเติม:
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="เช่น รายละเอียดสเปค ขนาด สี ข้อมูลซัพพลายเออร์"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                  id="modal-input-desc"
                />
              </div>

              {/* Form Buttons Footer */}
              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2" id="modal-footer-actions">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2 rounded-lg transition shadow-md shadow-blue-500/10 flex items-center"
                  id="modal-save-btn"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  บันทึกข้อมูลสินค้า
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="delete-confirm-overlay">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200" id="delete-confirm-modal">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">ยืนยันการลบสินค้า</h4>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  คุณแน่ใจหรือไม่ว่าต้องการลบสินค้าชิ้นนี้ออกจากระบบ? การดำเนินการนี้ไม่สามารถย้อนกลับได้
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
                    handleDelete(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition shadow-md shadow-rose-500/10 cursor-pointer"
                id="btn-confirm-delete"
              >
                ยืนยันลบสินค้า
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
