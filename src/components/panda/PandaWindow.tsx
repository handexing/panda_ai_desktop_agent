import { useEffect, useCallback, useRef, useState } from "react";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PawPrint, MessageCircle, Settings, History, LogOut } from "lucide-react";
import { usePandaStore } from "../../stores/pandaStore";
import { PandaSprite } from "./PandaSprite";
import { PetSpeechBubble } from "./PetSpeechBubble";
import { RadialMenu } from "./RadialMenu";
import { useFileDrop } from "../../hooks/useFileDrop";
import { usePandaEvents } from "../../hooks/usePandaEvents";

export function PandaWindow() {
  const pandaState = usePandaStore((s) => s.pandaState);
  const setPandaState = usePandaStore((s) => s.setPandaState);
  const errorMessage = usePandaStore((s) => s.errorMessage);
  const menuWasOpenRef = useRef(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useFileDrop();
  usePandaEvents();

  // Auto-reset error/angry state after animation finishes
  useEffect(() => {
    if (pandaState === "error" || pandaState === "angry") {
      const timer = setTimeout(() => {
        usePandaStore.getState().setPandaState("idle");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pandaState]);

  // Open/focus chat window
  const openChatWindow = useCallback(async () => {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const existing = await WebviewWindow.getByLabel("chat");
      if (existing) {
        await existing.setFocus();
        return;
      }

      new WebviewWindow("chat", {
        url: "/?view=chat",
        title: "Panda AI",
        width: 600,
        height: 600,
        center: true,
        decorations: false,
        transparent: true,
        resizable: true,
      });
    } catch (e) {
      console.error("Failed to create chat window:", e);
    }
  }, []);

  // Open chat window and show config panel
  const openConfigWindow = useCallback(async () => {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const existing = await WebviewWindow.getByLabel("chat");
      if (existing) {
        await emit("panel:open", { panel: "config" });
        await existing.setFocus();
      } else {
        new WebviewWindow("chat", {
          url: "/?view=chat",
          title: "Panda AI",
          width: 400,
          height: 600,
          center: true,
          decorations: false,
          resizable: true,
        });
        setTimeout(() => emit("panel:open", { panel: "config" }), 500);
      }
    } catch (e) {
      console.error("Failed to create chat window:", e);
    }
  }, []);

  // Open chat window and show history panel
  const openHistoryWindow = useCallback(async () => {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const existing = await WebviewWindow.getByLabel("chat");
      if (existing) {
        await emit("panel:open", { panel: "history" });
        await existing.setFocus();
      } else {
        new WebviewWindow("chat", {
          url: "/?view=chat",
          title: "Panda AI",
          width: 400,
          height: 600,
          center: true,
          decorations: false,
          resizable: true,
        });
        setTimeout(() => emit("panel:open", { panel: "history" }), 500);
      }
    } catch (e) {
      console.error("Failed to create chat window:", e);
    }
  }, []);

  // Quit the app
  const quit = useCallback(async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error("Failed to quit:", e);
    }
  }, []);

  // Interactive play with the pet
  const interact = useCallback(async () => {
    setPandaState("raisepaw");
    await new Promise((r) => setTimeout(r, 1200));
    setPandaState("happy");
    await new Promise((r) => setTimeout(r, 1200));
    setPandaState("idle");
  }, [setPandaState]);

  const radialMenuItems = [
    { icon: <PawPrint size={18} />, label: "互动", action: interact },
    { icon: <MessageCircle size={18} />, label: "聊天", action: openChatWindow },
    { icon: <Settings size={18} />, label: "配置", action: openConfigWindow },
    { icon: <History size={18} />, label: "历史", action: openHistoryWindow },
    { icon: <LogOut size={18} />, label: "退出", action: quit },
  ];

  const handleMenuClose = useCallback(() => {
    menuWasOpenRef.current = false;
    setMenuVisible(false);
  }, []);

  // Click to open menu (drag is handled natively by data-tauri-drag-region)
  const handleClick = useCallback(() => {
    const wasOpen = menuWasOpenRef.current;
    if (wasOpen) {
      menuWasOpenRef.current = false;
      setMenuVisible(false);
    } else {
      setMenuVisible(true);
      menuWasOpenRef.current = true;
    }
  }, []);

  return (
    <div className="relative w-screen h-screen select-none overflow-hidden pointer-events-none ">
      {/* Panda sprite (native drag region + click to open menu) */}
      <div className="flex flex-col items-center justify-center h-full pt-10 pointer-events-auto">
        <div
          className="relative outline-none"
          onClick={handleClick}
          data-tauri-drag-region="true"
        >
          <PetSpeechBubble state={pandaState} />
          <PandaSprite state={pandaState} width={140} />
        </div>
        {errorMessage && (
          <p className="text-red-400 text-xs mt-2 px-4 text-center">
            {errorMessage}
          </p>
        )}
      </div>

      {/* Radial menu */}
      {menuVisible && (
        <RadialMenu items={radialMenuItems} onClose={handleMenuClose} />
      )}
    </div>
  );
}
