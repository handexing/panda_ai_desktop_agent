import { useEffect, useRef } from "react";
import { usePandaStore } from "../../stores/pandaStore";
import type { TraceStep } from "../../lib/tauri";
import { Loader, Wrench, Eye, Check, AlertCircle, Brain, X } from "lucide-react";

const stepConfig: Record<TraceStep["type"], { icon: React.ReactNode; label: string; color: string }> = {
  planning:  { icon: <Brain size={12} />,       label: "规划",  color: "text-blue-400" },
  executing: { icon: <Wrench size={12} />,      label: "执行",  color: "text-amber-400" },
  observing: { icon: <Eye size={12} />,         label: "观察",  color: "text-purple-400" },
  done:      { icon: <Check size={12} />,       label: "完成",  color: "text-green-400" },
  error:     { icon: <AlertCircle size={12} />, label: "错误",  color: "text-red-400" },
};

function getDetail(step: TraceStep): string {
  if (!step.detail) return "";
  if (typeof step.detail === "string") return step.detail;
  if ("tool" in step.detail) return step.detail.tool;
  if ("result" in step.detail) {
    const r = step.detail.result;
    return r.length > 60 ? r.slice(0, 60) + "..." : r;
  }
  if ("text" in step.detail) {
    const t = step.detail.text;
    return t.length > 40 ? t.slice(0, 40) + "..." : t;
  }
  if ("message" in step.detail) return step.detail.message;
  return "";
}

export function TraceBar() {
  const steps = usePandaStore((s) => s.traceSteps);
  const isStreaming = usePandaStore((s) => s.isStreaming);
  const clearTraceSteps = usePandaStore((s) => s.clearTraceSteps);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps.length]);

  // Auto-hide 3s after done
  useEffect(() => {
    if (!isStreaming && steps.length > 0) {
      const last = steps[steps.length - 1];
      if (last.type === "done" || last.type === "error") {
        const timer = setTimeout(() => clearTraceSteps(), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [isStreaming, steps]);

  if (steps.length === 0) return null;

  return (
    <div className="w-56 border-l border-white/10 bg-gray-800/50 flex flex-col shrink-0" style={{ animation: "fadeIn 0.2s ease-out" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 shrink-0">
        <span className="text-white/60 text-xs font-medium tracking-wide">
          {isStreaming ? "AGENT 执行中" : "执行完毕"}
        </span>
        <button
          onClick={clearTraceSteps}
          className="text-white/20 hover:text-white/60 p-0.5"
        >
          <X size={12} />
        </button>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-0">
          {steps.map((step, i) => {
            const cfg = stepConfig[step.type];
            const detail = getDetail(step);
            const isLast = i === steps.length - 1;
            const isActive = isLast && isStreaming && step.type !== "done" && step.type !== "error";

            return (
              <div key={i} className="flex gap-2">
                <div className="flex flex-col items-center shrink-0 w-4 pt-0.5">
                  <div className={cfg.color}>
                    {isActive ? <Loader size={12} className="animate-spin" /> : cfg.icon}
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-white/10 my-0.5" />}
                </div>
                <div className={`flex-1 min-w-0 ${isLast ? "pb-1" : "pb-3"}`}>
                  <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  {detail && (
                    <div className="text-white/40 text-xs mt-1 break-all leading-relaxed">
                      {detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
