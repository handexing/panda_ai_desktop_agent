import { useEffect } from "react";
import { getCurrentWindow, primaryMonitor, PhysicalPosition } from "@tauri-apps/api/window";
import { usePandaStore } from "../stores/pandaStore";

function isImageFile(filePath: string): boolean {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  return ["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(ext);
}

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
          store.setPandaState("executing");

          const {
            createConversation,
            listConversations,
            extractFileText,
            streamAgentChat,
            imageToBase64,
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
            const [pos, monitor] = await Promise.all([
              win.outerPosition(),
              primaryMonitor(),
            ]);
            // Create centered so it's visible, then move below the panda
            const chatWin = new WebviewWindow("chat", {
              url: `/?view=chat&convId=${convId}`,
              title: "Panda AI",
              width: 600,
              height: 600,
              center: true,
              decorations: false,
              transparent: true,
              resizable: true,
            });
            // Position centered below the panda's bottom edge
            const targetX = Math.round(pos.x + (220 - 600) / 2);
            const targetY = Math.round(pos.y + 220);
            // Clamp within monitor
            let clampedX = targetX;
            let clampedY = targetY;
            if (monitor) {
              clampedX = Math.round(Math.max(0, Math.min(targetX, monitor.size.width - 600)));
              clampedY = Math.round(Math.max(0, Math.min(targetY, monitor.size.height - 600)));
            }
            // Move window after creation
            requestAnimationFrame(() => {
              chatWin.setPosition(new PhysicalPosition(clampedX, clampedY)).catch(console.error);
            });
          }

          if (isImageFile(filePath)) {
            const b64 = await imageToBase64(filePath);
            store.setPandaState("thinking");
            const { streamMultimodalChat } = await import("../lib/tauri");
            streamMultimodalChat(convId, "请分析这张图片", [b64]).catch(console.error);
          } else {
            store.setPandaState("thinking");
            const text = await extractFileText(filePath);
            streamAgentChat(convId, `请分析以下文件内容：\n\n${text}`).catch(console.error);
          }
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
