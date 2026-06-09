"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { LifeGoal, LifeGoalKind } from "@/lib/types";

// Editable list of life goals for a single kind (vision | goal | value).
export default function LifeGoalsList({
  kind,
  memberId,
  initial,
  titlePlaceholder,
  descPlaceholder,
  addLabel,
  venturesByGoal = {},
}: {
  kind: LifeGoalKind;
  memberId: string;
  initial: LifeGoal[];
  titlePlaceholder: string;
  descPlaceholder: string;
  addLabel: string;
  venturesByGoal?: Record<string, string[]>; // life_goal_id -> venture names
}) {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<LifeGoal[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const startAdd = () => {
    setTitle("");
    setDescription("");
    setAdding(true);
    setEditingId(null);
  };
  const startEdit = (g: LifeGoal) => {
    setTitle(g.title);
    setDescription(g.description);
    setEditingId(g.id);
    setAdding(false);
  };
  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setTitle("");
    setDescription("");
  };

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const row = { title: title.trim(), description: description.trim() };
    if (editingId) {
      const { data } = await supabase
        .from("life_goals")
        .update(row)
        .eq("id", editingId)
        .select()
        .single();
      if (data) setItems((is) => is.map((x) => (x.id === editingId ? (data as LifeGoal) : x)));
    } else {
      const { data } = await supabase
        .from("life_goals")
        .insert({ ...row, member_id: memberId, kind, position: items.length })
        .select()
        .single();
      if (data) setItems((is) => [...is, data as LifeGoal]);
    }
    setSaving(false);
    cancel();
  };

  const remove = async (id: string) => {
    await supabase.from("life_goals").delete().eq("id", id);
    setItems((is) => is.filter((x) => x.id !== id));
  };

  const field =
    "w-full px-3 py-2 bg-[#f5f0ea] border border-[#ddd2c8] rounded-lg text-sm text-[#3d1c1c] focus:outline-none focus:ring-2 focus:ring-[#9b7a8f]/30 focus:border-[#9b7a8f] transition-all";

  const form = (
    <div className="bg-white border border-[#9b7a8f]/40 rounded-xl p-4 space-y-2.5">
      <input
        className={field}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={titlePlaceholder}
        autoFocus
      />
      <textarea
        className={`${field} resize-none`}
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={descPlaceholder}
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 bg-[#3d1c1c] hover:bg-[#5a3535] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold transition-colors cursor-pointer"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={cancel}
          className="px-4 text-[#8b7b7b] hover:text-[#d4736c] text-sm border border-[#ddd2c8] rounded-lg transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-2.5">
      {items.map((g) =>
        editingId === g.id ? (
          <div key={g.id}>{form}</div>
        ) : (
          <div
            key={g.id}
            className="bg-white border border-[#ddd2c8] rounded-xl p-4 flex items-start justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-[14px] text-[#3d1c1c] font-[Playfair_Display,serif]">
                {g.title}
              </h4>
              {g.description && (
                <p className="text-[13px] text-[#8b6b6b] mt-0.5 leading-relaxed">{g.description}</p>
              )}
              {(venturesByGoal[g.id]?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] uppercase tracking-[1px] text-[#a89] font-semibold">
                    Ventures:
                  </span>
                  {venturesByGoal[g.id].map((name) => (
                    <span
                      key={name}
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#9b7a8f]/10 text-[#6f5263]"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => startEdit(g)}
                className="text-xs text-[#8b6b6b] hover:text-[#3d1c1c] border border-[#ddd2c8] hover:border-[#9b7a8f] rounded-lg px-2.5 py-1 transition-all cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={() => remove(g.id)}
                className="text-xs text-[#8b6b6b] hover:text-[#d4736c] border border-[#ddd2c8] hover:border-[#d4736c] rounded-lg px-2.5 py-1 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )
      )}

      {adding && form}

      {!adding && editingId === null && (
        <button
          onClick={startAdd}
          className="w-full py-2.5 text-sm text-[#8b7b7b] hover:text-[#9b7a8f] border border-dashed border-[#ddd2c8] hover:border-[#c4a8b8] rounded-xl transition-all cursor-pointer hover:bg-[#9b7a8f]/5"
        >
          + {addLabel}
        </button>
      )}
    </div>
  );
}
