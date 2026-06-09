"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { nextColorKey } from "@/lib/goalColors";
import { defaultGoalEndISO } from "@/lib/sprint";
import type { Bet } from "@/lib/types";

// "Next up" — the ranked backlog of bets that weren't promoted to goals yet.
// Reorder by priority, promote into a 90-day goal, or drop.
export default function BetBoard({
  projectId,
  cycleId,
  initialBets,
  goalsAtCapacity,
}: {
  projectId: string;
  cycleId: string | null;
  initialBets: Bet[];
  goalsAtCapacity: boolean; // venture already has the max 3 goals
}) {
  const supabase = createClient();
  const router = useRouter();
  const [bets, setBets] = useState<Bet[]>(
    [...initialBets].sort((a, b) => a.rank - b.rank)
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const swap = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= bets.length) return;
    const arr = [...bets];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    // re-derive ranks from new order and persist the two that changed
    const a = { ...arr[i], rank: i + 1 };
    const b = { ...arr[j], rank: j + 1 };
    arr[i] = a;
    arr[j] = b;
    setBets(arr);
    await Promise.all([
      supabase.from("bets").update({ rank: a.rank }).eq("id", a.id),
      supabase.from("bets").update({ rank: b.rank }).eq("id", b.id),
    ]);
  };

  const promote = async (bet: Bet) => {
    if (goalsAtCapacity) {
      setError("This venture already has 3 goals. Complete or remove one first.");
      return;
    }
    setBusyId(bet.id);
    setError("");
    // color = next unused among this venture's goals
    const { data: existing } = await supabase
      .from("goals")
      .select("color")
      .eq("project_id", projectId);
    const color = nextColorKey(
      ((existing as { color: string | null }[]) ?? []).map((g) => g.color)
    );
    const { data: goal, error: gErr } = await supabase
      .from("goals")
      .insert({
        member_id: bet.member_id,
        project_id: projectId,
        cycle_id: cycleId,
        title: bet.title,
        the_bet: bet.note || bet.title,
        source_idea_id: bet.source_idea_id,
        end_date: defaultGoalEndISO(),
        color,
      })
      .select()
      .single();
    if (gErr) {
      setError(gErr.message);
      setBusyId(null);
      return;
    }
    await supabase
      .from("bets")
      .update({ status: "promoted", goal_id: (goal as { id: string }).id })
      .eq("id", bet.id);
    setBets((bs) => bs.filter((b) => b.id !== bet.id));
    setBusyId(null);
    router.refresh(); // surface the new goal in the GoalEditor above
  };

  const drop = async (bet: Bet) => {
    setBusyId(bet.id);
    await supabase.from("bets").update({ status: "dropped" }).eq("id", bet.id);
    setBets((bs) => bs.filter((b) => b.id !== bet.id));
    setBusyId(null);
  };

  if (bets.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#3d1c1c]">
          Next up · bet backlog
        </h3>
        <span className="text-[11px] text-[#8b7b7b]">{bets.length} waiting</span>
      </div>
      <p className="text-[12px] text-[#8b6b6b] mb-3">
        Ranked bets from your brainstorm that aren&apos;t active goals yet. Promote one when it&apos;s
        time, or drop it.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm mb-3">
          {error}
        </div>
      )}

      <ol className="space-y-2">
        {bets.map((b, i) => (
          <li
            key={b.id}
            className="flex items-center gap-3 bg-white border border-[#ddd2c8] rounded-lg px-3 py-2.5"
          >
            <span className="w-6 h-6 rounded-full bg-[#f5f0ea] border border-[#ddd2c8] text-[#8b7b7b] flex items-center justify-center text-[12px] font-bold shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#3d1c1c] leading-snug truncate">{b.title}</p>
              {b.note && b.note !== b.title && (
                <p className="text-[12px] text-[#8b6b6b] italic truncate">“{b.note}”</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => swap(i, -1)}
                disabled={i === 0 || busyId === b.id}
                className="w-6 h-6 rounded border border-[#ddd2c8] text-[#8b7b7b] hover:text-[#3d1c1c] hover:border-[#9b7a8f] disabled:opacity-30 cursor-pointer text-xs"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => swap(i, 1)}
                disabled={i === bets.length - 1 || busyId === b.id}
                className="w-6 h-6 rounded border border-[#ddd2c8] text-[#8b7b7b] hover:text-[#3d1c1c] hover:border-[#9b7a8f] disabled:opacity-30 cursor-pointer text-xs"
                title="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => promote(b)}
                disabled={busyId === b.id}
                className="text-[11px] font-semibold text-white bg-[#3d1c1c] hover:bg-[#5a3535] disabled:opacity-50 rounded px-2.5 py-1.5 cursor-pointer ml-1"
              >
                {busyId === b.id ? "…" : "Promote → goal"}
              </button>
              <button
                type="button"
                onClick={() => drop(b)}
                disabled={busyId === b.id}
                className="w-6 h-6 rounded border border-[#ddd2c8] text-[#8b7b7b] hover:text-[#d4736c] hover:border-[#d4736c] cursor-pointer text-xs"
                title="Drop"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
