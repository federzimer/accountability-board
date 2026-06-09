"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { GOAL_COLORS, nextColorKey } from "@/lib/goalColors";

// Create a new venture, then drop the member into its dashboard.
export default function VentureForm({
  memberId,
  usedColors,
  todayISO,
}: {
  memberId: string;
  usedColors: (string | null)[];
  todayISO: string;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(nextColorKey(usedColors));
  const [startDate, setStartDate] = useState(todayISO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const field =
    "w-full px-3 py-2.5 bg-[#f5f0ea] border border-[#ddd2c8] rounded-lg text-sm text-[#3d1c1c] focus:outline-none focus:ring-2 focus:ring-[#9b7a8f]/30 focus:border-[#9b7a8f] transition-all";
  const label = "block text-[11px] font-semibold uppercase tracking-[1px] text-[#8b6b6b] mb-1.5";

  const create = async () => {
    if (!name.trim()) {
      setError("Give your venture a name.");
      return;
    }
    setSaving(true);
    setError("");
    const { data, error } = await supabase
      .from("projects")
      .insert({
        member_id: memberId,
        name: name.trim(),
        description: description.trim(),
        color,
        start_date: startDate || todayISO,
      })
      .select()
      .single();
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    router.push(`/ventures/${(data as { id: string }).id}`);
  };

  return (
    <div className="bg-white border border-[#ddd2c8] rounded-2xl p-6 space-y-4 shadow-[0_4px_24px_rgba(61,28,28,0.06)]">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div>
        <label className={label}>Venture name</label>
        <input
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Blackbird Hospitality"
          autoFocus
        />
      </div>
      <div>
        <label className={label}>What is it? (optional)</label>
        <textarea
          className={`${field} resize-none`}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One line on what this business does."
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Sprint start date</label>
          <input
            className={field}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <p className="text-[11px] text-[#a89] mt-1">Anchors this venture&apos;s 90-day window.</p>
        </div>
        <div>
          <label className={label}>Color</label>
          <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
            {GOAL_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setColor(c.key)}
                title={c.label}
                className={`w-7 h-7 rounded-full ${c.dot} transition-all cursor-pointer ${
                  color === c.key
                    ? "ring-2 ring-offset-2 ring-[#3d1c1c]/40 scale-110"
                    : "hover:scale-110"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={create}
        disabled={saving}
        className="w-full bg-[#3d1c1c] hover:bg-[#5a3535] disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold tracking-[0.5px] transition-colors cursor-pointer"
      >
        {saving ? "Creating..." : "Create venture →"}
      </button>
    </div>
  );
}
