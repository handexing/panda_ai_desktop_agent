import { useState, useEffect, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Trash2, RefreshCw, Circle, Store } from "lucide-react";
import { listMcpServers, deleteMcpServer, checkMcpServer } from "../../lib/tauri";
import type { McpServer, McpServerStatus } from "../../lib/tauri";
import { McpMarketplace } from "./McpMarketplace";

const isMac = navigator.userAgent.includes("Mac");

type Tab = "installed" | "marketplace";

export function McpWindow() {
  const win = getCurrentWindow();
  const [tab, setTab] = useState<Tab>("marketplace");
  const [servers, setServers] = useState<McpServer[]>([]);
  const [statuses, setStatuses] = useState<Record<string, McpServerStatus | null>>({});
  const [checking, setChecking] = useState<Record<string, boolean>>({});

  const loadServers = () => {
    listMcpServers().then(setServers).catch(console.error);
  };

  useEffect(() => { loadServers(); }, []);

  // Reload when switching to installed tab
  useEffect(() => { if (tab === "installed") loadServers(); }, [tab]);

  const handleCheck = async (srv: McpServer) => {
    setChecking((prev) => ({ ...prev, [srv.id]: true }));
    try {
      const status = await checkMcpServer(srv.command, srv.args);
      setStatuses((prev) => ({ ...prev, [srv.id]: status }));
    } catch (e) {
      setStatuses((prev) => ({ ...prev, [srv.id]: { ok: false, tool_count: 0, message: String(e) } }));
    } finally {
      setChecking((prev) => ({ ...prev, [srv.id]: false }));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMcpServer(id);
      setServers((prev) => prev.filter((s) => s.id !== id));
      setStatuses((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = useCallback(() => win.close(), [win]);
  const handleMinimize = useCallback(() => win.minimize(), [win]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 rounded-2xl overflow-hidden">
      <div
        className="relative flex items-center h-10 bg-gray-800/80 shrink-0 select-none"
        data-tauri-drag-region="true"
      >
        {isMac && (
          <div className="flex items-center gap-1.5 pl-3">
            <button onClick={handleClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 active:bg-red-600" />
            <button onClick={handleMinimize} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600" />
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center text-sm text-white/70 font-medium pointer-events-none select-none">
          MCP 管理
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/10 shrink-0">
        <button
          onClick={() => setTab("marketplace")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors ${
            tab === "marketplace"
              ? "text-white border-b-2 border-blue-500"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          <Store size={14} />
          市场
        </button>
        <button
          onClick={() => setTab("installed")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors ${
            tab === "installed"
              ? "text-white border-b-2 border-blue-500"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          <RefreshCw size={14} />
          已安装
          {servers.length > 0 && (
            <span className="bg-white/10 text-white/60 text-xs px-1.5 py-0.5 rounded-full">{servers.length}</span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "marketplace" ? (
          <McpMarketplace />
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white text-sm font-medium">已安装的服务器</h2>
              <button
                onClick={() => { servers.forEach((s) => handleCheck(s)); }}
                disabled={servers.length === 0}
                className="flex items-center gap-1 text-xs text-white/50 hover:text-white disabled:opacity-30 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <RefreshCw size={12} />
                全部检测
              </button>
            </div>

            {servers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/30 text-sm mb-2">暂无服务器</p>
                <button
                  onClick={() => setTab("marketplace")}
                  className="text-blue-400 text-sm hover:text-blue-300"
                >
                  去市场安装 →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {servers.map((srv) => {
                  const status = statuses[srv.id];
                  const isChecking = checking[srv.id];
                  return (
                    <div key={srv.id} className="px-3 py-2 bg-white/5 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {status ? (
                            <Circle size={8} className={`shrink-0 ${status.ok ? "text-green-400 fill-green-400" : "text-red-400 fill-red-400"}`} />
                          ) : (
                            <Circle size={8} className="text-white/20 fill-white/20 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-white/80 text-sm truncate">{srv.name}</div>
                            <div className="text-white/40 text-xs truncate">{srv.command} {srv.args}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleCheck(srv)}
                            disabled={isChecking}
                            className="text-white/30 hover:text-white disabled:opacity-50 p-1"
                          >
                            <RefreshCw size={12} className={isChecking ? "animate-spin" : ""} />
                          </button>
                          <button
                            onClick={() => handleDelete(srv.id)}
                            className="text-white/30 hover:text-red-400 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {status && (
                        <div className={`text-xs pl-5 ${status.ok ? "text-green-400/70" : "text-red-400/70"}`}>
                          {status.message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
