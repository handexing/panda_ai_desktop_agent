import { useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ConfigFormContent } from "./ConfigFormContent";

const isMac = navigator.userAgent.includes("Mac");

export function ConfigWindow() {
  const win = getCurrentWindow();

  const handleClose = useCallback(() => win.close(), [win]);
  const handleMinimize = useCallback(() => win.minimize(), [win]);

  const handleManageKnowledge = useCallback(async () => {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const existing = await WebviewWindow.getByLabel("knowledge");
    if (existing) {
      await existing.setFocus();
      return;
    }
    new WebviewWindow("knowledge", {
      url: "/?view=knowledge",
      title: "Panda AI - 知识库",
      width: 380,
      height: 500,
      center: true,
      decorations: false,
      transparent: true,
      resizable: true,
    });
    win.close();
  }, [win]);

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
          Panda AI
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="text-white text-lg font-medium mb-4">API 配置</h2>
        <ConfigFormContent onManageKnowledge={handleManageKnowledge} />
      </div>
    </div>
  );
}
