import { useRef, useEffect } from "react";
import type { PandaState } from "../../stores/pandaStore";

interface SpriteConfig {
  cols: number;
  rows: number;
  fps: number;
  loop: boolean;
}

const SPRITE_CONFIGS: Record<PandaState, SpriteConfig> = {
  idle: { cols: 4, rows: 1, fps: 8, loop: true },
  thinking: { cols: 4, rows: 1, fps: 6, loop: true },
  error: { cols: 2, rows: 1, fps: 4, loop: false },
};

const SPRITE_SHEETS: Record<PandaState, string> = {
  idle: "/sprites/idle.png",
  thinking: "/sprites/thinking.png",
  error: "/sprites/error.png",
};

interface PandaSpriteProps {
  state: PandaState;
  width?: number;
  height?: number;
}

export function PandaSprite({ state, width = 200, height = 200 }: PandaSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const config = SPRITE_CONFIGS[state];
    const img = new Image();
    img.src = SPRITE_SHEETS[state];
    let stopped = false;

    img.onload = () => {
      const frameWidth = img.width / config.cols;
      const frameHeight = img.height / config.rows;
      const frameDelay = 1000 / config.fps;
      let lastTime = 0;
      frameRef.current = 0;

      function render(timestamp: number) {
        if (stopped) return;
        if (timestamp - lastTime >= frameDelay) {
          lastTime = timestamp;
          const col = frameRef.current % config.cols;
          const row = Math.floor(frameRef.current / config.cols) % config.rows;
          ctx!.clearRect(0, 0, width, height);
          ctx!.drawImage(
            img,
            col * frameWidth,
            row * frameHeight,
            frameWidth,
            frameHeight,
            0,
            0,
            width,
            height,
          );
          frameRef.current++;
          const totalFrames = config.cols * config.rows;
          if (!config.loop && frameRef.current >= totalFrames) {
            return;
          }
          frameRef.current %= totalFrames;
        }
        animFrameRef.current = requestAnimationFrame(render);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    // Handle image load error — show a simple text fallback or empty canvas
    img.onerror = () => {
      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = "#666";
      ctx!.font = "14px sans-serif";
      ctx!.textAlign = "center";
      ctx!.fillText("🐼", width / 2, height / 2);
    };

    return () => {
      stopped = true;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [state, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="block"
      style={{ width, height }}
    />
  );
}
