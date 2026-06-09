import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import VentureNav from "@/components/VentureNav";
import VentureHeader from "@/components/VentureHeader";
import GoalCard from "@/components/GoalCard";
import DeleteVentureButton from "@/components/DeleteVentureButton";
import { createClient } from "@/lib/supabase-server";
import { getMyMember, getProject } from "@/lib/data";
import { READINESS_TOTAL } from "@/lib/readiness";
import { STATUS_META } from "@/lib/tactics";
import type { Goal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VentureOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getMyMember();
  if (!member) redirect("/login");

  const project = await getProject(id);
  if (!project) notFound();

  const supabase = await createClient();
  const [
    { data: goalsData },
    { data: tacticsData },
    { data: readyData },
    { count: backlogCount },
    { count: peopleCount },
  ] = await Promise.all([
    supabase.from("goals").select("*").eq("project_id", id).order("created_at"),
    supabase.from("tactics").select("status").eq("project_id", id),
    supabase.from("readiness_items").select("is_done").eq("project_id", id),
    supabase
      .from("bets")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id)
      .eq("status", "backlog"),
    supabase.from("stakeholders").select("id", { count: "exact", head: true }).eq("project_id", id),
  ]);
  const goals = (goalsData as Goal[]) ?? [];
  const tactics = (tacticsData as { status: string }[]) ?? [];
  const readyDone = ((readyData as { is_done: boolean }[]) ?? []).filter((r) => r.is_done).length;
  const readyPct = Math.round((readyDone / READINESS_TOTAL) * 100);

  const countByStatus = (s: string) => tactics.filter((t) => t.status === s).length;

  return (
    <div className="min-h-screen">
      <AppHeader active="/ventures" />
      <main className="p-6 max-w-4xl mx-auto">
        <VentureHeader project={project} />
        <VentureNav id={id} active="" />

        {/* Goals */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#3d1c1c]">
              90-Day Goals
            </h3>
            <Link href={`/ventures/${id}/goals`} className="text-xs text-[#9b7a8f] hover:underline">
              {backlogCount ? `Manage · ${backlogCount} in Next up →` : "Manage →"}
            </Link>
          </div>
          {goals.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((g) => (
                <GoalCard key={g.id} goal={g} />
              ))}
            </div>
          ) : (
            <Link
              href={`/ventures/${id}/goals/new`}
              className="block bg-[#3d1c1c] hover:bg-[#5a3535] text-white rounded-xl px-5 py-4 transition-colors"
            >
              <span className="block font-bold text-[15px] font-[Playfair_Display,serif]">
                Set this venture&apos;s first 90-day goal
              </span>
              <span className="block text-[12px] text-white/70">
                Brainstorm → bet → measurable outcome → week one
              </span>
            </Link>
          )}
        </section>

        {/* Readiness + Board snapshot */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href={`/ventures/${id}/readiness`}
            className="bg-white border border-[#ddd2c8] rounded-xl p-5 hover:border-[#c4a8b8] hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#3d1c1c]">
                Readiness
              </h3>
              <span className="text-sm font-extrabold text-[#9b7a8f]">{readyPct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#f5f0ea] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#c4a8b8] to-[#9b7a8f]"
                style={{ width: `${readyPct}%` }}
              />
            </div>
            <p className="text-[12px] text-[#8b7b7b] mt-2">
              {readyDone} of {READINESS_TOTAL} foundations in place
            </p>
          </Link>

          <Link
            href={`/ventures/${id}/board`}
            className="bg-white border border-[#ddd2c8] rounded-xl p-5 hover:border-[#c4a8b8] hover:-translate-y-0.5 transition-all"
          >
            <h3 className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#3d1c1c] mb-3">
              Board
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              {STATUS_META.map((s) => (
                <div key={s.id} className="text-center">
                  <p className="text-lg font-extrabold text-[#3d1c1c] font-[Playfair_Display,serif] leading-none">
                    {countByStatus(s.id)}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.5px] text-[#8b7b7b] mt-1">
                    {s.title}
                  </p>
                </div>
              ))}
            </div>
          </Link>

          <Link
            href={`/ventures/${id}/stakeholders`}
            className="bg-white border border-[#ddd2c8] rounded-xl p-5 hover:border-[#c4a8b8] hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#3d1c1c]">
                Stakeholders
              </h3>
              <span className="text-sm font-extrabold text-[#9b7a8f]">{peopleCount ?? 0}</span>
            </div>
            <p className="text-[12px] text-[#8b7b7b]">
              {peopleCount
                ? `${peopleCount} ${peopleCount === 1 ? "person" : "people"} helping this venture`
                : "Add the people helping this venture"}
            </p>
          </Link>
        </section>

        {/* Danger zone */}
        <section className="mt-10 pt-5 border-t border-[#f0e8df] flex justify-end">
          <DeleteVentureButton
            projectId={id}
            projectName={project.name}
            goalCount={goals.length}
            tacticCount={tactics.length}
          />
        </section>
      </main>
    </div>
  );
}
