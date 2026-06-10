import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { usePandaStore } from "../stores/pandaStore";

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
          store.setPandaState("thinking");

          const {
            createConversation,
            listConversations,
            extractFileText,
            streamChat,
          } = await import("../lib/tauri");
          const conv = await createConversation("文件分析");
          const convId = conv.id;
          store.setCurrentConversationId(convId);
          store.setConversations(await listConversations());

          // Open or focus the chat window with this conversation
          const { WebviewWindow } = await import(
            "@tauri-apps/api/webviewWindow"
          );
          const existing = await WebviewWindow.getByLabel("chat");
          if (existing) {
            const { emit } = await import("@tauri-apps/api/event");
            await emit("chat:set-conversation", { conversationId: convId });
            await existing.setFocus();
          } else {
            new WebviewWindow("chat", {
              url: `/?view=chat&convId=${convId}`,
              title: "Panda AI",
              width: 400,
              height: 600,
              center: true,
              decorations: false,
              resizable: true,
            });
          }

          const text = await extractFileText(filePath);
          streamChat(convId, `请分析以下文件内容：\n\n${text}`).catch(() => {
            store.setPandaState("error");
          });
        });
      } catch (e) {
        console.warn("File drop not available:", e);
      }
    };

    setup();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}
