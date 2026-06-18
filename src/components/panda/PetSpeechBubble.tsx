import { useState, useRef, useEffect } from "react";
import type { PandaState } from "../../stores/pandaStore";
import { usePandaStore } from "../../stores/pandaStore";

const STATE_BUBBLES: Record<
  PandaState,
  { text: string; emoji: string } | null
> = {
  idle: null,
  listening: { text: "我在听~", emoji: "🎤" },
  recording: { text: "录音中", emoji: "🔴" },
  coffee: { text: "喝咖啡中", emoji: "☕" },
  flipbook: { text: "摸鱼中", emoji: "📖" },
  type: { text: "写代码中", emoji: "💻" },
  thinking: { text: "思考中...", emoji: "🤔" },
  sleep: { text: "Zzz...", emoji: "💤" },
  talk: { text: "说话中", emoji: "💬" },
  talking: { text: "说话中", emoji: "💬" },
  raisepaw: { text: "嗨~", emoji: "🙋" },
  happy: { text: "好开心", emoji: "😊" },
  angry: { text: "生气了", emoji: "😠" },
  error: { text: "出错了", emoji: "😵" },
  executing: { text: "检索中...", emoji: "📚" },
};

const MIN_DISPLAY_MS = 3500;

interface PetSpeechBubbleProps {
  state: PandaState;
}

/*| 分类    | 动作            |
| ----- | ------------- |
| 待机    | 站立、眨眼、左右张望    |
| 移动    | 慢走、快跑、跳跃      |
| 情绪    | 开心、疑惑、生气、害羞   |
| 工作    | 打字、看书、思考、写字   |
| 生活    | 睡觉、伸懒腰、喝水、喝咖啡 |
| 美食    | 吃竹子、吃包子、啃苹果   |
| 互动    | 挥手、点赞、鼓掌、招手   |
| AI 响应 | 加载中、搜索中、回答完成  |*/


export function PetSpeechBubble({ state }: PetSpeechBubbleProps) {
  const speechText = usePandaStore((s) => s.speechText);
  const transcriptText = usePandaStore((s) => s.transcriptText);
  const replyText = usePandaStore((s) => s.replyText);
  const [displayState, setDisplayState] = useState<PandaState | null>(
    STATE_BUBBLES[state] ? state : null,
  );
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const bubble = STATE_BUBBLES[state];
    if (bubble) {
      // New non-idle state → show immediately, clear any pending hide
      if (timerRef.current) clearTimeout(timerRef.current);
      setDisplayState(state);
    } else {
      // State became idle (or null) → wait before hiding
      timerRef.current = setTimeout(() => {
        setDisplayState(null);
      }, MIN_DISPLAY_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state]);

  const bubble = displayState ? STATE_BUBBLES[displayState] : null;

  // Priority: speechText(interaction) > transcriptText(transcription) > replyText(AI reply) > state(default bubble)

  // Recording transcription bubble
  if (transcriptText && (state === "recording" || state === "listening")) {
    return (
      <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
           style={{ animation: "fadeIn 0.2s ease-out" }}>
        <div className="bg-gray-800/90 text-white text-xs rounded-lg px-3 py-1.5
                        max-w-[220px] text-center backdrop-blur-sm
                        border border-green-500/30">
          🎤 {transcriptText}
          <span className="animate-pulse">|</span>
        </div>
        <div className="flex justify-center -mt-px">
          <div className="w-2 h-2 bg-gray-800/90 rotate-45" />
        </div>
      </div>
    );
  }

  // AI reply bubble
  if (replyText && (state === "talking" || state === "thinking")) {
    return (
      <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
           style={{ animation: "fadeIn 0.2s ease-out" }}>
        <div className="bg-gray-800/90 text-green-400 text-xs rounded-lg px-3 py-1.5
                        max-w-[240px] text-center backdrop-blur-sm
                        border border-blue-500/30">
          💬 {replyText}
          {state === "thinking" && <span className="animate-pulse">|</span>}
        </div>
        <div className="flex justify-center -mt-px">
          <div className="w-2 h-2 bg-gray-800/90 rotate-45" />
        </div>
      </div>
    );
  }

  // Show dynamic speechText if set, otherwise show state bubble
  if (speechText) {
    return (
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none" style={{ animation: "fadeIn 0.2s ease-out" }}>
        <div className="bg-gray-800/90 text-white text-xs rounded-lg px-3 py-1.5 max-w-[240px] text-center backdrop-blur-sm whitespace-nowrap">
          {speechText}
        </div>
        <div className="flex justify-center -mt-px">
          <div className="w-2 h-2 bg-gray-800/90 rotate-45 border-r border-b border-white/10" />
        </div>
      </div>
    );
  }

  if (!bubble) return null;

  return (
    <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none" style={{ animation: "fadeIn 0.2s ease-out" }}>
      <div className="bg-gray-800/90 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap backdrop-blur-sm">
        <span className="mr-1">{bubble.emoji}</span>
        {bubble.text}
      </div>
      <div className="flex justify-center -mt-px">
        <div className="w-2 h-2 bg-gray-800/90 rotate-45 border-r border-b border-white/10" />
      </div>
    </div>
  );
}
