import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { usePandaStore } from "../stores/pandaStore";

export function useChat() {
  const currentConversationId = usePandaStore((s) => s.currentConversationId);

  useEffect(() => {
    const unlistenToken = listen<{ conversation_id: string; token: string }>(
      "chat:token",
      (event) => {
        const store = usePandaStore.getState();
        if (event.payload.conversation_id === store.currentConversationId) {
          store.appendToken(event.payload.token);
        }
      },
    );

    const unlistenDone = listen<{ conversation_id: string }>(
      "chat:done",
      (event) => {
        const store = usePandaStore.getState();
        if (event.payload.conversation_id === store.currentConversationId) {
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
          store.setPandaState("idle");
        }
      },
    );

    const unlistenError = listen<{ conversation_id: string; message: string }>(
      "chat:error",
      (event) => {
        const store = usePandaStore.getState();
        if (event.payload.conversation_id === store.currentConversationId) {
          store.setStreamingText("");
          store.setIsStreaming(false);
          store.setPandaState("error");
          store.setErrorMessage(event.payload.message);
          setTimeout(() => store.setErrorMessage(null), 5000);
        }
      },
    );

    return () => {
      unlistenToken.then((fn) => fn());
      unlistenDone.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, [currentConversationId]);
}
