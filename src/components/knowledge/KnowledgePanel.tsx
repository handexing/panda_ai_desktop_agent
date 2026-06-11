import { X } from "lucide-react";
import { usePandaStore } from "../../stores/pandaStore";
import { KnowledgeContent } from "./KnowledgeContent";

export function KnowledgePanel() {
  const knowledgePanelOpen = usePandaStore((s) => s.knowledgePanelOpen);
  const setKnowledgePanelOpen = usePandaStore((s) => s.setKnowledgePanelOpen);

  if (!knowledgePanelOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex pointer-events-auto">
      <div className="flex-1" onClick={() => setKnowledgePanelOpen(false)} />
      <div className="w-80 bg-gray-900 border-l border-white/10 flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-white font-medium text-sm">知识库</h2>
          <button
            onClick={() => setKnowledgePanelOpen(false)}
            className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <KnowledgeContent />
      </div>
    </div>
  );
}
