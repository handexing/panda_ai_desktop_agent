import { useRef, useEffect } from "react";
import { usePandaStore } from "../../stores/pandaStore";

export function MessageList() {
  const messages = usePandaStore((s) => s.messages);
  const streamingText = usePandaStore((s) => s.streamingText);
  const isStreaming = usePandaStore((s) => s.isStreaming);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-white/10 text-white/90"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}

      {isStreaming && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-white/10 text-white/90">
            {streamingText}
            <span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 animate-pulse" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
