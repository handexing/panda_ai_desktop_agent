import { useState, useRef, useEffect } from "react";
import { usePandaStore } from "../../stores/pandaStore";
import { streamChat } from "../../lib/tauri";

export function ChatInput() {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = usePandaStore((s) => s.isStreaming);
  const conversationId = usePandaStore((s) => s.currentConversationId);
  const setPandaState = usePandaStore((s) => s.setPandaState);

  useEffect(() => {
    if (!isStreaming && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isStreaming]);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg || !conversationId || isStreaming) return;
    setText("");
    setPandaState("thinking");
    try {
      await streamChat(conversationId, msg);
    } catch {
      setPandaState("error");
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
      <button
        onClick={handleSend}
        disabled={!text.trim() || isStreaming || !conversationId}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
      >
        {isStreaming ? "..." : "发送"}
      </button>
    </div>
  );
}
