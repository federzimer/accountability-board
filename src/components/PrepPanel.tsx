import type { Goal, Tactic } from "@/lib/types";

// Pre-call prep: at-a-glance goal + latest score + Working On + Blocked.
export default function PrepPanel({
  goals,
  tactics,
  latestScore,
  latestWeek,
}: {
  goals: Goal[];
  tactics: Tactic[];
  latestScore: number | null;
  latestWeek: number | null;
}) {
  const working = tactics.filter((t) => t.status === "working_on");
  const blocked = tactics.filter((t) => t.status === "blocked");

  return (
    <div className="bg-white border border-[#ddd2c8] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-[2px] text-[#3d1c1c] font-[Playfair_Display,serif]">
          Pre-call Prep
        </h3>
        {latestScore !== null && (
          <span className="text-xs text-[#8b6b6b]">
            Week {latestWeek} score:{" "}
            <span className="font-bold text-[#9b7a8f]">{latestScore}%</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-[1px] text-[#8b7b7b] font-semibold mb-2">
            Goals
          </p>
          {goals.length ? (
            <ul className="space-y-1.5">
              {goals.map((g) => (
                <li key={g.id} className="text-[#3d1c1c] leading-snug">
                  • {g.title}
                  {g.target_value ? (
                    <span className="text-[#8b7b7b]">
                      {" "}
                      ({formatNum(g.current_value)}/{formatNum(g.target_value)})
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[#8b7b7b] italic text-[13px]">No goals set</p>
          )}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[1px] text-[#c9a84c] font-semibold mb-2">
            Working On
          </p>
          {working.length ? (
            <ul className="space-y-1.5">
              {working.map((t) => (
                <li key={t.id} className="text-[#3d1c1c] leading-snug">
                  • {t.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[#8b7b7b] italic text-[13px]">Nothing in progress</p>
          )}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[1px] text-[#d4736c] font-semibold mb-2">
            Blocked
          </p>
          {blocked.length ? (
            <ul className="space-y-1.5">
              {blocked.map((t) => (
                <li key={t.id} className="text-[#3d1c1c] leading-snug">
                  • {t.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[#8b7b7b] italic text-[13px]">Nothing blocked</p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}
