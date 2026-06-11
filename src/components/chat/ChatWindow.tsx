import { useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Plus, History, Settings, FileText } from "lucide-react";
import { useConfig } from "../../hooks/useConfig";
import { useChat } from "../../hooks/useChat";
import { ChatPanel } from "./ChatPanel";
import { ConfigPanel } from "../config/ConfigPanel";
import { HistoryPanel } from "../history/HistoryPanel";
import { KnowledgePanel } from "../knowledge/KnowledgePanel";
import { usePandaStore } from "../../stores/pandaStore";
import { createConversation } from "../../lib/tauri";

const isMac = navigator.userAgent.includes("Mac");

export function ChatWindow() {
  useChat();
  useConfig();

  const win = getCurrentWindow();

  const handleMinimize = useCallback(() => win.minimize(), [win]);
  const handleMaximize = useCallback(() => win.toggleMaximize(), [win]);
  const handleClose = useCallback(() => win.close(), [win]);

  const handleNewChat = useCallback(async () => {
    try {
      const conv = await createConversation("新对话");
      const store = usePandaStore.getState();
      store.setCurrentConversationId(conv.id);
      store.setMessages([]);
      store.setStreamingText("");
      store.setIsStreaming(false);
    } catch (e) {
      console.error("Failed to create conversation:", e);
    }
  }, []);

  const handleTitleBarPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      win.startDragging();
    },
    [win],
  );

  // Auto-create a conversation on first mount (idempotent against StrictMode)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convId = params.get("convId");
    if (convId) {
      usePandaStore.getState().setCurrentConversationId(convId);
      return;
    }
    const already = usePandaStore.getState().currentConversationId;
    if (already) return;
    let cancelled = false;
    createConversation("新对话").then((conv) => {
      if (!cancelled && !usePandaStore.getState().currentConversationId) {
        usePandaStore.getState().setCurrentConversationId(conv.id);
      }
    }).catch(console.error);
    return () => { cancelled = true; };
  }, []);

  // Listen for conversation changes from pet window (e.g. file drop, new conversation)
  useEffect(() => {
    const unlisten = listen<{ conversationId: string }>(
      "chat:set-conversation",
      (event) => {
        const store = usePandaStore.getState();
        store.setCurrentConversationId(event.payload.conversationId);
        store.setMessages([]);
        store.setStreamingText("");
        store.setIsStreaming(false);
      },
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Listen for panel open requests from pet window (context menu)
  useEffect(() => {
    const unlisten = listen<{ panel: string }>(
      "panel:open",
      (event) => {
        const store = usePandaStore.getState();
        if (event.payload.panel === "config") {
          store.setConfigOpen(true);
        } else if (event.payload.panel === "history") {
          store.setHistoryOpen(true);
        } else if (event.payload.panel === "knowledge") {
          store.setKnowledgePanelOpen(true);
        }
      },
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-900 rounded-2xl overflow-hidden">
      {/* Custom title bar */}
      <div
        className="relative flex items-center h-10 bg-gray-800/80 shrink-0 select-none"
        onPointerDown={handleTitleBarPointerDown}
      >
        {/* Mac traffic light buttons */}
        {isMac && (
          <div className="flex items-center gap-1.5 pl-3">
            <button
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 active:bg-red-600"
            />
            <button
              onClick={handleMinimize}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600"
            />
            <button
              onClick={handleMaximize}
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 active:bg-green-600"
            />
          </div>
        )}

        {/* Title — absolutely centered */}
        <span className="absolute inset-0 flex items-center justify-center text-sm text-white/70 font-medium pointer-events-none select-none">
          Panda AI
        </span>

        {/* Windows window controls */}
        {!isMac && (
          <div className="flex items-center pr-2 ml-auto">
            <button
              onClick={handleMinimize}
              className="px-3 py-1.5 text-white/50 hover:text-white hover:bg-white/10 text-sm transition-colors"
            >
              &#x2014;
            </button>
            <button
              onClick={handleMaximize}
              className="px-3 py-1.5 text-white/50 hover:text-white hover:bg-white/10 text-sm transition-colors"
            >
              &#x25A1;
            </button>
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-white/50 hover:text-white hover:bg-red-500/80 text-sm transition-colors"
            >
              &#x2715;
            </button>
          </div>
        )}
      </div>

      {/* Secondary header with app controls */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 shrink-0">
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 text-white/50 hover:text-white hover:bg-white/10 px-2 py-1 rounded-lg text-sm transition-colors"
          title="开启新对话"
        >
          <Plus size={16} />
          新对话
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => usePandaStore.getState().setKnowledgePanelOpen(true)}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="知识库"
          >
            <FileText size={16} />
          </button>
          <button
            onClick={() => usePandaStore.getState().setHistoryOpen(true)}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="历史记录"
          >
            <History size={16} />
          </button>
          <button
            onClick={() => usePandaStore.getState().setConfigOpen(true)}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="设置"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Chat messages + input */}
      <div className="flex-1 min-h-0">
        <ChatPanel />
      </div>

      {/* Modals */}
      <ConfigPanel />
      <HistoryPanel />
      <KnowledgePanel />
    </div>
  );
}
