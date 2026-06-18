import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { emit } from "@tauri-apps/api/event";
import { usePandaStore } from "../stores/pandaStore";
import type { TraceStep } from "../lib/tauri";

export function useAgent() {
  useEffect(() => {
    const unlistenTrace = listen<{ step: TraceStep }>(
      "agent:trace",
      (event) => {
        const store = usePandaStore.getState();
        store.addTraceStep(event.payload.step);

        if (event.payload.step.type === "done") {
          const detail = event.payload.step.detail as { text: string } | undefined;
          const text = detail?.text || "";
          // Store reply text for voice bubble
          store.setReplyText(text);
          // Add agent response as a message
          store.addMessage({
            id: crypto.randomUUID(),
            conversation_id: store.currentConversationId || "",
            role: "assistant",
            content: text,
            created_at: new Date().toISOString(),
          });
          store.setIsStreaming(false);
          store.clearTraceSteps();
          store.setPandaState("idle");
          emit("panda:state", { state: "idle" });

          // TTS: auto-speak response if voice is enabled or in voice chat mode
          if (text) {
            if (store.voiceEnabled || store.voiceActive) {
              import("../lib/tauri").then(({ ttsSpeak }) => {
                store.setPandaState("talking");
                emit("panda:state", { state: "talking" });
                ttsSpeak(text).then((audioUrl) => {
                  const audio = new Audio(audioUrl);
                  audio.onended = () => {
                    if (store.voiceActive) {
                      store.setPandaState("idle");
                      store.setVoiceActive(false);
                      store.setTranscriptText(null);
                      store.setReplyText("");
                      emit("panda:state", { state: "idle" });
                    }
                  };
                  audio.play().catch(() => {
                    if (store.voiceActive) {
                      store.setPandaState("idle");
                      store.setVoiceActive(false);
                      store.setTranscriptText(null);
                      store.setReplyText("");
                      emit("panda:state", { state: "idle" });
                    }
                  });
                }).catch(() => {
                  if (store.voiceActive) {
                    store.setPandaState("idle");
                    store.setVoiceActive(false);
                    store.setTranscriptText(null);
                    store.setReplyText("");
                    emit("panda:state", { state: "idle" });
                  }
                });
              });
            }
          }
        }

        if (event.payload.step.type === "error") {
          const detail = event.payload.step.detail as { message: string } | undefined;
          const msg = detail?.message || "未知错误";
          store.addMessage({
            id: crypto.randomUUID(),
            conversation_id: store.currentConversationId || "",
            role: "assistant",
            content: `❌ ${msg}`,
            created_at: new Date().toISOString(),
          });
          store.setIsStreaming(false);
          store.clearTraceSteps();
          store.setPandaState("idle");
          emit("panda:state", { state: "error", message: msg });
        }
      },
    );

    // Also listen for agent:error events (emitted on setup failures)
    const unlistenError = listen<{ step: TraceStep }>(
      "agent:error",
      (event) => {
        const store = usePandaStore.getState();
        const detail = event.payload.step.detail as { message: string } | undefined;
        const msg = detail?.message || "Agent 错误";
        store.addMessage({
          id: crypto.randomUUID(),
          conversation_id: store.currentConversationId || "",
          role: "assistant",
          content: `❌ ${msg}`,
          created_at: new Date().toISOString(),
        });
        store.setIsStreaming(false);
        store.clearTraceSteps();
        store.setPandaState("idle");
      },
    );

    return () => {
      unlistenTrace.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, []);
}
