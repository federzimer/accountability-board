"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import type { LifeGoal } from "@/lib/types";

const KIND_LABEL: Record<string, string> = { vision: "Vision", goal: "Life goal", value: "Value" };

// Shows which life goals a venture serves, with an inline editor to link/unlink.
export default function VentureLifeGoalsLink({
  projectId,
  lifeGoals,
  initialLinked,
}: {
  projectId: string;
  lifeGoals: LifeGoal[];
  initialLinked: string[];
}) {
  const [supabase] = useState(() => createClient());
  const [linked, setLinked] = useState<Set<string>>(new Set(initialLinked));
  const [editing, setEditing] = useState(false);

  const toggle = async (id: string) => {
    const has = linked.has(id);
    const next = new Set(linked);
    if (has) next.delete(id);
    else next.add(id);
    setLinked(next);
    if (has) {
      await supabase
        .from("project_life_goals")
        .delete()
        .eq("project_id", projectId)
        .eq("life_goal_id", id);
    } else {
      await supabase
        .from("project_life_goals")
        .insert({ project_id: projectId, life_goal_id: id });
    }
  };

  const linkedGoals = lifeGoals.filter((g) => linked.has(g.id));

  return (
    <div className="bg-white border border-[#ddd2c8] rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#3d1c1c]">
          Serves your life goals
        </span>
        {lifeGoals.length > 0 && (
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="text-[12px] text-[#9b7a8f] hover:underline cursor-pointer"
          >
            {editing ? "Done" : "Edit"}
          </button>
        )}
      </div>

      {lifeGoals.length === 0 ? (
        <p className="text-[13px] text-[#8b6b6b] mt-2">
          No life goals yet —{" "}
          <Link href="/life" className="text-[#9b7a8f] hover:underline">
            define your north star
          </Link>{" "}
          so ventures can ladder up to it.
        </p>
      ) : editing ? (
        <ul className="mt-3 space-y-1">
          {lifeGoals.map((g) => {
            const on = linked.has(g.id);
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => toggle(g.id)}
                  className="w-full flex items-center gap-2.5 text-left rounded-lg px-2 py-1.5 hover:bg-[#f5f0ea] transition-colors"
                >
                  <span
                    className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      on ? "bg-[#9b7a8f] border-[#9b7a8f] text-white" : "border-[#c4a8b8] bg-white"
                    }`}
                  >
                    {on && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="text-[13px] text-[#3d1c1c]">{g.title}</span>
                  <span className="text-[10px] uppercase tracking-[1px] text-[#a89] ml-auto shrink-0">
                    {KIND_LABEL[g.kind] ?? g.kind}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : linkedGoals.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {linkedGoals.map((g) => (
            <span
              key={g.id}
              className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-[#9b7a8f]/10 text-[#6f5263]"
            >
              {g.title}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-[#8b6b6b] mt-2">
          Not linked yet — <button type="button" onClick={() => setEditing(true)} className="text-[#9b7a8f] hover:underline cursor-pointer">pick the life goals</button> this venture advances.
        </p>
      )}
    </div>
  );
}
