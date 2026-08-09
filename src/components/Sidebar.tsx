import React from "react";
import { 
  MessageSquare, 
  MapPin, 
  ShoppingBag, 
  Package, 
  Database, 
  Settings, 
  Facebook
} from "lucide-react";

export type TabType = 'chat' | 'parser' | 'orders' | 'products' | 'kb' | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  aiEnabled: boolean;
  pageName: string;
}

export default function Sidebar({ activeTab, setActiveTab, aiEnabled, pageName }: SidebarProps) {
  const menuItems = [
    { id: 'chat', label: 'แชท Facebook', icon: MessageSquare, badge: true },
    { id: 'parser', label: 'แยกที่อยู่ & สั่งซื้อ', icon: MapPin },
    { id: 'orders', label: 'จัดการออเดอร์', icon: ShoppingBag },
    { id: 'products', label: 'จัดการสินค้า', icon: Package },
    { id: 'kb', label: 'ฐานข้อมูล AI', icon: Database },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings },
  ] as const;

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen border-r border-slate-800" id="app-sidebar">
      {/* Header / Brand */}
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3" id="sidebar-header">
        <div className="bg-blue-600 p-2 rounded-lg text-white" id="brand-fb-icon-wrapper">
          <Facebook className="w-6 h-6" id="brand-fb-icon" />
        </div>
        <div>
          <h1 className="font-bold text-md leading-tight text-white" id="brand-title">FB Page Manager</h1>
          <p className="text-xs text-slate-400 mt-0.5" id="brand-subtitle">{pageName || "Happy Shop"}</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto" id="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-tab-btn-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-slate-400'}`} id={`sidebar-tab-icon-${item.id}`} />
              <span className="flex-1 text-left" id={`sidebar-tab-label-${item.id}`}>{item.label}</span>
              {item.id === 'chat' && aiEnabled && (
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-semibold border border-emerald-500/20" id="ai-active-badge">
                  AI
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40" id="sidebar-footer">
        <div className="flex items-center space-x-3" id="footer-user-info">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-200" id="footer-user-avatar">
            AD
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-300" id="footer-user-name">แอดมิน Adisorn</p>
            <p className="text-[10px] text-slate-500" id="footer-user-role">ผู้ดูแลระบบเพจ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
