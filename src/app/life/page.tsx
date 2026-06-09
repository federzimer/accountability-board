import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import LifeGoalsList from "@/components/LifeGoalsList";
import { getMyMember, getMyLifeGoals } from "@/lib/data";
import { createClient } from "@/lib/supabase-server";
import type { LifeGoalKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const SECTIONS: {
  kind: LifeGoalKind;
  heading: string;
  blurb: string;
  titlePlaceholder: string;
  descPlaceholder: string;
  addLabel: string;
}[] = [
  {
    kind: "vision",
    heading: "Vision",
    blurb: "The broader direction everything ladders up to. Where are you headed?",
    titlePlaceholder: "e.g. Build a portfolio of cash-flowing businesses I love running",
    descPlaceholder: "What does the bigger picture look like?",
    addLabel: "Add vision",
  },
  {
    kind: "goal",
    heading: "Life Goals",
    blurb: "Bigger-than-a-business aims. Your ventures should serve these.",
    titlePlaceholder: "e.g. Financial freedom by 45",
    descPlaceholder: "What does hitting this look like, and why does it matter?",
    addLabel: "Add life goal",
  },
  {
    kind: "value",
    heading: "Values",
    blurb: "How you operate and what you won't trade away.",
    titlePlaceholder: "e.g. Freedom over status",
    descPlaceholder: "What this means in practice.",
    addLabel: "Add value",
  },
];

export default async function LifePage() {
  const member = await getMyMember();
  if (!member) redirect("/login");

  const all = await getMyLifeGoals();
  const byKind = (k: LifeGoalKind) => all.filter((g) => g.kind === k);

  // Which ventures serve each life goal (for chips under the Goals section).
  const supabase = await createClient();
  const goalIds = byKind("goal").map((g) => g.id);
  const venturesByGoal: Record<string, string[]> = {};
  if (goalIds.length) {
    const { data } = await supabase
      .from("project_life_goals")
      .select("life_goal_id, projects(name)")
      .in("life_goal_id", goalIds);
    const rows = (data ?? []) as unknown as {
      life_goal_id: string;
      projects: { name: string } | null;
    }[];
    for (const row of rows) {
      if (!row.projects) continue;
      (venturesByGoal[row.life_goal_id] ??= []).push(row.projects.name);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader active="/life" />
      <main className="p-6 max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-extrabold tracking-[1px] uppercase text-[#3d1c1c] font-[Playfair_Display,serif]">
            Life Goals
          </h2>
          <p className="text-[13px] text-[#9b7a8f] tracking-[1px] uppercase font-medium">
            Your north star · everything below ladders up to this
          </p>
        </div>

        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.kind}>
              <h3 className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#3d1c1c]">
                {s.heading}
              </h3>
              <p className="text-[12px] text-[#8b6b6b] mb-3">{s.blurb}</p>
              <LifeGoalsList
                kind={s.kind}
                memberId={member.id}
                initial={byKind(s.kind)}
                titlePlaceholder={s.titlePlaceholder}
                descPlaceholder={s.descPlaceholder}
                addLabel={s.addLabel}
                venturesByGoal={s.kind === "goal" ? venturesByGoal : {}}
              />
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
