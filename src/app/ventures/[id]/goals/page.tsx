import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import VentureNav from "@/components/VentureNav";
import VentureHeader from "@/components/VentureHeader";
import GoalEditor from "@/components/GoalEditor";
import BetBoard from "@/components/BetBoard";
import { createClient } from "@/lib/supabase-server";
import { getCurrentCycle, getMyMember, getProject } from "@/lib/data";
import type { Bet, Goal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VentureGoalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getMyMember();
  if (!member) redirect("/login");

  const project = await getProject(id);
  if (!project) notFound();

  const cycle = await getCurrentCycle();
  const supabase = await createClient();
  const [{ data: goalsData }, { data: betsData }] = await Promise.all([
    supabase.from("goals").select("*").eq("project_id", id).order("created_at"),
    supabase
      .from("bets")
      .select("*")
      .eq("project_id", id)
      .eq("status", "backlog")
      .order("rank"),
  ]);
  const goals = (goalsData as Goal[]) ?? [];
  const backlog = (betsData as Bet[]) ?? [];

  return (
    <div className="min-h-screen">
      <AppHeader active="/ventures" />
      <main className="p-6 max-w-2xl mx-auto">
        <VentureHeader project={project} />
        <VentureNav id={id} active="goals" />

        <p className="text-sm text-[#8b6b6b] mb-4 leading-relaxed">
          Set 1–3 measurable outcomes for this venture&apos;s 90-day sprint. Each goal is a
          number you&apos;re moving — board tactics are how you get there.
        </p>

        <Link
          href={`/ventures/${id}/goals/new`}
          className="flex items-center justify-between gap-3 mb-6 bg-[#3d1c1c] hover:bg-[#5a3535] text-white rounded-xl px-5 py-4 transition-colors group"
        >
          <span>
            <span className="block font-bold text-[15px] font-[Playfair_Display,serif]">
              Start the goal wizard
            </span>
            <span className="block text-[12px] text-white/70">
              Brainstorm → pick your bet → make it measurable → week one
            </span>
          </span>
          <span className="text-xl group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>

        <GoalEditor
          initialGoals={goals}
          cycleId={cycle?.id ?? null}
          memberId={member.id}
          projectId={id}
        />

        <BetBoard
          projectId={id}
          cycleId={cycle?.id ?? null}
          initialBets={backlog}
          goalsAtCapacity={goals.length >= 3}
        />
      </main>
    </div>
  );
}
