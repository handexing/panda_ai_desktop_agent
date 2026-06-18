import { useState } from "react";
import type { PandaState } from "../../stores/pandaStore";

interface VoiceWaveProps {
  state: PandaState;
}

export function VoiceWave({ state }: VoiceWaveProps) {
  const [bars] = useState(() => Array.from({ length: 5 }, (_, i) => i));

  if (state === "idle" || state === "thinking") return null;

  const getAnimationClass = () => {
    switch (state) {
      case "listening": return "animate-wave-listening";
      case "recording": return "animate-wave-recording";
      case "talking":   return "animate-wave-talking";
      default: return "";
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="flex items-center gap-[3px]">
        {bars.map((i) => (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-150 ${getAnimationClass()}`}
            style={{
              height: state === "listening" ? "8px" : "12px",
              backgroundColor: state === "recording" ? "#22c55e"
                            : state === "talking" ? "#3b82f6"
                            : "#6b7280",
              animationDelay: `${i * 0.1}s`,
              animationDuration: state === "recording" ? "0.4s" : "1.2s",
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes wave-recording {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(2.0); }
        }
        @keyframes wave-listening {
          0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
          50% { transform: scaleY(1.0); opacity: 1; }
        }
        @keyframes wave-talking {
          0%, 100% { transform: scaleY(0.6); }
          30% { transform: scaleY(1.2); }
          60% { transform: scaleY(0.8); }
        }
        .animate-wave-recording { animation: wave-recording 0.4s ease-in-out infinite; }
        .animate-wave-listening { animation: wave-listening 1.2s ease-in-out infinite; }
        .animate-wave-talking { animation: wave-talking 0.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
