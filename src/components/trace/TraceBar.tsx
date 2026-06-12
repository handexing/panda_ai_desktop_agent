import { usePandaStore } from "../../stores/pandaStore";
import type { TraceStep } from "../../lib/tauri";

const stepLabel: Record<TraceStep["type"], string> = {
  planning: "规划中",
  executing: "执行中",
  observing: "观察中",
  done: "完成",
  error: "错误",
};

const stepColor: Record<TraceStep["type"], string> = {
  planning: "text-blue-400 bg-blue-500/10",
  executing: "text-amber-400 bg-amber-500/10",
  observing: "text-purple-400 bg-purple-500/10",
  done: "text-green-400 bg-green-500/10",
  error: "text-red-400 bg-red-500/10",
};

function formatDetail(step: TraceStep): string | null {
  if (!step.detail) return null;
  if (typeof step.detail === "string") return step.detail;
  if ("tool" in step.detail) return `工具: ${step.detail.tool}`;
  if ("result" in step.detail) return `结果: ${step.detail.result}`;
  if ("text" in step.detail) return step.detail.text;
  if ("message" in step.detail) return step.detail.message;
  return null;
}

export function TraceBar() {
  const steps = usePandaStore((s) => s.traceSteps);

  if (steps.length === 0) return null;

  // Show only the last 5 steps
  const visible = steps.slice(-5);

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/10 overflow-x-auto shrink-0">
      {visible.map((step, i) => {
        const detail = formatDetail(step);
        return (
          <span
            key={i}
            className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${stepColor[step.type]}`}
            title={detail ?? undefined}
          >
            {stepLabel[step.type]}
            {detail ? `: ${detail}` : ""}
          </span>
        );
      })}
    </div>
  );
}
