import type { Goal, Tactic } from "@/lib/types";
import { STATUS_META } from "@/lib/tactics";
import { colorForKey } from "@/lib/goalColors";

// Read-only four-column snapshot of a member's tactics (no drag-and-drop).
export default function MiniBoard({
  tactics,
  goals = [],
}: {
  tactics: Tactic[];
  goals?: Goal[];
}) {
  const goalById = (id: string | null) => goals.find((g) => g.id === id) ?? null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {STATUS_META.map((col) => {
        const items = tactics
          .filter((t) => t.status === col.id)
          .sort((a, b) => a.position - b.position);
        return (
          <div
            key={col.id}
            className="bg-white border border-[#ddd2c8] rounded-xl p-3 min-h-[120px]"
          >
            <div className={`mb-3 pb-2 border-b-2 ${col.borderAccent}`}>
              <div className="flex items-center justify-between">
                <h3
                  className={`font-bold text-[13px] font-[Playfair_Display,serif] ${col.titleColor} flex items-center gap-2`}
                >
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  {col.title}
                </h3>
                <span className="text-[10px] font-semibold text-[#8b7b7b] bg-[#f5f0ea] px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              <p className="text-[10px] text-[#8b7b7b] mt-1 leading-snug">{col.desc}</p>
            </div>
            <div className="space-y-2">
              {items.map((t) => {
                const gc = colorForKey(goalById(t.goal_id)?.color);
                return (
                  <div
                    key={t.id}
                    className={`bg-[#f5f0ea] border border-[#ddd2c8] border-l-4 ${
                      gc?.stripe ?? "border-l-[#ddd2c8]"
                    } rounded-lg px-3 py-2 text-[13px] text-[#3d1c1c] leading-relaxed`}
                  >
                    {t.title}
                  </div>
                );
              })}
              {items.length === 0 && (
                <p className="text-[11px] text-[#8b7b7b] italic px-1">—</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
