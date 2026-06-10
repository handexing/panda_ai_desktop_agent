import { useEffect } from "react";
import { listen, emit } from "@tauri-apps/api/event";
import { usePandaStore } from "../stores/pandaStore";

export function useChat() {
  useEffect(() => {
    const unlistenToken = listen<{ conversation_id: string; token: string }>(
      "chat:token",
      (event) => {
        const store = usePandaStore.getState();
        if (event.payload.conversation_id !== store.currentConversationId) return;
        if (!store.isStreaming) {
          store.setIsStreaming(true);
        }
        store.appendToken(event.payload.token);
      },
    );

    const unlistenDone = listen<{ conversation_id: string }>(
      "chat:done",
      (event) => {
        const store = usePandaStore.getState();
        if (event.payload.conversation_id !== store.currentConversationId) return;
        const fullText = store.streamingText;
        store.addMessage({
          id: crypto.randomUUID(),
          conversation_id: event.payload.conversation_id,
          role: "assistant",
          content: fullText,
          created_at: new Date().toISOString(),
        });
        store.setStreamingText("");
        store.setIsStreaming(false);
        emit("panda:state", { state: "idle" });
      },
    );

    const unlistenError = listen<{
      conversation_id: string;
      message: string;
    }>("chat:error", (event) => {
      const store = usePandaStore.getState();
      if (event.payload.conversation_id !== store.currentConversationId) return;
      store.setStreamingText("");
      store.setIsStreaming(false);
      emit("panda:state", {
        state: "error",
        message: event.payload.message,
      });
    });

    return () => {
      unlistenToken.then((fn) => fn());
      unlistenDone.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, []);
}
