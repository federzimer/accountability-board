import type { Goal } from "@/lib/types";
import { colorForKey } from "@/lib/goalColors";

// Read-only goal display with a progress bar (current_value / target_value).
export default function GoalCard({ goal }: { goal: Goal }) {
  const target = goal.target_value ?? 0;
  const pct =
    target > 0 ? Math.min(Math.round((goal.current_value / target) * 100), 100) : 0;
  const gc = colorForKey(goal.color);

  const statusColor =
    goal.status === "achieved"
      ? "text-[#8ba888] bg-[#dbe8d5]"
      : goal.status === "missed"
      ? "text-[#d4736c] bg-[#f5dad7]"
      : "text-[#9b7a8f] bg-[#9b7a8f]/10";

  return (
    <div className={`bg-white border border-[#ddd2c8] border-l-4 ${gc?.stripe ?? "border-l-[#ddd2c8]"} rounded-xl p-5`}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-bold text-[15px] text-[#3d1c1c] font-[Playfair_Display,serif] leading-snug flex items-center gap-2">
          {gc && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${gc.dot}`} />}
          {goal.title}
        </h3>
        <span
          className={`shrink-0 text-[10px] uppercase tracking-[1px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}
        >
          {goal.status}
        </span>
      </div>

      {goal.why && (
        <p className="text-[13px] text-[#8b6b6b] leading-relaxed mb-3 italic">
          &ldquo;{goal.why}&rdquo;
        </p>
      )}

      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-[1px] text-[#8b7b7b] font-medium">
          {goal.target_metric || "Progress"}
        </span>
        <span className="text-sm font-semibold text-[#3d1c1c]">
          {formatNum(goal.current_value)}
          {target > 0 && <span className="text-[#8b7b7b]"> / {formatNum(target)}</span>}
        </span>
      </div>

      <div className="h-2.5 w-full rounded-full bg-[#f5f0ea] border border-[#ddd2c8] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#c4a8b8] to-[#9b7a8f] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {target > 0 && (
        <p className="text-right text-[11px] text-[#9b7a8f] font-semibold mt-1">{pct}%</p>
      )}
    </div>
  );
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}
