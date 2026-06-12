import { useState, useRef, useEffect } from "react";
import { emit } from "@tauri-apps/api/event";
import { Mic, MicOff } from "lucide-react";
import { usePandaStore } from "../../stores/pandaStore";
import { createConversation, streamAgentChat } from "../../lib/tauri";

export function ChatInput() {
  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = usePandaStore((s) => s.isStreaming);
  const setIsStreaming = usePandaStore((s) => s.setIsStreaming);
  const [listening, setListening] = useState(false);
  const voiceEnabled = usePandaStore((s) => s.voiceEnabled);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  useEffect(() => {
    if (!isStreaming && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isStreaming]);

  const getOrCreateConversation = async (): Promise<string | null> => {
    let id = usePandaStore.getState().currentConversationId;
    if (id) return id;
    if (creating) return null;
    setCreating(true);
    try {
      const conv = await createConversation("新对话");
      usePandaStore.getState().setCurrentConversationId(conv.id);
      return conv.id;
    } catch {
      return null;
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg || isStreaming) return;
    const convId = await getOrCreateConversation();
    if (!convId) return;
    // Optimistically show user message
    const store = usePandaStore.getState();
    store.addMessage({
      id: crypto.randomUUID(),
      conversation_id: convId,
      role: "user",
      content: msg,
      created_at: new Date().toISOString(),
    });
    setText("");
    setIsStreaming(true);
    emit("panda:state", { state: "thinking" });
    try {
      await streamAgentChat(convId, msg);
    } catch {
      setIsStreaming(false);
      emit("panda:state", { state: "error" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 border-t border-white/10 p-3">
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息..."
        rows={1}
        disabled={isStreaming}
        className="flex-1 bg-white/5 text-white text-sm rounded-lg px-3 py-2 outline-none resize-none placeholder-white/30 disabled:opacity-50"
      />
      {voiceEnabled && (
        <button
          onClick={startListening}
          disabled={listening}
          className={`p-2 rounded-lg transition-colors ${
            listening ? "text-red-400 bg-red-500/10" : "text-white/50 hover:text-white hover:bg-white/10"
          }`}
          title="语音输入"
        >
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      )}
      <button
        onClick={handleSend}
        disabled={!text.trim() || isStreaming || creating}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
      >
        {isStreaming ? "..." : "发送"}
      </button>
    </div>
  );
}
