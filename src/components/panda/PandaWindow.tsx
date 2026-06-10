import { useEffect } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { usePandaStore } from "../../stores/pandaStore";
import { createConversation } from "../../lib/tauri";
import { PandaSprite } from "./PandaSprite";
import { PandaOverlay } from "./PandaOverlay";
import { PandaContextMenu } from "./PandaContextMenu";
import { ConfigPanel } from "../config/ConfigPanel";
import { HistoryPanel } from "../history/HistoryPanel";
import { useFileDrop } from "../../hooks/useFileDrop";

export function PandaWindow() {
  const pandaState = usePandaStore((s) => s.pandaState);
  const chatOpen = usePandaStore((s) => s.chatOpen);
  const errorMessage = usePandaStore((s) => s.errorMessage);

  // Initialize file drop handler
  useFileDrop();

  const handleClick = async () => {
    const store = usePandaStore.getState();
    if (!store.chatOpen) {
      if (!store.currentConversationId) {
        const conv = await createConversation("新对话");
        store.setCurrentConversationId(conv.id);
        const { listConversations } = await import("../../lib/tauri");
        store.setConversations(await listConversations());
      }
      try {
        await getCurrentWindow().setSize(new LogicalSize(400, 600));
      } catch (e) {
        // Window resize might fail in some environments
      }
      store.setChatOpen(true);
    }
  };

  // Auto-reset error animation after 3s
  useEffect(() => {
    if (pandaState === "error") {
      const timer = setTimeout(() => {
        usePandaStore.getState().setPandaState("idle");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pandaState]);

  // Set mouse-through when chat is closed
  useEffect(() => {
    const win = getCurrentWindow();
    if (chatOpen) {
      win.setIgnoreCursorEvents(false);
    } else {
      win.setIgnoreCursorEvents(true);
    }
  }, [chatOpen]);

  return (
    <div className="relative w-screen h-screen select-none">
      {/* Clickable area (only when chat is closed) */}
      {!chatOpen && (
        <div
          className="absolute inset-0 z-10"
          onClick={handleClick}
        />
      )}

      {/* Panda sprite */}
      <div className="flex flex-col items-center justify-center h-full pt-4">
        <PandaSprite state={pandaState} />
        {errorMessage && (
          <p className="text-red-400 text-xs mt-2 px-4 text-center">
            {errorMessage}
          </p>
        )}
      </div>

      {/* Chat overlay */}
      <PandaOverlay />

      {/* Context menu */}
      <PandaContextMenu />

      {/* Config panel */}
      <ConfigPanel />

      {/* History panel */}
      <HistoryPanel />
    </div>
  );
}
