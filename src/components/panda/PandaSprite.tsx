import type { PandaState } from "../../stores/pandaStore";

interface PandaSpriteProps {
  state: PandaState;
  width?: number;
}

export function PandaSprite({ state, width = 200 }: PandaSpriteProps) {
  const isUpset = state === "error" || state === "angry";

  return (
    <div
      className="relative overflow-hidden"
      style={{ width, height: width }}
      data-tauri-drag-region="true"
    >
      <img
        src="/sprites/pet.gif"
        alt="panda"
        className={`w-full h-full object-contain pointer-events-none ${isUpset ? "brightness-75" : ""}`}
        data-tauri-drag-region="true"
      />
      {isUpset && (
        <div className="absolute inset-0 bg-red-500/10 rounded-full pointer-events-none" />
      )}
    </div>
  );
}
