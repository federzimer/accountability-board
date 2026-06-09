import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase-server";
import { getCurrentCycle } from "@/lib/data";
import { averageScore, weekNumberForDate } from "@/lib/score";
import type { Member, WeeklyCheckin } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const cycle = await getCurrentCycle();

  const { data: membersData } = await supabase
    .from("members")
    .select("*")
    .eq("is_active", true);
  const members = (membersData as Member[]) ?? [];

  const byMember = new Map<string, WeeklyCheckin[]>();
  let currentWeek: number | null = null;
  if (cycle) {
    currentWeek = weekNumberForDate(cycle);
    const { data: checkins } = await supabase
      .from("weekly_checkins")
      .select("*")
      .eq("cycle_id", cycle.id);
    for (const c of (checkins as WeeklyCheckin[]) ?? []) {
      const arr = byMember.get(c.member_id) ?? [];
      arr.push(c);
      byMember.set(c.member_id, arr);
    }
  }

  const rows = members
    .map((m) => {
      const cs = byMember.get(m.id) ?? [];
      const avg = averageScore(cs);
      const thisWeek =
        currentWeek != null
          ? cs.find((c) => c.week_number === currentWeek)?.score ?? null
          : null;
      return { member: m, avg, thisWeek, weeks: cs.filter((c) => c.score !== null).length };
    })
    .sort((a, b) => b.avg - a.avg);

  const medal = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen">
      <AppHeader active="/leaderboard" />
      <main className="p-6 max-w-3xl mx-auto">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-extrabold tracking-[1px] uppercase text-[#3d1c1c] font-[Playfair_Display,serif]">
            Leaderboard
          </h2>
          <p className="text-[13px] text-[#9b7a8f] tracking-[1px] uppercase font-medium">
            {cycle ? cycle.name : "No cycle"} · doing what you committed to
          </p>
        </div>

        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <Link
              key={r.member.id}
              href={`/members/${r.member.id}`}
              className={`flex items-center gap-4 bg-white border rounded-xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#3d1c1c]/5 ${
                i === 0 ? "border-[#c9a84c]/60" : "border-[#ddd2c8] hover:border-[#c4a8b8]"
              }`}
            >
              <div className="w-8 text-center text-lg font-bold text-[#9b7a8f] shrink-0">
                {medal[i] ?? <span className="text-[#8b7b7b]">{i + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[15px] text-[#3d1c1c] font-[Playfair_Display,serif] truncate">
                  {r.member.name}
                </p>
                <p className="text-[11px] text-[#8b7b7b] uppercase tracking-[1px]">
                  {r.weeks} {r.weeks === 1 ? "week" : "weeks"} logged
                </p>
              </div>
              {r.thisWeek !== null && (
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-[#3d1c1c]">{r.thisWeek}%</p>
                  <p className="text-[10px] uppercase tracking-[1px] text-[#8b7b7b]">
                    this week
                  </p>
                </div>
              )}
              <div className="text-right shrink-0 w-16">
                <p className="text-xl font-extrabold text-[#9b7a8f] font-[Playfair_Display,serif] leading-none">
                  {r.avg}%
                </p>
                <p className="text-[10px] uppercase tracking-[1px] text-[#8b7b7b] mt-1">
                  cycle avg
                </p>
              </div>
            </Link>
          ))}
          {rows.length === 0 && (
            <p className="text-center text-sm text-[#8b7b7b] italic py-8">
              No active members yet.
            </p>
          )}
        </div>
        <p className="text-center text-xs text-[#8b7b7b] mt-6 italic">
          Ranked by cycle-to-date average execution score. Show up, commit, ship.
        </p>
      </main>
    </div>
  );
}
