import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Plus, Trash2, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface Reminder {
  id: string; title: string; description: string;
  remind_at: string | null; is_done: boolean; created_at: string;
}

const isMac = navigator.userAgent.includes("Mac");

export function ReminderWindow() {
  const win = getCurrentWindow();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [remindAt, setRemindAt] = useState("");

  const load = async () => {
    try {
      const r: Reminder[] = await invoke("list_reminders");
      setReminders(r);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!title) return;
    const remindStr = remindAt ? remindAt.replace("T", " ") + ":00" : null;
    await invoke("add_reminder", { title, description: desc, remindAt: remindStr });
    setTitle(""); setDesc(""); setRemindAt("");
    await load();
  };

  const handleDone = async (id: string) => {
    await invoke("mark_reminder_done", { id });
    await load();
  };

  const handleDelete = async (id: string) => {
    await invoke("delete_reminder", { id });
    await load();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 rounded-2xl overflow-hidden">
      <div className="relative flex items-center h-10 bg-gray-800/80 shrink-0 select-none" data-tauri-drag-region="true">
        {isMac && (
          <div className="flex items-center gap-1.5 pl-3">
            <button onClick={() => win.close()} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400" />
            <button onClick={() => win.minimize()} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400" />
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center text-sm text-white/70 font-medium pointer-events-none select-none">
          提醒
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Add form */}
        <div className="space-y-2 mb-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/5 text-white rounded-lg px-3 py-1.5 outline-none text-sm" placeholder="提醒标题" />
          <input value={desc} onChange={(e) => setDesc(e.target.value)}
            className="w-full bg-white/5 text-white rounded-lg px-3 py-1.5 outline-none text-sm" placeholder="描述（可选）" />
          <input value={remindAt} onChange={(e) => setRemindAt(e.target.value)} type="datetime-local"
            className="w-full bg-white/5 text-white rounded-lg px-3 py-1.5 outline-none text-sm" />
          <button onClick={handleAdd} disabled={!title}
            className="flex items-center gap-1 w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg">
            <Plus size={14} />添加提醒
          </button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {reminders.filter(r => !r.is_done).map(r => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
              <div className="min-w-0 flex-1">
                <div className="text-white/80 text-sm">{r.title}</div>
                {r.remind_at && <div className="text-white/40 text-xs">{r.remind_at}</div>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleDone(r.id)} className="text-white/30 hover:text-green-400 p-1">
                  <Check size={14} />
                </button>
                <button onClick={() => handleDelete(r.id)} className="text-white/30 hover:text-red-400 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
