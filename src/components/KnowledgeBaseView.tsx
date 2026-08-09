import React, { useState, useEffect } from "react";
import { 
  Database, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  HelpCircle, 
  Tag, 
  X, 
  Check, 
  AlertCircle,
  RefreshCw,
  BookOpen
} from "lucide-react";
import { KnowledgeItem } from "../types";

export default function KnowledgeBaseView() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  // Editor modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields State
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  const fetchKnowledge = async () => {
    try {
      const res = await fetch("/api/knowledge-base");
      if (res.ok) {
        const data = await res.json() as KnowledgeItem[];
        setItems(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  // Filter KB FAQs
  const filteredItems = items.filter(item => 
    item.question.toLowerCase().includes(search.toLowerCase()) ||
    item.answer.toLowerCase().includes(search.toLowerCase()) ||
    item.keywords.some(k => k.toLowerCase().includes(search.toLowerCase()))
  );

  // Trigger Add Modal
  const handleOpenAdd = () => {
    setEditId(null);
    setQuestion("");
    setAnswer("");
    setKeywordInput("");
    setKeywords([]);
    setError("");
    setIsEditing(true);
  };

  // Trigger Edit Modal
  const handleOpenEdit = (item: KnowledgeItem) => {
    setEditId(item.id);
    setQuestion(item.question);
    setAnswer(item.answer);
    setKeywordInput("");
    setKeywords(item.keywords || []);
    setError("");
    setIsEditing(true);
  };

  // Add tag keyword to local array
  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = keywordInput.trim().replace(/,/g, "");
      if (val && !keywords.includes(val)) {
        setKeywords([...keywords, val]);
        setKeywordInput("");
      }
    }
  };

  const handleRemoveKeyword = (indexToRemove: number) => {
    setKeywords(keywords.filter((_, idx) => idx !== indexToRemove));
  };

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!question.trim() || !answer.trim()) {
      setError("กรุณากรอกข้อมูล คำถามจัดทำ และ คำตอบสำเร็จรูป ให้ครบถ้วน");
      return;
    }

    const payload = { question, answer, keywords };

    try {
      let res;
      if (editId) {
        res = await fetch(`/api/knowledge-base/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/knowledge-base", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setIsEditing(false);
        fetchKnowledge();
      } else {
        const d = await res.json();
        setError(d.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ฐานข้อมูลได้");
    }
  };

  // Delete KB FAQ
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge-base/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems(items.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full space-y-6" id="kb-tab-container">
      
      {/* Top Banner Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4" id="kb-header-card">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center">
            <Database className="w-6 h-6 mr-2 text-blue-600" />
            ฐานข้อมูลอัจฉริยะสำหรับ AI แอดมิน (AI Knowledge Base)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            บันทึกข้อมูลตอบลูกค้า เช่น คำตอบเรื่องค่าส่ง, บัญชีธนาคารสำหรับโอนเงิน, นโยบายการคืนสินค้า และเวลาเปิดปิด เพื่อให้แชทบอท AI (Gemini) นำข้อมูลเหล่านี้ไปประมวลคำตอบตอบลูกค้าได้แม่นยำ
          </p>
        </div>
        
        <button
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center self-start md:self-center transition shadow-lg shadow-blue-500/10"
          id="btn-add-new-kb"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          เพิ่มข้อมูลคำถามพบบ่อย (FAQ)
        </button>
      </div>

      {/* Main Grid List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" id="kb-main-view">
        
        {/* Search & filter bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 bg-slate-50/50 justify-between items-center" id="kb-filter-bar">
          <div className="relative flex-1 max-w-md w-full" id="kb-search-wrapper">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาตามข้อคำถาม หรือเนื้อหาตอบกลับ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              id="kb-search-input"
            />
          </div>
          
          <button
            onClick={fetchKnowledge}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition"
            title="รีเซ็ตข้อมูลความรู้"
            id="btn-refresh-kb"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* FAQ grid layout cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4" id="kb-cards-grid">
          {filteredItems.length === 0 ? (
            <div className="col-span-2 text-center py-16 text-slate-400 text-sm" id="kb-empty-state">
              <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-2" />
              ไม่พบข้อมูลข้อจำแนกอัจฉริยะในคลังความรู้
            </div>
          ) : (
            filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="p-5 border border-slate-200 rounded-2xl bg-slate-50/30 hover:bg-white hover:border-blue-200/80 hover:shadow-md hover:shadow-blue-500/5 transition duration-200 flex flex-col justify-between"
                id={`kb-card-item-${item.id}`}
              >
                <div>
                  {/* Question header */}
                  <h4 className="font-bold text-slate-800 text-sm leading-snug flex items-start" id={`kb-q-${item.id}`}>
                    <HelpCircle className="w-4.5 h-4.5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                    {item.question}
                  </h4>

                  {/* Answer description */}
                  <p className="text-slate-600 text-xs mt-2 bg-white p-3 rounded-xl border border-slate-100 whitespace-pre-line leading-relaxed" id={`kb-a-${item.id}`}>
                    {item.answer}
                  </p>

                  {/* Keywords Tags list */}
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3.5" id={`kb-kws-${item.id}`}>
                      {item.keywords.map((kw, idx) => (
                        <span key={idx} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full border border-blue-100 font-medium">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer card action toolbar */}
                <div className="flex justify-end items-center mt-4 pt-3 border-t border-slate-100/80 space-x-2" id={`kb-toolbar-${item.id}`}>
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="text-xs text-slate-600 hover:text-blue-600 font-semibold px-2.5 py-1.5 hover:bg-blue-50 rounded-lg flex items-center transition"
                    id={`kb-edit-btn-${item.id}`}
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    แก้ไขข้อมูล
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="text-xs text-slate-400 hover:text-rose-600 font-semibold px-2.5 py-1.5 hover:bg-rose-50 rounded-lg flex items-center transition"
                    id={`kb-delete-btn-${item.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    ลบ
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

      </div>

      {/* Editor Drawer Drawer Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="kb-editor-overlay">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" id="kb-editor-modal">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50" id="kb-modal-header">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center">
                <Database className="w-4 h-4 mr-1.5 text-blue-600" />
                {editId ? "แก้ไขชุดความรู้ FAQ" : "บันทึกข้อมูลตอบลูกค้าชุดใหม่สำหรับ AI"}
              </h3>
              <button 
                onClick={() => setIsEditing(false)} 
                className="text-slate-400 hover:text-slate-600 rounded p-1 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form content */}
            <form onSubmit={handleSave} className="p-6 space-y-4" id="kb-modal-form">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center" id="kb-modal-error">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </div>
              )}

              <div id="kb-q-field-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  หัวข้อคำถามของลูกค้าที่พบบ่อย (FAQ Topic): <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="เช่น ค่าส่งกี่บาท / ส่งของรอบกี่โมง / บัญชีโอนธนาคารอะไร?"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                  id="kb-input-question"
                />
              </div>

              <div id="kb-a-field-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  เนื้อหาสำหรับตอบลูกค้าแบบเป็นทางการ (AI Answer Guide): <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={6}
                  placeholder="พิมพ์คำตอบอย่างละเอียดและชัดเจน สุภาพ มีหางเสียง..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-sans leading-relaxed text-slate-700"
                  id="kb-input-answer"
                />
              </div>

              <div id="kb-k-field-wrapper">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  คำสำคัญตรวจจับในข้อความแชท (Keywords) :
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleAddKeyword}
                    placeholder="พิมพ์คำสำคัญแล้วกด Enter หรือปุ่มจุลภาค เช่น 'ค่าส่ง', 'ส่งของ'"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                    id="kb-input-keyword-tag"
                  />
                  
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-100" id="keywords-container-list">
                      {keywords.map((kw, idx) => (
                        <span key={idx} className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center font-medium">
                          #{kw}
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(idx)}
                            className="ml-1 text-blue-200 hover:text-white font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Form buttons toolbar */}
              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2" id="kb-modal-footer">
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
                  id="kb-modal-submit-btn"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  บันทึกองค์ความรู้
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="kb-delete-confirm-overlay">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200" id="kb-delete-confirm-modal">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">ยืนยันการลบข้อมูลความรู้</h4>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  คุณแน่ใจว่าต้องการลบข้อมูลความรู้นี้ออกจากระบบของ AI ใช่หรือไม่? AI จะไม่สามารถใช้องค์ความรู้นี้ในการตอบคำถามลูกค้าได้อีกต่อไป
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
                id="btn-confirm-kb-delete"
              >
                ยืนยันลบข้อมูลความรู้
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
