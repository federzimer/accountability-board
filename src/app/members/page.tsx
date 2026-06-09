import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase-server";
import { getCurrentCycle } from "@/lib/data";
import { averageScore, weekNumberForDate } from "@/lib/score";
import type { Member, WeeklyCheckin } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const supabase = await createClient();
  const cycle = await getCurrentCycle();

  const { data: members } = await supabase
    .from("members")
    .select("*")
    .order("role", { ascending: true })
    .order("name", { ascending: true });

  const memberList = (members as Member[]) ?? [];

  // Pull all check-ins for the current cycle once, then group per member.
  const checkinsByMember = new Map<string, WeeklyCheckin[]>();
  if (cycle) {
    const { data: checkins } = await supabase
      .from("weekly_checkins")
      .select("*")
      .eq("cycle_id", cycle.id);
    for (const c of (checkins as WeeklyCheckin[]) ?? []) {
      const arr = checkinsByMember.get(c.member_id) ?? [];
      arr.push(c);
      checkinsByMember.set(c.member_id, arr);
    }
  }

  const currentWeek = cycle ? weekNumberForDate(cycle) : null;

  return (
    <div className="min-h-screen">
      <AppHeader active="/members" />
      <main className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold tracking-[1px] uppercase text-[#3d1c1c] font-[Playfair_Display,serif]">
            Members
          </h2>
          <p className="text-[13px] text-[#9b7a8f] tracking-[1px] uppercase font-medium">
            {cycle ? cycle.name : "The Assembly"} · {memberList.length} builders
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberList.map((m) => {
            const avg = averageScore(checkinsByMember.get(m.id) ?? []);
            return (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                className="bg-white border border-[#ddd2c8] rounded-xl p-5 hover:border-[#c4a8b8] hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#3d1c1c]/5 transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Avatar member={m} />
                  <div className="min-w-0">
                    <p className="font-bold text-[15px] text-[#3d1c1c] font-[Playfair_Display,serif] truncate">
                      {m.name}
                    </p>
                    <p className="text-xs text-[#8b7b7b] truncate">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[1px] text-[#8b7b7b] font-medium">
                    {m.role === "admin" ? "Mentor" : "Member"}
                    {!m.is_active && " · inactive"}
                  </span>
                  <span className="text-sm font-semibold text-[#9b7a8f]">{avg}%</span>
                </div>
              </Link>
            );
          })}
        </div>
        {currentWeek && (
          <p className="text-center text-xs text-[#8b7b7b] mt-6">
            Scores are cycle-to-date averages · currently week {currentWeek}
          </p>
        )}
      </main>
    </div>
  );
}

function Avatar({ member }: { member: Member }) {
  const initials = member.name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (member.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={member.avatar_url}
        alt={member.name}
        className="w-11 h-11 rounded-full object-cover border border-[#ddd2c8]"
      />
    );
  }
  return (
    <div className="w-11 h-11 rounded-full bg-[#9b7a8f]/15 border border-[#c4a8b8] flex items-center justify-center text-[#9b7a8f] font-bold text-sm shrink-0">
      {initials || "?"}
    </div>
  );
}
