import { useEffect, useRef, useState } from "react";
import { usePandaStore } from "../../stores/pandaStore";
import { createConversation, listConversations } from "../../lib/tauri";

interface MenuItem {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (...args: any[]) => void;
}

export function PandaContextMenu() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const items: MenuItem[] = [
    {
      label: "新对话",
      action: async () => {
        const conv = await createConversation("新对话");
        const store = usePandaStore.getState();
        store.setCurrentConversationId(conv.id);
        store.setMessages([]);
        store.setChatOpen(true);
        const list = await listConversations();
        store.setConversations(list);
        setVisible(false);
      },
    },
    {
      label: "API 配置",
      action: () => {
        usePandaStore.getState().setConfigOpen(true);
        setVisible(false);
      },
    },
    {
      label: "历史记录",
      action: () => {
        usePandaStore.getState().setHistoryOpen(true);
        setVisible(false);
      },
    },
    {
      label: "退出",
      action: async () => {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().close();
        setVisible(false);
      },
    },
  ];

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 border border-white/20 rounded-lg shadow-xl py-1 min-w-[140px]"
      style={{ left: pos.x, top: pos.y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
