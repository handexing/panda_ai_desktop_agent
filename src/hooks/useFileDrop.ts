import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { usePandaStore } from "../stores/pandaStore";
import {
  extractFileText,
  createConversation,
  streamChat,
  listConversations,
} from "../lib/tauri";

export function useFileDrop() {
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      try {
        const win = getCurrentWindow();
        unlisten = await win.onDragDropEvent(async (event) => {
          if (event.payload.type !== "drop") return;
          const filePath = event.payload.paths[0];
          if (!filePath) return;

          const store = usePandaStore.getState();
          let convId = store.currentConversationId;
          if (!convId) {
            const conv = await createConversation("文件分析");
            convId = conv.id;
            store.setCurrentConversationId(convId);
            store.setConversations(await listConversations());
          }

          store.setPandaState("thinking");
          const text = await extractFileText(filePath);

          if (!store.chatOpen) {
            try {
              const { LogicalSize } = await import("@tauri-apps/api/dpi");
              await getCurrentWindow().setSize(new LogicalSize(400, 600));
            } catch {
              // Window resize might fail in some environments
            }
            store.setChatOpen(true);
          }

          streamChat(convId, `请分析以下文件内容：\n\n${text}`).catch(() => {
            store.setPandaState("error");
          });
        });
      } catch (e) {
        // onDragDropEvent might not be supported on all platforms
        console.warn("File drop not available:", e);
      }
    };

    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}
