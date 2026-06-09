"use client";

import { useState, useEffect } from "react";
import type { Goal, TacticStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/tactics";
import { colorForKey } from "@/lib/goalColors";

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

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

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
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context, links, next actions, anything relevant…"
            />
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
