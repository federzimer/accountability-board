"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { READINESS, READINESS_TOTAL } from "@/lib/readiness";

// Per-venture business-readiness checklist. Toggling a box optimistically
// updates local state and upserts into `readiness_items` keyed by
// (project_id, item_key). `memberId` is stored as the owner (RLS).
export default function ReadinessChecklist({
  projectId,
  memberId,
  initialDone,
}: {
  projectId: string;
  memberId: string;
  initialDone: Record<string, boolean>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [done, setDone] = useState<Record<string, boolean>>(initialDone);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const completed = Object.values(done).filter(Boolean).length;
  const pct = Math.round((completed / READINESS_TOTAL) * 100);

  async function toggle(key: string) {
    const next = !done[key];
    setDone((d) => ({ ...d, [key]: next }));
    setSaving((s) => ({ ...s, [key]: true }));
    const { error } = await supabase
      .from("readiness_items")
      .upsert(
        {
          project_id: projectId,
          member_id: memberId,
          item_key: key,
          is_done: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,item_key" }
      );
    if (error) {
      // revert on failure
      setDone((d) => ({ ...d, [key]: !next }));
    }
    setSaving((s) => ({ ...s, [key]: false }));
  }

  // progress ring geometry
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <div>
      {/* progress header */}
      <div className="flex items-center gap-5 bg-white border border-[#ddd2c8] rounded-2xl px-6 py-5 mb-6">
        <div className="relative shrink-0" style={{ width: 84, height: 84 }}>
          <svg width="84" height="84" className="-rotate-90">
            <circle cx="42" cy="42" r={R} fill="none" stroke="#efe6dc" strokeWidth="8" />
            <circle
              cx="42"
              cy="42"
              r={R}
              fill="none"
              stroke="#9b7a8f"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C - (C * pct) / 100}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-extrabold text-[#3d1c1c] font-[Playfair_Display,serif]">
              {pct}%
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-[#3d1c1c] font-[Playfair_Display,serif]">
            {completed === READINESS_TOTAL
              ? "Fully set up — let's build."
              : `${completed} of ${READINESS_TOTAL} foundations in place`}
          </p>
          <p className="text-[13px] text-[#8b7b7b] mt-0.5">
            {completed === READINESS_TOTAL
              ? "Every box checked. Your business is ready to run."
              : `${READINESS_TOTAL - completed} left to lock in your foundation.`}
          </p>
        </div>
      </div>

      {/* categories */}
      <div className="grid gap-4 sm:grid-cols-2">
        {READINESS.map((cat) => {
          const catDone = cat.items.filter((i) => done[i.key]).length;
          return (
            <div key={cat.title} className="bg-white border border-[#ddd2c8] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#3d1c1c]">
                  <span className="mr-1.5">{cat.emoji}</span>
                  {cat.title}
                </h3>
                <span className="text-[11px] font-semibold text-[#9b7a8f] tabular-nums">
                  {catDone}/{cat.items.length}
                </span>
              </div>
              <ul className="space-y-1">
                {cat.items.map((item) => {
                  const checked = !!done[item.key];
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => toggle(item.key)}
                        disabled={saving[item.key]}
                        className="w-full flex items-start gap-3 text-left rounded-lg px-2 py-2 hover:bg-[#f5f0ea] transition-colors disabled:opacity-60"
                      >
                        <span
                          className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            checked
                              ? "bg-[#9b7a8f] border-[#9b7a8f] text-white"
                              : "border-[#cbb] bg-white"
                          }`}
                        >
                          {checked && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2.5 6.5L5 9L9.5 3.5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`block text-[14px] leading-snug ${
                              checked ? "text-[#8b7b7b] line-through" : "text-[#3d1c1c] font-medium"
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.hint && (
                            <span className="block text-[11px] text-[#a89] mt-0.5">{item.hint}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
