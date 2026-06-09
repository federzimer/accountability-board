import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import GoalCard from "@/components/GoalCard";
import ScoreTrend from "@/components/ScoreTrend";
import MiniBoard from "@/components/MiniBoard";
import PrepPanel from "@/components/PrepPanel";
import { createClient } from "@/lib/supabase-server";
import { getCurrentCycle } from "@/lib/data";
import { averageScore, weeklySeries } from "@/lib/score";
import type { Goal, Member, Tactic, WeeklyCheckin } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MemberDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const cycle = await getCurrentCycle();

  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!member) notFound();
  const m = member as Member;

  const [{ data: goalsData }, { data: tacticsData }, { data: checkinsData }] =
    await Promise.all([
      cycle
        ? supabase
            .from("goals")
            .select("*")
            .eq("member_id", id)
            .eq("cycle_id", cycle.id)
            .order("created_at")
        : Promise.resolve({ data: [] as Goal[] }),
      supabase
        .from("tactics")
        .select("*")
        .eq("member_id", id)
        .order("position"),
      cycle
        ? supabase
            .from("weekly_checkins")
            .select("*")
            .eq("member_id", id)
            .eq("cycle_id", cycle.id)
            .order("week_number")
        : Promise.resolve({ data: [] as WeeklyCheckin[] }),
    ]);

  const goals = (goalsData as Goal[]) ?? [];
  const tactics = (tacticsData as Tactic[]) ?? [];
  const checkins = (checkinsData as WeeklyCheckin[]) ?? [];

  const avg = averageScore(checkins);
  const series = weeklySeries(checkins);
  const latest = checkins.filter((c) => c.score !== null).at(-1) ?? null;

  return (
    <div className="min-h-screen">
      <AppHeader active="/members" />
      <main className="p-6 max-w-5xl mx-auto space-y-6">
        <Link href="/members" className="text-sm text-[#9b7a8f] hover:underline">
          ← All members
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-[#3d1c1c] font-[Playfair_Display,serif]">
              {m.name}
            </h2>
            <p className="text-[13px] text-[#8b7b7b]">{m.email}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold text-[#9b7a8f] font-[Playfair_Display,serif] leading-none">
              {avg}%
            </div>
            <p className="text-[11px] uppercase tracking-[1px] text-[#8b7b7b] mt-1">
              cycle avg score
            </p>
          </div>
        </div>

        <PrepPanel
          goals={goals}
          tactics={tactics}
          latestScore={latest?.score ?? null}
          latestWeek={latest?.week_number ?? null}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <h3 className="text-sm font-bold uppercase tracking-[2px] text-[#3d1c1c] font-[Playfair_Display,serif] mb-3">
              {cycle?.name ?? ""} Goals
            </h3>
            <div className="space-y-3">
              {goals.length ? (
                goals.map((g) => <GoalCard key={g.id} goal={g} />)
              ) : (
                <p className="text-sm text-[#8b7b7b] italic">No goals set this cycle.</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-[2px] text-[#3d1c1c] font-[Playfair_Display,serif] mb-3">
              12-Week Execution
            </h3>
            <div className="bg-white border border-[#ddd2c8] rounded-xl p-5">
              <ScoreTrend series={series} />
            </div>
          </section>
        </div>

        <section>
          <h3 className="text-sm font-bold uppercase tracking-[2px] text-[#3d1c1c] font-[Playfair_Display,serif] mb-3">
            Current Board
          </h3>
          <MiniBoard tactics={tactics} goals={goals} />
        </section>
      </main>
    </div>
  );
}
