import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import CheckinFlow from "@/components/CheckinFlow";
import { createClient } from "@/lib/supabase-server";
import { getCurrentCycle, getMyMember } from "@/lib/data";
import { weekNumberForDate } from "@/lib/score";
import type { Cycle, Tactic, WeeklyCheckin } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  const member = await getMyMember();
  if (!member) redirect("/login");
  const cycle = await getCurrentCycle();

  return (
    <div className="min-h-screen">
      <AppHeader active="/checkin" />
      <main className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold tracking-[1px] uppercase text-[#3d1c1c] font-[Playfair_Display,serif]">
            Weekly Check-in
          </h2>
          <p className="text-[13px] text-[#9b7a8f] tracking-[1px] uppercase font-medium">
            {cycle ? cycle.name : "No active cycle"}
          </p>
        </div>

        {cycle ? (
          <CheckinForCycle cycle={cycle} memberId={member.id} />
        ) : (
          <p className="text-sm text-[#8b7b7b] italic">No active cycle.</p>
        )}
      </main>
    </div>
  );
}

async function CheckinForCycle({
  cycle,
  memberId,
}: {
  cycle: Cycle;
  memberId: string;
}) {
  const supabase = await createClient();
  const cycleId = cycle.id;
  const weekNumber = weekNumberForDate(cycle);

  const [{ data: tacticsData }, { data: existingData }] = await Promise.all([
    supabase
      .from("tactics")
      .select("*")
      .eq("member_id", memberId)
      // This week's set = still-open commitments + anything completed THIS week
      // (so the check-in stays stable after you tick things off).
      .or(
        `status.in.(committed,working_on),and(status.eq.completed,week_number.eq.${weekNumber})`
      )
      .order("position"),
    supabase
      .from("weekly_checkins")
      .select("*")
      .eq("member_id", memberId)
      .eq("cycle_id", cycleId)
      .eq("week_number", weekNumber)
      .maybeSingle(),
  ]);

  return (
    <CheckinFlow
      tactics={(tacticsData as Tactic[]) ?? []}
      existing={(existingData as WeeklyCheckin) ?? null}
      cycleId={cycleId}
      memberId={memberId}
      weekNumber={weekNumber}
    />
  );
}
