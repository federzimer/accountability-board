import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import VentureNav from "@/components/VentureNav";
import VentureHeader from "@/components/VentureHeader";
import ReadinessChecklist from "@/components/ReadinessChecklist";
import { createClient } from "@/lib/supabase-server";
import { getMyMember, getProject } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function VentureReadinessPage({
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
    .from("readiness_items")
    .select("item_key, is_done")
    .eq("project_id", id);
  const initialDone: Record<string, boolean> = Object.fromEntries(
    (data ?? []).map((r: { item_key: string; is_done: boolean }) => [r.item_key, r.is_done])
  );

  return (
    <div className="min-h-screen">
      <AppHeader active="/ventures" />
      <main className="p-6 max-w-3xl mx-auto">
        <VentureHeader project={project} />
        <VentureNav id={id} active="readiness" />
        <p className="text-sm text-[#8b6b6b] mb-5 leading-relaxed">
          The foundations <span className="font-semibold">{project.name}</span> needs in place.
        </p>
        <ReadinessChecklist projectId={id} memberId={member.id} initialDone={initialDone} />
      </main>
    </div>
  );
}
