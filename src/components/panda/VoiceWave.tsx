import type { PandaState } from "../../stores/pandaStore";

interface VoiceWaveProps {
  state: PandaState;
}

export function VoiceWave({ state }: VoiceWaveProps) {
  if (state !== "listening" && state !== "recording" && state !== "talking") return null;

  const isRecording = state === "recording";
  const isListening = state === "listening";
  const isTalking = state === "talking";

  const color = isRecording ? "#22c55e" : isTalking ? "#3b82f6" : "#9ca3af";

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Center glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: "80px",
          height: "80px",
          background: `radial-gradient(circle, ${color}22 0%, ${color}11 40%, transparent 70%)`,
          animation: `glow-pulse ${isListening ? 2 : isRecording ? 0.6 : 1.2}s ease-in-out infinite`,
        }}
      />

      {/* Wave rings */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: "40px",
            height: "40px",
            border: `2px solid ${color}`,
            opacity: 0,
            animation: `wave-ring-${state} ${isListening ? 2.5 : isRecording ? 0.8 : 1.5}s ease-out ${i * (isRecording ? 0.2 : 0.4)}s infinite`,
          }}
        />
      ))}

      {/* Rotating gradient ring for recording */}
      {isRecording && (
        <div
          className="absolute rounded-full"
          style={{
            width: "70px",
            height: "70px",
            border: "2px solid transparent",
            borderTopColor: color,
            borderRightColor: color,
            animation: "spin 0.8s linear infinite",
          }}
        />
      )}

      <style>{`
        @keyframes glow-pulse {
          0%, 100% { transform: scale(0.8); opacity: 0.4; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes wave-ring-listening {
          0%   { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(4); opacity: 0; }
        }
        @keyframes wave-ring-recording {
          0%   { transform: scale(0.8); opacity: 0.7; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        @keyframes wave-ring-talking {
          0%   { transform: scale(0.9); opacity: 0.4; }
          60%  { transform: scale(2.5); opacity: 0.1; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
