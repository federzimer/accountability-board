"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { computeScore } from "@/lib/score";
import type { Tactic, WeeklyCheckin } from "@/lib/types";

// End-of-week check-in: the member's open commitments (committed + working_on)
// are this week's set. Tick the ones completed -> score = done/committed*100.
export default function CheckinFlow({
  tactics,
  existing,
  cycleId,
  memberId,
  weekNumber,
}: {
  tactics: Tactic[];
  existing: WeeklyCheckin | null;
  cycleId: string;
  memberId: string;
  weekNumber: number;
}) {
  const supabase = createClient();
  const router = useRouter();

  // Pre-tick anything already completed.
  const [done, setDone] = useState<Set<string>>(
    () => new Set(tactics.filter((t) => t.status === "completed").map((t) => t.id))
  );
  const [reflection, setReflection] = useState(existing?.reflection ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const committed = tactics.length;
  const completed = done.size;
  const score = computeScore(committed, completed);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  };

  const submit = async () => {
    setSaving(true);
    setError("");

    // 1. mark ticked tactics completed (and untick -> back to working_on)
    const completedIds = [...done];
    const reopenIds = tactics
      .filter((t) => !done.has(t.id) && t.status === "completed")
      .map((t) => t.id);

    if (completedIds.length) {
      // tag the week so the check-in keeps showing these after refresh
      await supabase
        .from("tactics")
        .update({ status: "completed", week_number: weekNumber })
        .in("id", completedIds);
    }
    if (reopenIds.length) {
      await supabase
        .from("tactics")
        .update({ status: "working_on", week_number: null })
        .in("id", reopenIds);
    }

    // 2. upsert the weekly check-in
    const { error } = await supabase.from("weekly_checkins").upsert(
      {
        member_id: memberId,
        cycle_id: cycleId,
        week_number: weekNumber,
        tactics_committed: committed,
        tactics_completed: completed,
        score,
        reflection: reflection.trim(),
      },
      { onConflict: "member_id,cycle_id,week_number" }
    );

    if (error) setError(error.message);
    else {
      setSaved(true);
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <div className="bg-white border border-[#ddd2c8] rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#3d1c1c] font-[Playfair_Display,serif]">
            Week {weekNumber} Check-in
          </h2>
          <p className="text-[13px] text-[#8b6b6b]">
            Confirm what you actually shipped this week.
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold text-[#9b7a8f] font-[Playfair_Display,serif] leading-none">
            {score}%
          </div>
          <p className="text-[11px] uppercase tracking-[1px] text-[#8b7b7b] mt-1">
            {completed}/{committed} done
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {committed === 0 ? (
        <p className="text-sm text-[#8b7b7b] italic py-4 text-center">
          No open commitments on your board. Add tactics to the board first.
        </p>
      ) : (
        <ul className="space-y-2">
          {tactics.map((t) => {
            const checked = done.has(t.id);
            return (
              <li key={t.id}>
                <button
                  onClick={() => toggle(t.id)}
                  className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg border transition-all cursor-pointer ${
                    checked
                      ? "bg-[#dbe8d5]/40 border-[#8ba888]"
                      : "bg-[#f5f0ea] border-[#ddd2c8] hover:border-[#c4a8b8]"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-bold shrink-0 ${
                      checked
                        ? "bg-[#8ba888] border-[#8ba888] text-white"
                        : "bg-white border-[#ddd2c8] text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span
                    className={`text-sm ${
                      checked ? "text-[#3d1c1c]" : "text-[#4a3a3a]"
                    }`}
                  >
                    {t.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[1px] text-[#8b6b6b] mb-1">
          Reflection (optional)
        </label>
        <textarea
          className="w-full px-3 py-2 bg-[#f5f0ea] border border-[#ddd2c8] rounded-lg text-sm text-[#3d1c1c] resize-none focus:outline-none focus:ring-2 focus:ring-[#9b7a8f]/30 focus:border-[#9b7a8f] transition-all"
          rows={3}
          value={reflection}
          onChange={(e) => {
            setReflection(e.target.value);
            setSaved(false);
          }}
          placeholder="What worked, what got in the way, what's next?"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="bg-[#3d1c1c] hover:bg-[#5a3535] disabled:opacity-50 text-white rounded-lg px-6 py-2.5 text-sm font-semibold tracking-[0.5px] transition-colors cursor-pointer"
        >
          {saving ? "Saving..." : existing ? "Update check-in" : "Submit check-in"}
        </button>
        {saved && (
          <span className="text-sm text-[#8ba888] font-medium">Saved ✓</span>
        )}
      </div>
    </div>
  );
}
