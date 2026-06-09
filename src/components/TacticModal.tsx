"use client";

import { useState, useEffect } from "react";
import type { Goal, Subtask, TacticStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/tactics";
import { colorForKey } from "@/lib/goalColors";
import { createClient } from "@/lib/supabase-browser";

export type TacticDraft = {
  id: string;
  title: string;
  notes: string;
  deadline: string | null;
  status: TacticStatus;
  goal_id: string | null;
};

// Pop-up editor for a single card: title, notes, deadline, status, project (goal).
export default function TacticModal({
  tactic,
  goals,
  onSave,
  onDelete,
  onClose,
}: {
  tactic: TacticDraft;
  goals: Goal[];
  onSave: (patch: Omit<TacticDraft, "id">) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(tactic.title);
  const [notes, setNotes] = useState(tactic.notes ?? "");
  const [deadline, setDeadline] = useState(tactic.deadline ?? "");
  const [status, setStatus] = useState<TacticStatus>(tactic.status);
  const [goalId, setGoalId] = useState<string | null>(tactic.goal_id);
  const [saving, setSaving] = useState(false);

  // ── Subtasks (the breakdown / recipe inside this task) ──
  const [supabase] = useState(() => createClient());
  const [subs, setSubs] = useState<Subtask[]>([]);
  const [subInput, setSubInput] = useState("");
  const [approach, setApproach] = useState("");
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachNote, setCoachNote] = useState("");

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("subtasks")
        .select("*")
        .eq("tactic_id", tactic.id)
        .order("position");
      if (active && data) setSubs(data as Subtask[]);
    })();
    return () => {
      active = false;
    };
  }, [tactic.id, supabase]);

  const addSub = async (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const { data } = await supabase
      .from("subtasks")
      .insert({ tactic_id: tactic.id, title: t, position: subs.length })
      .select()
      .single();
    if (data) setSubs((s) => [...s, data as Subtask]);
  };
  const addSubFromInput = async () => {
    if (!subInput.trim()) return;
    const v = subInput;
    setSubInput("");
    await addSub(v);
  };
  const toggleSub = async (id: string, done: boolean) => {
    setSubs((s) => s.map((x) => (x.id === id ? { ...x, is_done: done } : x)));
    await supabase.from("subtasks").update({ is_done: done }).eq("id", id);
  };
  const delSub = async (id: string) => {
    setSubs((s) => s.filter((x) => x.id !== id));
    await supabase.from("subtasks").delete().eq("id", id);
  };

  // Ask the coach for the approach + an ordered recipe of sub-steps.
  const suggestApproach = async () => {
    setCoachBusy(true);
    setCoachNote("");
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "breakdown",
          context: {
            task_title: title,
            goal_title: goals.find((g) => g.id === goalId)?.title ?? "",
            notes,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || json.available === false) {
        setCoachNote(
          json.available === false
            ? "Coach is unavailable — add an Anthropic API key to enable it."
            : json.error || "Coach had a hiccup. Try again."
        );
        return;
      }
      if (json.data?.approach) setApproach(json.data.approach as string);
      for (const s of (json.data?.subtasks as string[]) ?? []) await addSub(s);
    } catch {
      setCoachNote("Couldn't reach the coach. Try again.");
    } finally {
      setCoachBusy(false);
    }
  };

  const doneCount = subs.filter((s) => s.is_done).length;

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      notes: notes.trim(),
      deadline: deadline || null,
      status,
      goal_id: goalId,
    });
    setSaving(false);
    onClose();
  };

  const field =
    "w-full px-3 py-2 bg-[#f5f0ea] border border-[#ddd2c8] rounded-lg text-sm text-[#3d1c1c] focus:outline-none focus:ring-2 focus:ring-[#9b7a8f]/30 focus:border-[#9b7a8f] transition-all";
  const label =
    "block text-[11px] font-semibold uppercase tracking-[1px] text-[#8b6b6b] mb-1";

  const goalColor = colorForKey(goals.find((g) => g.id === goalId)?.color);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3d1c1c]/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-white w-full max-w-lg rounded-2xl shadow-2xl border-l-4 ${
          goalColor?.stripe ?? "border-l-[#ddd2c8]"
        } border-y border-r border-[#ddd2c8] max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-[2px] text-[#3d1c1c] font-[Playfair_Display,serif]">
              Tactic
            </h3>
            <button
              onClick={onClose}
              className="text-[#8b7b7b] hover:text-[#3d1c1c] text-lg leading-none cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div>
            <label className={label}>Title</label>
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>

          <div>
            <label className={label}>Notes</label>
            <textarea
              className={`${field} resize-none`}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context, links, anything relevant…"
            />
          </div>

          {/* ── Break it down ── */}
          <div className="bg-[#f5f0ea]/60 border border-[#ddd2c8] rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[1px] text-[#8b6b6b]">
                Break it down{subs.length > 0 && ` · ${doneCount}/${subs.length}`}
              </span>
              <button
                type="button"
                onClick={suggestApproach}
                disabled={coachBusy}
                className="bg-[#9b7a8f] hover:bg-[#876a7c] disabled:opacity-50 text-white rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-[0.5px] transition-colors cursor-pointer"
              >
                {coachBusy ? "Thinking…" : "✦ Suggest approach"}
              </button>
            </div>
            {coachNote && <p className="text-[12px] text-[#8b6b6b] mb-2">{coachNote}</p>}
            {approach && (
              <p className="text-[12px] text-[#3d1c1c] italic mb-2 leading-relaxed">
                <span className="font-semibold text-[#9b7a8f]">Approach:</span> {approach}
              </p>
            )}

            {subs.length > 0 && (
              <ul className="space-y-1 mb-2">
                {subs.map((s, i) => (
                  <li key={s.id} className="flex items-start gap-2 group">
                    <button
                      type="button"
                      onClick={() => toggleSub(s.id, !s.is_done)}
                      className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        s.is_done
                          ? "bg-[#9b7a8f] border-[#9b7a8f] text-white"
                          : "border-[#c4a8b8] bg-white"
                      }`}
                    >
                      {s.is_done && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2.5 6.5L5 9L9.5 3.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <span
                      className={`flex-1 text-[13px] leading-snug ${
                        s.is_done ? "text-[#8b7b7b] line-through" : "text-[#3d1c1c]"
                      }`}
                    >
                      <span className="text-[#a89] mr-1">{i + 1}.</span>
                      {s.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => delSub(s.id)}
                      className="text-[#8b7b7b] hover:text-[#d4736c] text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <input
                className="flex-1 px-2.5 py-1.5 bg-white border border-[#ddd2c8] rounded-lg text-[13px] text-[#3d1c1c] focus:outline-none focus:ring-2 focus:ring-[#9b7a8f]/30"
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addSubFromInput();
                }}
                placeholder="Add a step…"
              />
              <button
                type="button"
                onClick={addSubFromInput}
                className="text-[13px] text-[#8b6b6b] hover:text-[#3d1c1c] border border-[#ddd2c8] hover:border-[#9b7a8f] rounded-lg px-3 transition-all cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Deadline</label>
              <input className={field} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div>
              <label className={label}>Stage</label>
              <select className={field} value={status} onChange={(e) => setStatus(e.target.value as TacticStatus)}>
                {STATUS_META.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Project (goal)</label>
            <select className={field} value={goalId ?? ""} onChange={(e) => setGoalId(e.target.value || null)}>
              <option value="">— no project —</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onDelete}
              className="text-sm text-[#8b6b6b] hover:text-[#d4736c] border border-[#ddd2c8] hover:border-[#d4736c] rounded-lg px-3 py-2 transition-all cursor-pointer"
            >
              Delete
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="text-sm text-[#8b7b7b] hover:text-[#3d1c1c] px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="bg-[#3d1c1c] hover:bg-[#5a3535] disabled:opacity-50 text-white rounded-lg px-5 py-2 text-sm font-semibold tracking-[0.5px] transition-colors cursor-pointer"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
