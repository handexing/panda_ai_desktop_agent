import { usePandaStore } from "../../stores/pandaStore";
import { ChatPanel } from "../chat/ChatPanel";

interface PandaOverlayProps {
  onCollapse: () => void;
}

export function PandaOverlay({ onCollapse }: PandaOverlayProps) {
  const chatOpen = usePandaStore((s) => s.chatOpen);

  if (!chatOpen) return null;

  return (
    <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm flex flex-col z-10">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
        <button
          onClick={onCollapse}
          className="text-white/60 hover:text-white text-sm"
        >
          ← 收起
        </button>
        <span className="text-white/80 text-sm font-medium">Panda AI</span>
        <button
          onClick={() => usePandaStore.getState().setConfigOpen(true)}
          className="text-white/60 hover:text-white text-sm"
        >
          ⚙
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <ChatPanel />
      </div>
    </div>
  );
}
