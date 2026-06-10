import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

export function ChatPanel() {
  return (
    <div className="flex flex-col h-full">
      <MessageList />
      <ChatInput />
    </div>
  );
}
