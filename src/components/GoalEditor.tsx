"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { Goal, GoalStatus } from "@/lib/types";
import { GOAL_COLORS, nextColorKey } from "@/lib/goalColors";

const MAX_GOALS = 3;
const EMPTY = {
  title: "",
  why: "",
  target_metric: "",
  target_value: "",
  current_value: "",
  status: "active" as GoalStatus,
  color: GOAL_COLORS[0].key,
};

type Draft = typeof EMPTY;

export default function GoalEditor({
  initialGoals,
  cycleId,
  memberId,
  projectId = null,
}: {
  initialGoals: Goal[];
  cycleId: string | null;
  memberId: string;
  projectId?: string | null;
}) {
  const supabase = createClient();
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toRow = () => ({
    title: draft.title.trim(),
    why: draft.why.trim(),
    target_metric: draft.target_metric.trim(),
    target_value: draft.target_value === "" ? null : Number(draft.target_value),
    current_value: draft.current_value === "" ? 0 : Number(draft.current_value),
    status: draft.status,
    color: draft.color,
  });

  const startAdd = () => {
    setDraft({ ...EMPTY, color: nextColorKey(goals.map((g) => g.color)) });
    setAdding(true);
    setEditingId(null);
    setError("");
  };

  const startEdit = (g: Goal) => {
    setDraft({
      title: g.title,
      why: g.why,
      target_metric: g.target_metric,
      target_value: g.target_value?.toString() ?? "",
      current_value: g.current_value?.toString() ?? "",
      status: g.status,
      color: g.color ?? GOAL_COLORS[0].key,
    });
    setEditingId(g.id);
    setAdding(false);
    setError("");
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setDraft(EMPTY);
    setError("");
  };

  const save = async () => {
    if (!draft.title.trim()) {
      setError("Give the goal a title.");
      return;
    }
    setSaving(true);
    setError("");
    if (editingId) {
      const { data, error } = await supabase
        .from("goals")
        .update(toRow())
        .eq("id", editingId)
        .select()
        .single();
      if (error) setError(error.message);
      else {
        setGoals((gs) => gs.map((g) => (g.id === editingId ? (data as Goal) : g)));
        cancel();
      }
    } else {
      const { data, error } = await supabase
        .from("goals")
        .insert({ ...toRow(), cycle_id: cycleId, member_id: memberId, project_id: projectId })
        .select()
        .single();
      if (error) setError(error.message);
      else {
        setGoals((gs) => [...gs, data as Goal]);
        cancel();
      }
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (!error) setGoals((gs) => gs.filter((g) => g.id !== id));
  };

  const formOpen = adding || editingId !== null;

  return (
    <div className="space-y-4">
      {goals.map((g) =>
        editingId === g.id ? (
          <GoalForm
            key={g.id}
            draft={draft}
            setDraft={setDraft}
            onSave={save}
            onCancel={cancel}
            saving={saving}
            error={error}
          />
        ) : (
          <div
            key={g.id}
            className="bg-white border border-[#ddd2c8] rounded-xl p-5 flex items-start justify-between gap-4"
          >
            <div className="flex-1">
              <h3 className="font-bold text-[15px] text-[#3d1c1c] font-[Playfair_Display,serif]">
                {g.title}
              </h3>
              {g.why && <p className="text-[13px] text-[#8b6b6b] italic mt-1">&ldquo;{g.why}&rdquo;</p>}
              <p className="text-xs text-[#8b7b7b] mt-2">
                {g.target_metric || "Target"}:{" "}
                <span className="font-semibold text-[#3d1c1c]">
                  {g.current_value}
                  {g.target_value != null ? ` / ${g.target_value}` : ""}
                </span>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => startEdit(g)}
                className="text-xs text-[#8b6b6b] hover:text-[#3d1c1c] border border-[#ddd2c8] hover:border-[#9b7a8f] rounded-lg px-3 py-1.5 transition-all cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={() => remove(g.id)}
                className="text-xs text-[#8b6b6b] hover:text-[#d4736c] border border-[#ddd2c8] hover:border-[#d4736c] rounded-lg px-3 py-1.5 transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        )
      )}

      {adding && (
        <GoalForm
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={cancel}
          saving={saving}
          error={error}
        />
      )}

      {!formOpen && goals.length < MAX_GOALS && (
        <button
          onClick={startAdd}
          className="w-full py-3 text-sm text-[#8b7b7b] hover:text-[#9b7a8f] border border-dashed border-[#ddd2c8] hover:border-[#c4a8b8] rounded-xl transition-all cursor-pointer hover:bg-[#9b7a8f]/5"
        >
          + Add goal ({goals.length}/{MAX_GOALS})
        </button>
      )}
      {!formOpen && goals.length >= MAX_GOALS && (
        <p className="text-center text-xs text-[#8b7b7b] italic">
          Max {MAX_GOALS} goals per cycle — keep it focused.
        </p>
      )}
    </div>
  );
}

function GoalForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
  error,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
}) {
  const field =
    "w-full px-3 py-2 bg-[#f5f0ea] border border-[#ddd2c8] rounded-lg text-sm text-[#3d1c1c] focus:outline-none focus:ring-2 focus:ring-[#9b7a8f]/30 focus:border-[#9b7a8f] transition-all";
  const label = "block text-[11px] font-semibold uppercase tracking-[1px] text-[#8b6b6b] mb-1";

  return (
    <div className="bg-white border border-[#9b7a8f]/40 rounded-xl p-5 space-y-3 shadow-[0_4px_24px_rgba(61,28,28,0.06)]">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div>
        <label className={label}>Goal (the outcome)</label>
        <input
          className={field}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="e.g. Reach $20k MRR"
          autoFocus
        />
      </div>
      <div>
        <label className={label}>Why it matters</label>
        <textarea
          className={`${field} resize-none`}
          rows={2}
          value={draft.why}
          onChange={(e) => setDraft({ ...draft, why: e.target.value })}
          placeholder="Why this goal, why now?"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={label}>Metric</label>
          <input
            className={field}
            value={draft.target_metric}
            onChange={(e) => setDraft({ ...draft, target_metric: e.target.value })}
            placeholder="MRR ($)"
          />
        </div>
        <div>
          <label className={label}>Target</label>
          <input
            className={field}
            type="number"
            value={draft.target_value}
            onChange={(e) => setDraft({ ...draft, target_value: e.target.value })}
            placeholder="20000"
          />
        </div>
        <div>
          <label className={label}>Current</label>
          <input
            className={field}
            type="number"
            value={draft.current_value}
            onChange={(e) => setDraft({ ...draft, current_value: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Status</label>
          <select
            className={field}
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as GoalStatus })}
          >
            <option value="active">Active</option>
            <option value="achieved">Achieved</option>
            <option value="missed">Missed</option>
          </select>
        </div>
        <div>
          <label className={label}>Project color</label>
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {GOAL_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setDraft({ ...draft, color: c.key })}
                title={c.label}
                className={`w-6 h-6 rounded-full ${c.dot} transition-all cursor-pointer ${
                  draft.color === c.key
                    ? "ring-2 ring-offset-2 ring-[#3d1c1c]/40 scale-110"
                    : "hover:scale-110"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 bg-[#3d1c1c] hover:bg-[#5a3535] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold tracking-[0.5px] transition-colors cursor-pointer"
        >
          {saving ? "Saving..." : "Save goal"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 text-[#8b7b7b] hover:text-[#d4736c] text-sm border border-[#ddd2c8] hover:border-[#d4736c] rounded-lg transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
