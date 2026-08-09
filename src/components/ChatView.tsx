import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Bot, 
  RefreshCw, 
  Trash2, 
  AlertCircle, 
  Check, 
  Clock, 
  User, 
  Cpu, 
  Plus, 
  HelpCircle,
  Play,
  FileText
} from "lucide-react";
import { ChatThread, ChatMessage, Product, AddressDetails } from "../types";

interface ChatViewProps {
  onOrderCreated?: () => void;
}

export default function ChatView({ onOrderCreated }: ChatViewProps) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>("");
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  
  // New manual message text
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // AI Suggestions
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState("");

  // Simulator state
  const [simName, setSimName] = useState("กิตติศักดิ์ มั่งมี");
  const [simText, setSimText] = useState("สนใจกระบอกน้ำครับ ส่งฟรีไหม");
  const [isSimulating, setIsSimulating] = useState(false);

  // Address Parsing Quick-Check from Current Chat
  const [isParsingAddress, setIsParsingAddress] = useState(false);
  const [parsedAddressResult, setParsedAddressResult] = useState<any>(null);

  // Clear chat confirm modal state
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load all threads
  const fetchThreads = async (selectId?: string) => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json() as ChatThread[];
        setThreads(data);
        if (data.length > 0) {
          const nextSelect = selectId || selectedThreadId || data[0].id;
          setSelectedThreadId(nextSelect);
        }
      }
    } catch (err) {
      console.error("Failed to fetch threads:", err);
    }
  };

  // Load single thread details (includes marking as read)
  const fetchThreadDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/chats/${id}`);
      if (res.ok) {
        const data = await res.json() as ChatThread;
        setCurrentThread(data);
        // Clear AI suggestion state when switching threads
        setAiSuggestion("");
        setAiError("");
        setParsedAddressResult(null);
      }
    } catch (err) {
      console.error("Failed to fetch thread details:", err);
    }
  };

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(() => {
      fetchThreads();
    }, 5000); // Poll threads every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedThreadId) {
      fetchThreadDetails(selectedThreadId);
    }
  }, [selectedThreadId]);

  // Scroll to bottom of message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentThread?.messages]);

  // Send message as Admin
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedThreadId) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/chats/${selectedThreadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText }),
      });

      if (res.ok) {
        const newMsg = await res.json() as ChatMessage;
        if (currentThread) {
          setCurrentThread({
            ...currentThread,
            messages: [...currentThread.messages, newMsg],
            lastMessage: replyText,
            updatedAt: newMsg.timestamp,
          });
        }
        setReplyText("");
        setAiSuggestion("");
        fetchThreads(selectedThreadId);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Request AI Suggestion
  const handleGetAiSuggestion = async () => {
    if (!selectedThreadId) return;
    setIsGeneratingAi(true);
    setAiError("");
    setAiSuggestion("");
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: selectedThreadId }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiSuggestion(data.text);
      } else {
        setAiError(data.error || "เกิดข้อผิดพลาดในการเรียก AI");
      }
    } catch (err) {
      setAiError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ AI ได้");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Simulator - customer sends message
  const handleSimulateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simText.trim()) return;

    setIsSimulating(true);
    // Create simulated custom threadId based on name
    const tempThreadId = "sim_" + encodeURIComponent(simName.replace(/\s+/g, ''));

    try {
      const res = await fetch(`/api/chats/${tempThreadId}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: simName,
          text: simText,
        }),
      });

      if (res.ok) {
        setSimText("");
        // Reload threads and force select this simulated customer
        await fetchThreads(tempThreadId);
        await fetchThreadDetails(tempThreadId);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Clear Chat History
  const handleClearChat = async () => {
    if (!selectedThreadId) return;

    try {
      const res = await fetch(`/api/chats/${selectedThreadId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchThreadDetails(selectedThreadId);
        fetchThreads(selectedThreadId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Address Parser from Selected Thread
  const handleQuickParseAddress = async () => {
    if (!currentThread || currentThread.messages.length === 0) return;
    
    setIsParsingAddress(true);
    setParsedAddressResult(null);

    // Concatenate last 3 customer messages to find potential address details
    const customerMessages = currentThread.messages
      .filter(m => m.sender === 'customer')
      .slice(-3)
      .map(m => m.text)
      .join("\n");

    if (!customerMessages) {
      alert("ไม่พบข้อความของลูกค้าล่าสุดที่จะสกัดข้อมูลที่อยู่");
      setIsParsingAddress(false);
      return;
    }

    try {
      const res = await fetch("/api/ai/parse-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: customerMessages }),
      });
      if (res.ok) {
        const data = await res.json();
        setParsedAddressResult(data);
      } else {
        alert("ไม่สามารถแยกข้อมูลที่อยู่ได้โดยอัตโนมัติ");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsingAddress(false);
    }
  };

  // Create order directly from quick parse
  const handleCreateOrderFromQuickParse = async () => {
    if (!parsedAddressResult || !currentThread) return;

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: currentThread.id,
          customerName: parsedAddressResult.address.name || currentThread.customerName,
          items: parsedAddressResult.items,
          status: "pending",
          address: parsedAddressResult.address,
        }),
      });

      if (res.ok) {
        alert("สร้างออเดอร์จากข้อมูลแชทเรียบร้อยแล้ว!");
        setParsedAddressResult(null);
        if (onOrderCreated) {
          onOrderCreated();
        }
      } else {
        alert("เกิดข้อผิดพลาดในการสร้างออเดอร์");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden" id="chat-tab-container">
      
      {/* 1. Left Panel - Conversations List */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col h-full" id="chat-left-panel">
        <div className="p-4 border-b border-slate-200" id="chat-left-header">
          <div className="flex items-center justify-between mb-3" id="chat-title-row">
            <h2 className="font-bold text-slate-800 text-lg flex items-center" id="chat-tab-title">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2 inline-block animate-pulse"></span>
              Inbox แชทสด
            </h2>
            <button 
              onClick={() => fetchThreads()} 
              className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition"
              title="รีเฟรชแชท"
              id="refresh-threads-btn"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="relative" id="chat-search-wrapper">
            <input 
              type="text" 
              placeholder="ค้นหาลูกค้า..." 
              className="w-full text-sm pl-3 pr-8 py-1.5 bg-slate-100 border-0 rounded-lg focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
              id="chat-search-input"
            />
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100" id="thread-list">
          {threads.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm" id="empty-threads-state">
              ไม่พบรายการสนทนา
            </div>
          ) : (
            threads.map((t) => {
              const isSelected = t.id === selectedThreadId;
              const formattedTime = t.updatedAt 
                ? new Date(t.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                : '';
              
              return (
                <button
                  key={t.id}
                  id={`thread-item-${t.id}`}
                  onClick={() => setSelectedThreadId(t.id)}
                  className={`w-full text-left p-4 flex items-start space-x-3 transition-colors ${
                    isSelected ? 'bg-blue-50/70 border-l-4 border-blue-500' : 'hover:bg-slate-50'
                  }`}
                >
                  <img 
                    src={t.customerAvatar} 
                    alt={t.customerName} 
                    className="w-11 h-11 rounded-full object-cover border border-slate-200 flex-shrink-0"
                    id={`thread-avatar-${t.id}`}
                  />
                  <div className="flex-1 min-w-0" id={`thread-info-${t.id}`}>
                    <div className="flex items-center justify-between" id={`thread-meta-${t.id}`}>
                      <h4 className={`text-sm truncate ${t.unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {t.customerName}
                      </h4>
                      <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">
                        {formattedTime}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 truncate ${t.unread ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                      {t.lastMessage || "ไม่มีข้อความล่าสุด"}
                    </p>
                    
                    {t.id.startsWith("sim_") && (
                      <span className="inline-block bg-orange-100 text-orange-700 text-[9px] px-1.5 rounded mt-1 font-semibold border border-orange-200" id={`thread-badge-sim-${t.id}`}>
                        บอทจำลองแชท
                      </span>
                    )}
                  </div>
                  {t.unread && (
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full flex-shrink-0 self-center" id={`thread-unread-dot-${t.id}`}></div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Middle Panel - Current Active Chat conversation */}
      <div className="flex-1 flex flex-col bg-slate-50 h-full" id="chat-middle-panel">
        {currentThread ? (
          <>
            {/* Active Thread Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between" id="chat-active-header">
              <div className="flex items-center space-x-3" id="active-user-meta">
                <img 
                  src={currentThread.customerAvatar} 
                  alt={currentThread.customerName} 
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight">{currentThread.customerName}</h3>
                  <p className="text-[11px] text-slate-400">ID: {currentThread.id}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2" id="chat-actions-row">
                <button
                  onClick={handleQuickParseAddress}
                  disabled={isParsingAddress}
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 text-xs px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center transition"
                  id="btn-quick-parse-address"
                >
                  <Bot className="w-3.5 h-3.5 mr-1.5 animate-bounce" />
                  {isParsingAddress ? "วิเคราะห์อยู่..." : "ดึงที่อยู่จากแชท"}
                </button>

                <button
                  onClick={() => setShowClearChatConfirm(true)}
                  className="text-slate-400 hover:text-rose-600 hover:bg-slate-100 p-2 rounded-lg transition"
                  title="ล้างแชททั้งหมด"
                  id="btn-clear-chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4" id="messages-container">
              {currentThread.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2" id="empty-messages-state">
                  <Clock className="w-8 h-8 text-slate-300" />
                  <p className="text-sm">ไม่มีประวัติการสนทนา เริ่มคุยกันได้เลย!</p>
                </div>
              ) : (
                currentThread.messages.map((msg, index) => {
                  const isCustomer = msg.sender === 'customer';
                  const isAi = msg.sender === 'ai';
                  
                  return (
                    <div 
                      key={msg.id || index}
                      id={`msg-bubble-wrapper-${msg.id || index}`}
                      className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        isCustomer 
                          ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200/60' 
                          : isAi
                            ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-500/10'
                            : 'bg-slate-800 text-white rounded-tr-none'
                      }`}>
                        {/* Sender Label */}
                        <div className={`text-[10px] mb-1 font-bold ${
                          isCustomer 
                            ? 'text-slate-400' 
                            : isAi 
                              ? 'text-blue-200 flex items-center' 
                              : 'text-slate-300'
                        }`} id={`msg-sender-label-${msg.id || index}`}>
                          {isAi && <Bot className="w-3 h-3 mr-1 inline" />}
                          {isCustomer ? 'ลูกค้า' : isAi ? 'AI อัจฉริยะช่วยตอบ' : 'แอดมิน'}
                        </div>

                        {/* Text */}
                        <p className="whitespace-pre-wrap leading-relaxed break-words" id={`msg-text-${msg.id || index}`}>
                          {msg.text}
                        </p>
                        
                        {/* Time */}
                        <div className={`text-[9px] text-right mt-1.5 ${
                          isCustomer ? 'text-slate-400' : isAi ? 'text-blue-200' : 'text-slate-400'
                        }`} id={`msg-time-${msg.id || index}`}>
                          {new Date(msg.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Parsed Address Panel Overlay */}
            {parsedAddressResult && (
              <div className="mx-6 mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl" id="quick-parsed-overlay">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-emerald-800 flex items-center">
                    <Bot className="w-4 h-4 mr-1.5 text-emerald-600" />
                    AI ตรวจจับชื่อ-ที่อยู่ และออเดอร์พบในแชทนี้!
                  </h4>
                  <button 
                    onClick={() => setParsedAddressResult(null)} 
                    className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ปิด
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">ข้อมูลที่อยู่จัดส่ง:</p>
                    <p><span className="text-slate-500">ชื่อ:</span> {parsedAddressResult.address.name || "-"}</p>
                    <p><span className="text-slate-500">โทร:</span> {parsedAddressResult.address.phone || "-"}</p>
                    <p className="truncate"><span className="text-slate-500">ที่อยู่:</span> {parsedAddressResult.address.fullAddress}</p>
                    <p><span className="text-slate-500">พิกัดจัดส่ง:</span> ต.{parsedAddressResult.address.subdistrict} อ.{parsedAddressResult.address.district} จ.{parsedAddressResult.address.province} {parsedAddressResult.address.zipcode}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">สินค้าที่ระบบตรวจพบ:</p>
                    {parsedAddressResult.items && parsedAddressResult.items.length > 0 ? (
                      <div className="space-y-1">
                        {parsedAddressResult.items.map((it: any, index: number) => (
                          <div key={index} className="flex justify-between py-0.5 border-b border-slate-100 last:border-0">
                            <span>[{it.code}] {it.name}</span>
                            <span className="font-bold">x {it.qty} (฿{it.price * it.qty})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">ไม่พบรหัสสินค้าที่เป็นทางการในข้อความ</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-3 space-x-2">
                  <button
                    onClick={() => setParsedAddressResult(null)}
                    className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-300 transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleCreateOrderFromQuickParse}
                    className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition flex items-center"
                    id="btn-create-order-quick"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    ตกลงเปิดออเดอร์ใบสั่งซื้อนี้
                  </button>
                </div>
              </div>
            )}

            {/* AI Assistant Helper Suggestions Box */}
            <div className="px-6 py-2 bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-t border-slate-200" id="ai-suggestion-section">
              <div className="flex items-center justify-between" id="ai-helper-header">
                <div className="flex items-center text-xs font-semibold text-blue-700">
                  <Bot className="w-4 h-4 mr-1.5 text-blue-600" />
                  แอดมิน AI ช่วยคิดคำตอบอัจฉริยะ (Gemini 3.5 Flash)
                </div>
                <button
                  type="button"
                  onClick={handleGetAiSuggestion}
                  disabled={isGeneratingAi}
                  className="text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 px-3 py-1 rounded-lg font-medium flex items-center shadow-sm transition"
                  id="btn-trigger-ai-suggestion"
                >
                  <Cpu className={`w-3 h-3 mr-1 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                  {isGeneratingAi ? "กำลังประมวลผล..." : "ให้ AI คิดคำตอบที่เหมาะสม"}
                </button>
              </div>

              {aiError && (
                <div className="mt-2 text-rose-600 text-xs flex items-center bg-rose-50 p-2 rounded border border-rose-100" id="ai-suggestion-error">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  {aiError}
                </div>
              )}

              {aiSuggestion && (
                <div className="mt-2.5 p-3.5 bg-white border border-blue-100 rounded-xl relative shadow-sm" id="ai-suggestion-content">
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{aiSuggestion}</p>
                  <div className="mt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyText(aiSuggestion);
                        setAiSuggestion("");
                      }}
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs px-2.5 py-1 rounded-lg border border-blue-200 font-semibold transition"
                      id="btn-apply-ai-reply"
                    >
                      นำข้อความนี้ไปวางในกล่องแชท
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Manual Admin Message Send input Form */}
            <div className="bg-white border-t border-slate-200 p-4" id="chat-input-section">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3" id="chat-input-form">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="พิมพ์ข้อความตอบกลับหาลูกค้า..."
                  rows={2}
                  className="flex-1 text-sm border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none transition"
                  id="chat-textarea-box"
                />
                <button
                  type="submit"
                  disabled={isSending || !replyText.trim()}
                  className="bg-blue-600 text-white rounded-xl p-3 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 flex-shrink-0"
                  id="chat-send-submit-btn"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8" id="empty-active-thread-state">
            <Bot className="w-16 h-16 text-slate-200 mb-3" />
            <h3 className="font-bold text-slate-700 text-base">ยินดีต้อนรับเข้าสู่ระบบจัดการแชท</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm text-center">
              กรุณาเลือกรายการลูกค้าทางแถบซ้ายมือเพื่อเริ่มต้นแชทสด หรือกดที่แผงขวาเพื่อจำลองการส่งแชททดสอบระบบ
            </p>
          </div>
        )}
      </div>

      {/* 3. Right Panel - Webhook Simulator Controls */}
      <div className="w-80 border-l border-slate-200 bg-white p-5 flex flex-col h-full overflow-y-auto" id="chat-right-panel-simulator">
        <div className="border-b border-slate-200 pb-4 mb-4" id="simulator-header">
          <h3 className="font-bold text-slate-800 text-sm flex items-center">
            <Play className="w-4 h-4 mr-1.5 text-orange-500 fill-orange-500" />
            ตัวทดสอบจำลองส่งแชทลูกค้า
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            ใช้จำลองการส่งข้อความของลูกค้า เพื่อดูปฏิกิริยาการทำงานของ Webhook และ AI Auto-Reply ได้แบบเรียลไทม์
          </p>
        </div>

        <form onSubmit={handleSimulateCustomer} className="space-y-4" id="simulator-form">
          <div id="sim-input-name-wrapper">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              ชื่อลูกค้าผู้จำลองส่งแชท:
            </label>
            <input
              type="text"
              required
              value={simName}
              onChange={(e) => setSimName(e.target.value)}
              placeholder="เช่น นายรักดี พากเพียร"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              id="sim-input-name"
            />
          </div>

          <div id="sim-input-msg-wrapper">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              ข้อความของลูกค้าที่ส่งเข้าเพจ:
            </label>
            <textarea
              required
              rows={3}
              value={simText}
              onChange={(e) => setSimText(e.target.value)}
              placeholder="พิมพ์ข้อความ เช่น 'ขอเลขที่บัญชีร้านหน่อยครับ' หรือ 'สินค้าชิ้นนี้ส่งฟรีไหมคะ'"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              id="sim-input-msg"
            />
          </div>

          <button
            type="submit"
            disabled={isSimulating}
            className="w-full bg-orange-500 text-white font-semibold py-2 rounded-lg text-xs hover:bg-orange-600 disabled:opacity-50 shadow-sm transition flex items-center justify-center"
            id="sim-submit-btn"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {isSimulating ? "กำลังยิง Webhook จำลอง..." : "ยิงแชทจำลองเข้า Webhook"}
          </button>
        </form>

        {/* Informative Help Guide Card */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200" id="chat-guide-card">
          <h4 className="text-xs font-bold text-slate-700 flex items-center mb-1.5">
            <HelpCircle className="w-4 h-4 mr-1.5 text-blue-500" />
            คำแนะนำพรีเซนต์
          </h4>
          <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>ใส่ <strong>คำสำคัญ (Keywords)</strong> ที่กำหนดไว้ในแท็บฐานข้อมูล AI เพื่อทดสอบความแม่นยำ</li>
            <li>หากเปิดโหมด <strong>AI Auto-Reply</strong> ในแท็บตั้งค่า ระบบ AI จะประมวลผลคำตอบอัตโนมัติภายใน 1-3 วินาทีทันที</li>
            <li>คุณสามารถก๊อปปี้บล็อกที่อยู่ส่งของในแชทไปทดสอบระบบแยกที่อยู่อัตโนมัติในแถบเมนูถัดไปได้ด้วย</li>
          </ul>
        </div>
      </div>

      {/* Clear Chat Confirmation Modal Overlay */}
      {showClearChatConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="clear-chat-confirm-overlay">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200" id="clear-chat-confirm-modal">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">ยืนยันการล้างประวัติการแชท</h4>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  คุณต้องการล้างประวัติการแชทของห้องนี้ใช่หรือไม่? ข้อมูลข้อความทั้งหมดจะไม่สามารถกู้คืนได้
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowClearChatConfirm(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  handleClearChat();
                  setShowClearChatConfirm(false);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition shadow-md shadow-rose-500/10 cursor-pointer"
                id="btn-confirm-clear-chat"
              >
                ยืนยันล้างแชท
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
