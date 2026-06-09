import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import VentureHeader from "@/components/VentureHeader";
import GoalWizard from "@/components/GoalWizard";
import { getCurrentCycle, getMyMember, getProject } from "@/lib/data";
import { sprintFromStart } from "@/lib/sprint";

export const dynamic = "force-dynamic";

export default async function VentureNewGoalPage({
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
  const sprint = sprintFromStart(project.start_date);

  return (
    <div className="min-h-screen">
      <AppHeader active="/ventures" />
      <main className="p-6 max-w-2xl mx-auto">
        <VentureHeader project={project} />
        <div className="mb-5">
          <h3 className="text-xl font-extrabold tracking-[0.5px] text-[#3d1c1c] font-[Playfair_Display,serif]">
            Set a 90-Day Goal
          </h3>
          <p className="text-[13px] text-[#9b7a8f] tracking-[1px] uppercase font-medium">
            brainstorm → bet → goal → week one
          </p>
        </div>
        <GoalWizard
          memberId={member.id}
          cycleId={cycle?.id ?? null}
          projectId={id}
          sprintEnd={sprint.endISO}
        />
      </main>
    </div>
  );
}
