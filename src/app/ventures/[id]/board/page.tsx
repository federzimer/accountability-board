import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import VentureNav from "@/components/VentureNav";
import VentureHeader from "@/components/VentureHeader";
import KanbanBoard from "@/components/KanbanBoard";
import { createClient } from "@/lib/supabase-server";
import { getMyMember, getProject } from "@/lib/data";
import type { Goal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VentureBoardPage({
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
    .from("goals")
    .select("*")
    .eq("project_id", id)
    .order("created_at");
  const goals = (data as Goal[]) ?? [];

  return (
    <div className="min-h-screen">
      <AppHeader active="/ventures" />
      <main className="p-6 max-w-7xl mx-auto">
        <VentureHeader project={project} />
        <VentureNav id={id} active="board" />
        <KanbanBoard goals={goals} projectId={id} />
      </main>
    </div>
  );
}
