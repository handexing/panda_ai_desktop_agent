import { useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { KnowledgeContent } from "./KnowledgeContent";

const isMac = navigator.userAgent.includes("Mac");

export function KnowledgeWindow() {
  const win = getCurrentWindow();

  const handleClose = useCallback(() => win.close(), [win]);
  const handleMinimize = useCallback(() => win.minimize(), [win]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 rounded-2xl overflow-hidden">
      {/* Title bar */}
      <div
        className="relative flex items-center h-10 bg-gray-800/80 shrink-0 select-none"
        data-tauri-drag-region="true"
      >
        {isMac && (
          <div className="flex items-center gap-1.5 pl-3">
            <button
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 active:bg-red-600"
            />
            <button
              onClick={handleMinimize}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600"
            />
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center text-sm text-white/70 font-medium pointer-events-none select-none">
          知识库
        </span>
      </div>

      {/* Content */}
      <KnowledgeContent />
    </div>
  );
}
