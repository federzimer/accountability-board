import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase-server";
import { getMyMember, getMyProjects } from "@/lib/data";
import { colorForKey } from "@/lib/goalColors";
import { sprintFromStart, SPRINT_DAYS } from "@/lib/sprint";
import { READINESS_TOTAL } from "@/lib/readiness";

export const dynamic = "force-dynamic";

export default async function VenturesPage() {
  const member = await getMyMember();
  if (!member) redirect("/login");

  const projects = await getMyProjects();
  const supabase = await createClient();

  // counts per venture (goals + readiness completion) in two batched queries
  const ids = projects.map((p) => p.id);
  const goalCount = new Map<string, number>();
  const readyCount = new Map<string, number>();
  if (ids.length) {
    const { data: goals } = await supabase
      .from("goals")
      .select("project_id")
      .in("project_id", ids);
    for (const g of (goals as { project_id: string }[]) ?? [])
      goalCount.set(g.project_id, (goalCount.get(g.project_id) ?? 0) + 1);

    const { data: ready } = await supabase
      .from("readiness_items")
      .select("project_id, is_done")
      .in("project_id", ids);
    for (const r of (ready as { project_id: string; is_done: boolean }[]) ?? [])
      if (r.is_done) readyCount.set(r.project_id, (readyCount.get(r.project_id) ?? 0) + 1);
  }

  return (
    <div className="min-h-screen">
      <AppHeader active="/ventures" />
      <main className="p-6 max-w-4xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-extrabold tracking-[1px] uppercase text-[#3d1c1c] font-[Playfair_Display,serif]">
              My Ventures
            </h2>
            <p className="text-[13px] text-[#9b7a8f] tracking-[1px] uppercase font-medium">
              Each business · its own 90-day goals, board & readiness
            </p>
          </div>
          <Link
            href="/ventures/new"
            className="bg-[#3d1c1c] hover:bg-[#5a3535] text-white rounded-lg px-4 py-2.5 text-sm font-semibold tracking-[0.5px] transition-colors"
          >
            + New venture
          </Link>
        </div>

        {projects.length === 0 ? (
          <Link
            href="/ventures/new"
            className="flex items-center justify-between gap-3 bg-[#3d1c1c] hover:bg-[#5a3535] text-white rounded-xl px-6 py-5 transition-colors group"
          >
            <span>
              <span className="block font-bold text-[16px] font-[Playfair_Display,serif]">
                Start your first venture
              </span>
              <span className="block text-[12px] text-white/70">
                Name the business, set its 90-day window, then add goals & readiness.
              </span>
            </span>
            <span className="text-2xl group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((p) => {
              const gc = colorForKey(p.color);
              const sprint = sprintFromStart(p.start_date);
              const goals = goalCount.get(p.id) ?? 0;
              const ready = readyCount.get(p.id) ?? 0;
              return (
                <Link
                  key={p.id}
                  href={`/ventures/${p.id}`}
                  className={`bg-white border border-[#ddd2c8] border-l-4 ${
                    gc?.stripe ?? "border-l-[#ddd2c8]"
                  } rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#3d1c1c]/5 hover:border-[#c4a8b8]`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {gc && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${gc.dot}`} />}
                    <h3 className="font-bold text-[16px] text-[#3d1c1c] font-[Playfair_Display,serif] truncate">
                      {p.name}
                    </h3>
                  </div>
                  {p.description && (
                    <p className="text-[13px] text-[#8b6b6b] line-clamp-2 mb-3">{p.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-[11px] uppercase tracking-[1px] text-[#8b7b7b] mt-3">
                    <span>{goals} {goals === 1 ? "goal" : "goals"}</span>
                    <span>{ready}/{READINESS_TOTAL} ready</span>
                    <span className="ml-auto text-[#9b7a8f] font-semibold">
                      {sprint.ended ? "sprint done" : `${sprint.daysLeft}d left`}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
