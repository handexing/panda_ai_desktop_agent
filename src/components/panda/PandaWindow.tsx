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

  // Open standalone config window
  const openConfigWindow = useCallback(async () => {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const existing = await WebviewWindow.getByLabel("config");
      if (existing) {
        await existing.setFocus();
        return;
      }
      new WebviewWindow("config", {
        url: "/?view=config",
        title: "Panda AI - 配置",
        width: 400,
        height: 560,
        center: true,
        decorations: false,
        transparent: true,
        resizable: true,
      });
    } catch (e) {
      console.error("Failed to create config window:", e);
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

  const interactPhrases = [
    "嘤嘤嘤~ 要抱抱！",
    "今天也要加油鸭~",
    "摸摸头，好舒服~",
    "竹子真好吃，嘎嘣脆！",
    "主人最好了！（蹭蹭）",
    "困了…让我趴一会儿…",
    "哇！有好吃的不给我？",
    "翻滚翻滚~ 滚滚来啦！",
    "嘿嘿，偷偷看你呢~",
    "今天天气真好，想出去玩！",
    "不理你的话我会生气的！",
    "呼呼…正在充电中…",
    "听说你喜欢熊猫？（害羞）",
    "给你一个大大的熊猫抱！",
    "吃饱了，打个滚消化一下~",
    "嘿！吓到你了吗？",
    "做你的桌面宠物真幸福~",
    "竹子味冰淇淋了解一下？",
    "别看我现在懒，爬树可厉害了！",
    "嘘…在装死，别打扰我~",
  ];

  // Interactive play — uses speechText only, no STATE_BUBBLES interference
  const interact = useCallback(async () => {
    const phrase = interactPhrases[Math.floor(Math.random() * interactPhrases.length)];
    usePandaStore.getState().setSpeechText(phrase);
    await new Promise((r) => setTimeout(r, 2500));
    usePandaStore.getState().setSpeechText(null);
  }, []);

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
