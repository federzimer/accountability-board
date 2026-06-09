"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { Stakeholder } from "@/lib/types";

const EMPTY = {
  name: "",
  role: "",
  helpful_for: "",
  email: "",
  phone: "",
  notes: "",
};
type Draft = typeof EMPTY;

// Common roles to speed up entry; users can type anything.
const ROLE_SUGGESTIONS = [
  "Investment Coach",
  "Real Estate Agent",
  "Lender",
  "Accountant",
  "Attorney",
  "Contractor",
  "Property Manager",
  "Mentor",
  "Partner",
];

export default function StakeholdersList({
  projectId,
  memberId,
  initial,
}: {
  projectId: string;
  memberId: string;
  initial: Stakeholder[];
}) {
  const supabase = createClient();
  const [people, setPeople] = useState<Stakeholder[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const startAdd = () => {
    setDraft(EMPTY);
    setAdding(true);
    setEditingId(null);
    setError("");
  };
  const startEdit = (s: Stakeholder) => {
    setDraft({
      name: s.name,
      role: s.role,
      helpful_for: s.helpful_for,
      email: s.email,
      phone: s.phone,
      notes: s.notes,
    });
    setEditingId(s.id);
    setAdding(false);
    setError("");
  };
  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setDraft(EMPTY);
    setError("");
  };

  const toRow = () => ({
    name: draft.name.trim(),
    role: draft.role.trim(),
    helpful_for: draft.helpful_for.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    notes: draft.notes.trim(),
  });

  const save = async () => {
    if (!draft.name.trim()) {
      setError("Give the contact a name.");
      return;
    }
    setSaving(true);
    setError("");
    if (editingId) {
      const { data, error } = await supabase
        .from("stakeholders")
        .update(toRow())
        .eq("id", editingId)
        .select()
        .single();
      if (error) setError(error.message);
      else {
        setPeople((ps) => ps.map((p) => (p.id === editingId ? (data as Stakeholder) : p)));
        cancel();
      }
    } else {
      const { data, error } = await supabase
        .from("stakeholders")
        .insert({ ...toRow(), project_id: projectId, member_id: memberId, position: people.length })
        .select()
        .single();
      if (error) setError(error.message);
      else {
        setPeople((ps) => [...ps, data as Stakeholder]);
        cancel();
      }
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("stakeholders").delete().eq("id", id);
    if (!error) setPeople((ps) => ps.filter((p) => p.id !== id));
  };

  const formOpen = adding || editingId !== null;

  return (
    <div className="space-y-3">
      {people.map((s) =>
        editingId === s.id ? (
          <StakeholderForm
            key={s.id}
            draft={draft}
            setDraft={setDraft}
            onSave={save}
            onCancel={cancel}
            saving={saving}
            error={error}
          />
        ) : (
          <div
            key={s.id}
            className="bg-white border border-[#ddd2c8] rounded-xl p-5 flex items-start justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-[15px] text-[#3d1c1c] font-[Playfair_Display,serif]">
                  {s.name}
                </h3>
                {s.role && (
                  <span className="text-[10px] uppercase tracking-[1px] font-semibold text-[#9b7a8f] bg-[#9b7a8f]/10 px-2 py-0.5 rounded-full">
                    {s.role}
                  </span>
                )}
              </div>
              {s.helpful_for && (
                <p className="text-[13px] text-[#8b6b6b] mt-1">
                  <span className="text-[#a89]">Helpful for:</span> {s.helpful_for}
                </p>
              )}
              <div className="flex items-center gap-3 flex-wrap mt-2">
                {s.email && (
                  <a
                    href={`mailto:${s.email}`}
                    className="text-[12px] text-[#9b7a8f] hover:underline"
                  >
                    ✉ {s.email}
                  </a>
                )}
                {s.phone && (
                  <a
                    href={`tel:${s.phone}`}
                    className="text-[12px] text-[#9b7a8f] hover:underline"
                  >
                    ☎ {s.phone}
                  </a>
                )}
              </div>
              {s.notes && <p className="text-[12px] text-[#8b7b7b] italic mt-2">{s.notes}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => startEdit(s)}
                className="text-xs text-[#8b6b6b] hover:text-[#3d1c1c] border border-[#ddd2c8] hover:border-[#9b7a8f] rounded-lg px-3 py-1.5 transition-all cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={() => remove(s.id)}
                className="text-xs text-[#8b6b6b] hover:text-[#d4736c] border border-[#ddd2c8] hover:border-[#d4736c] rounded-lg px-3 py-1.5 transition-all cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        )
      )}

      {adding && (
        <StakeholderForm
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={cancel}
          saving={saving}
          error={error}
        />
      )}

      {!formOpen && (
        <button
          onClick={startAdd}
          className="w-full py-3 text-sm text-[#8b7b7b] hover:text-[#9b7a8f] border border-dashed border-[#ddd2c8] hover:border-[#c4a8b8] rounded-xl transition-all cursor-pointer hover:bg-[#9b7a8f]/5"
        >
          + Add stakeholder
        </button>
      )}
      {people.length === 0 && !formOpen && (
        <p className="text-center text-xs text-[#8b7b7b] italic">
          No stakeholders yet — add the people helping this venture.
        </p>
      )}
    </div>
  );
}

function StakeholderForm({
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Name</label>
          <input
            className={field}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. Sarah Glidewell"
            autoFocus
          />
        </div>
        <div>
          <label className={label}>Role</label>
          <input
            className={field}
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            placeholder="e.g. Investment Coach"
            list="stakeholder-roles"
          />
          <datalist id="stakeholder-roles">
            {ROLE_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
      </div>
      <div>
        <label className={label}>Helpful for</label>
        <input
          className={field}
          value={draft.helpful_for}
          onChange={(e) => setDraft({ ...draft, helpful_for: e.target.value })}
          placeholder="What they unblock — e.g. financing pre-approval, comps & offers"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Email</label>
          <input
            className={field}
            type="email"
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            placeholder="name@example.com"
          />
        </div>
        <div>
          <label className={label}>Phone</label>
          <input
            className={field}
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            placeholder="+1 …"
          />
        </div>
      </div>
      <div>
        <label className={label}>Notes</label>
        <textarea
          className={`${field} resize-none`}
          rows={2}
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="Anything worth remembering."
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 bg-[#3d1c1c] hover:bg-[#5a3535] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold tracking-[0.5px] transition-colors cursor-pointer"
        >
          {saving ? "Saving..." : "Save stakeholder"}
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
