import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import VentureNav from "@/components/VentureNav";
import VentureHeader from "@/components/VentureHeader";
import StakeholdersList from "@/components/StakeholdersList";
import { createClient } from "@/lib/supabase-server";
import { getMyMember, getProject } from "@/lib/data";
import type { Stakeholder } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VentureStakeholdersPage({
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
  const { data } = await supabase
    .from("stakeholders")
    .select("*")
    .eq("project_id", id)
    .order("position");
  const people = (data as Stakeholder[]) ?? [];

  return (
    <div className="min-h-screen">
      <AppHeader active="/ventures" />
      <main className="p-6 max-w-2xl mx-auto">
        <VentureHeader project={project} />
        <VentureNav id={id} active="stakeholders" />
        <p className="text-sm text-[#8b6b6b] mb-5 leading-relaxed">
          The people helping <span className="font-semibold">{project.name}</span> — who they are and
          what they unblock.
        </p>
        <StakeholdersList projectId={id} memberId={member.id} initial={people} />
      </main>
    </div>
  );
}
