import { useEffect, useState } from "react";
import { usePandaStore } from "../../stores/pandaStore";
import {
  listConversations,
  getMessages,
  deleteConversation,
} from "../../lib/tauri";
import type { Conversation } from "../../lib/tauri";

export function HistoryPanel() {
  const open = usePandaStore((s) => s.historyOpen);
  const setOpen = usePandaStore((s) => s.setHistoryOpen);
  const storeConversations = usePandaStore((s) => s.conversations);
  const setStoreConversations = usePandaStore((s) => s.setConversations);
  const setCurrentConversationId = usePandaStore((s) => s.setCurrentConversationId);
  const setMessages = usePandaStore((s) => s.setMessages);
  const setChatOpen = usePandaStore((s) => s.setChatOpen);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      listConversations()
        .then(setStoreConversations)
        .finally(() => setLoading(false));
    }
  }, [open, setStoreConversations]);

  const handleSelect = async (conv: Conversation) => {
    setCurrentConversationId(conv.id);
    const msgs = await getMessages(conv.id);
    setMessages(msgs);
    setChatOpen(true);
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    const list = await listConversations();
    setStoreConversations(list);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-gray-800 rounded-2xl p-6 w-[90vw] max-w-md mx-auto max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-medium">历史记录</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-white/60 hover:text-white text-sm"
          >
            关闭
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading && <p className="text-white/40 text-sm">加载中...</p>}
          {!loading && storeConversations.length === 0 && (
            <p className="text-white/40 text-sm">暂无对话记录</p>
          )}
          {storeConversations.map((conv) => (
            <div
              key={conv.id}
              className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2"
            >
              <button
                onClick={() => handleSelect(conv)}
                className="flex-1 text-left text-white/80 hover:text-white text-sm truncate"
              >
                {conv.title}
              </button>
              <button
                onClick={() => handleDelete(conv.id)}
                className="text-red-400/60 hover:text-red-400 text-xs shrink-0"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
