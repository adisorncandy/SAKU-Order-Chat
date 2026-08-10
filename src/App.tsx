import React, { useState, useEffect } from "react";
import { Lock, Loader2 } from "lucide-react";
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
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

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
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/status");
        const data = await res.json() as { authenticated: boolean };
        setAuthenticated(data.authenticated);
        if (data.authenticated) {
          fetchGlobalSettings();
        }
      } catch (err) {
        console.error("Failed to check auth status", err);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(fetchGlobalSettings, 10000);
    return () => clearInterval(interval);
  }, [authenticated]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setLoginError("รหัสผ่านไม่ถูกต้อง");
        return;
      }
      setAuthenticated(true);
      setPassword("");
      await fetchGlobalSettings();
    } catch (err) {
      setLoginError("เข้าสู่ระบบไม่ได้ กรุณาลองใหม่");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleOrderCreated = () => {
    // Automatically switch to orders view when order is created via chat parser or address parser!
    setActiveTab("orders");
  };

  if (!authChecked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 px-4 font-sans">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500 text-slate-950">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">SAKU Order Chat</h1>
              <p className="text-sm text-slate-400">เข้าสู่ระบบแอดมิน</p>
            </div>
          </div>

          <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="admin-password">
            รหัสผ่าน
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mb-3 h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
            autoComplete="current-password"
            autoFocus
          />
          {loginError && <p className="mb-3 text-sm text-rose-300">{loginError}</p>}
          <button
            type="submit"
            disabled={loggingIn || !password}
            className="flex h-11 w-full items-center justify-center rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    );
  }

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
