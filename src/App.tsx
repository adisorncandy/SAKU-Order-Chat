import React, { useState, useEffect } from "react";
import Sidebar, { TabType } from "./components/Sidebar.tsx";
import ChatView from "./components/ChatView.tsx";
import AddressParserView from "./components/AddressParserView.tsx";
import OrdersView from "./components/OrdersView.tsx";
import ProductsView from "./components/ProductsView.tsx";
import KnowledgeBaseView from "./components/KnowledgeBaseView.tsx";
import SettingsView from "./components/SettingsView.tsx";
import { Settings } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [settings, setSettings] = useState<Settings | null>(null);

  const fetchGlobalSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json() as Settings;
        setSettings(data);
      }
    } catch (err) {
      console.error("Failed to load global app settings", err);
    }
  };

  useEffect(() => {
    fetchGlobalSettings();
    // Poll settings occasionally to sync AI toggle status/page name
    const interval = setInterval(fetchGlobalSettings, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleOrderCreated = () => {
    // Automatically switch to orders view when order is created via chat parser or address parser!
    setActiveTab("orders");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans" id="app-root-layout">
      {/* Sidebar Navigation Panel on the Left */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        aiEnabled={settings?.aiEnabled ?? true} 
        pageName={settings?.companyName ?? "Happy Shop"}
      />

      {/* Main Workspace Frame on the Right */}
      <main className="flex-1 h-full overflow-y-auto flex flex-col" id="app-main-stage">
        {activeTab === "chat" && (
          <ChatView onOrderCreated={handleOrderCreated} />
        )}
        {activeTab === "parser" && (
          <AddressParserView onOrderCreated={handleOrderCreated} />
        )}
        {activeTab === "orders" && (
          <OrdersView />
        )}
        {activeTab === "products" && (
          <ProductsView />
        )}
        {activeTab === "kb" && (
          <KnowledgeBaseView />
        )}
        {activeTab === "settings" && (
          <SettingsView />
        )}
      </main>
    </div>
  );
}
