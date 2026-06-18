import { useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { emit } from "@tauri-apps/api/event";
import { usePandaStore } from "../stores/pandaStore";
import { streamAgentChat, createConversation, ttsSpeak } from "../lib/tauri";

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
      store.setPandaState("idle");
      emit("panda:state", { state: "idle" });
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

  return { startVoiceChat, stopVoiceChat };
}
