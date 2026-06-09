import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import KanbanBoard, { type BoardProject } from "@/components/KanbanBoard";
import { createClient } from "@/lib/supabase-server";
import { getMyMember, getMyProjects } from "@/lib/data";
import type { Goal } from "@/lib/types";

export const dynamic = "force-dynamic";

// Consolidated board — every task across all of the member's ventures in one
// Kanban. Each card is tagged with its venture (chip + color stripe). For a
// single venture's board, see /ventures/[id]/board.
export default async function BoardPage() {
  const member = await getMyMember();
  if (!member) redirect("/login");

  const projects = await getMyProjects();
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("*")
    .eq("member_id", member.id)
    .order("created_at");
  const goals = (data as Goal[]) ?? [];

  const boardProjects: BoardProject[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }));

  return (
    <div className="min-h-screen">
      <AppHeader active="/board" />
      <main className="p-6 max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold tracking-[2px] uppercase text-[#3d1c1c] font-[Playfair_Display,serif] mb-1">
            All Tasks
          </h2>
          <p className="text-[13px] text-[#9b7a8f] tracking-[2px] uppercase font-medium">
            Every venture · one board · Commit → Build → Ship
          </p>
        </div>
        <KanbanBoard goals={goals} projects={boardProjects} />
      </main>
    </div>
  );
}
