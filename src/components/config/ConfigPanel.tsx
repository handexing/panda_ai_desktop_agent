import { usePandaStore } from "../../stores/pandaStore";
import { ConfigFormContent } from "./ConfigFormContent";

export function ConfigPanel() {
  const open = usePandaStore((s) => s.configOpen);
  const setOpen = usePandaStore((s) => s.setConfigOpen);
  const setKnowledgePanelOpen = usePandaStore((s) => s.setKnowledgePanelOpen);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center pointer-events-auto">
      <div className="bg-gray-800 rounded-2xl p-6 w-[90vw] max-w-md mx-auto max-h-[85vh] flex flex-col">
        <h2 className="text-white text-lg font-medium mb-4 shrink-0">API 配置</h2>
        <div className="overflow-y-auto flex-1 min-h-0">
          <ConfigFormContent
            onManageKnowledge={() => {
              setKnowledgePanelOpen(true);
              setOpen(false);
            }}
          />
        </div>
        <div className="shrink-0 mt-3">
          <button
            onClick={() => setOpen(false)}
            className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-sm rounded-lg transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
