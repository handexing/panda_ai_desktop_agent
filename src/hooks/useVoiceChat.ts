import { useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { emit } from "@tauri-apps/api/event";
import { usePandaStore } from "../stores/pandaStore";
import { streamAgentChat, createConversation } from "../lib/tauri";
import type { TraceStep } from "../lib/tauri";

interface VoiceTranscriptEvent {
  text: string;
  is_final: boolean;
}

export function useVoiceChat() {
  const isRunning = useRef(false);
  const voiceConversationId = useRef<string | null>(null);

  const startVoiceChat = useCallback(async () => {
    if (isRunning.current) return;
    isRunning.current = true;

    const store = usePandaStore.getState();

    try {
      // 1. Set listening state
      store.setVoiceActive(true);
      store.setTranscriptText(null);
      store.setReplyText("");
      store.setErrorMessage(null);
      store.setPandaState("listening");
      emit("panda:state", { state: "listening" });

      // 2. Call voice_chat (blocking — records, VAD, STT, then returns text)
      const text: string = await invoke("voice_chat");

      if (!text || !text.trim()) {
        store.setPandaState("idle");
        emit("panda:state", { state: "idle" });
        isRunning.current = false;
        store.setVoiceActive(false);
        return;
      }

      // 3. Store transcript
      store.setTranscriptText(text);
      store.setPandaState("thinking");
      emit("panda:state", { state: "thinking" });

      // 4. Get or create voice conversation
      if (!voiceConversationId.current) {
        const conv = await createConversation("语音对话");
        voiceConversationId.current = conv.id;
      }
      store.setCurrentConversationId(voiceConversationId.current);
      store.addMessage({
        id: crypto.randomUUID(),
        conversation_id: voiceConversationId.current,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      });

      // 5. Call agent — response comes through trace events
      await streamAgentChat(voiceConversationId.current, text);

    } catch (e) {
      console.error("Voice chat failed:", e);
      const msg = typeof e === "string" ? e : "语音对话失败";
      store.setErrorMessage(msg);
      store.setPandaState("error");
      store.setVoiceActive(false);
      emit("panda:state", { state: "error", message: msg });
    } finally {
      isRunning.current = false;
    }
  }, []);

  const stopVoiceChat = useCallback(() => {
    invoke("cancel_voice_chat").catch(() => {});
    const store = usePandaStore.getState();
    store.setPandaState("idle");
    store.setTranscriptText(null);
    store.setReplyText("");
    store.setVoiceActive(false);
    isRunning.current = false;
  }, []);

  // Listen for voice:state events from backend
  useEffect(() => {
    const unlisten1 = listen<{ state: string }>("voice:state", (event) => {
      const store = usePandaStore.getState();
      const state = event.payload.state;
      store.setPandaState(state as any);
    });

    const unlisten2 = listen<VoiceTranscriptEvent>("voice:transcript", (event) => {
      const store = usePandaStore.getState();
      if (event.payload.is_final) {
        store.setTranscriptText(event.payload.text);
      }
    });

    return () => {
      unlisten1.then((fn) => fn());
      unlisten2.then((fn) => fn());
    };
  }, []);

  // Listen for agent trace/error events (needed because useAgent is in ChatWindow,
  // which is a separate Tauri window — not mounted during voice chat)
  useEffect(() => {
    const unlistenTrace = listen<{ step: TraceStep }>(
      "agent:trace",
      (event) => {
        const store = usePandaStore.getState();
        if (!store.voiceActive) return;

        if (event.payload.step.type === "done") {
          const detail = event.payload.step.detail as { text: string } | undefined;
          const text = detail?.text || "";
          // Add AI response to store for chat window to show
          store.addMessage({
            id: crypto.randomUUID(),
            conversation_id: store.currentConversationId || "",
            role: "assistant",
            content: text,
            created_at: new Date().toISOString(),
          });
          store.setIsStreaming(false);
          store.clearTraceSteps();

          // Open/focus chat window so user sees the conversation
          import("@tauri-apps/api/webviewWindow").then(({ WebviewWindow }) => {
            WebviewWindow.getByLabel("chat").then((existing) => {
              if (existing) { existing.setFocus(); return; }
              const convId = voiceConversationId.current || store.currentConversationId || "";
              new WebviewWindow("chat", {
                url: `/?view=chat&convId=${encodeURIComponent(convId)}`,
                title: "Panda AI",
                width: 600, height: 600, center: true,
                decorations: false, transparent: true, resizable: true,
              });
            });
          });

          if (text) {
            import("../lib/tauri").then(({ ttsSpeak }) => {
              store.setPandaState("talking");
              emit("panda:state", { state: "talking" });
              ttsSpeak(text).then((audioUrl) => {
                const audio = new Audio(audioUrl);
                audio.onended = () => {
                  store.setPandaState("idle");
                  store.setVoiceActive(false);
                  store.setTranscriptText(null);
                  store.setReplyText("");
                  emit("panda:state", { state: "idle" });
                };
                audio.play().catch(() => {
                  store.setPandaState("idle");
                  store.setVoiceActive(false);
                  store.setTranscriptText(null);
                  store.setReplyText("");
                  emit("panda:state", { state: "idle" });
                });
              }).catch(() => {
                store.setPandaState("idle");
                store.setVoiceActive(false);
                store.setTranscriptText(null);
                store.setReplyText("");
                emit("panda:state", { state: "idle" });
              });
            });
          } else {
            store.setPandaState("idle");
            store.setVoiceActive(false);
            store.setTranscriptText(null);
            store.setReplyText("");
            emit("panda:state", { state: "idle" });
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
          store.setVoiceActive(false);
          store.setTranscriptText(null);
          store.setReplyText("");
          emit("panda:state", { state: "error", message: msg });
        }
      },
    );

    const unlistenError = listen<{ step: TraceStep }>(
      "agent:error",
      (event) => {
        const store = usePandaStore.getState();
        if (!store.voiceActive) return;

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
        store.setVoiceActive(false);
        store.setTranscriptText(null);
        store.setReplyText("");
        emit("panda:state", { state: "error", message: msg });
      },
    );

    return () => {
      unlistenTrace.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, []);

  // Global shortcut: Option+Space (Mac) / Alt+Space (Windows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey || e.metaKey) && e.code === "Space") {
        e.preventDefault();
        if (isRunning.current) {
          stopVoiceChat();
        } else {
          startVoiceChat();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startVoiceChat, stopVoiceChat]);

  return { startVoiceChat, stopVoiceChat };
}
