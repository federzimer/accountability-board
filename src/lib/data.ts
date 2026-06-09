import { createClient } from "./supabase-server";
import type { Cycle, Member, Project } from "./types";

// Server-side helpers shared across pages.

// All ventures owned by the current member, newest first.
export async function getMyProjects(): Promise<Project[]> {
  const member = await getMyMember();
  if (!member) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("member_id", member.id)
    .order("created_at", { ascending: true });
  return (data as Project[]) ?? [];
}

// A single venture by id (RLS lets any authed user read; ownership is
// enforced on writes). Returns null if not found.
export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Project) ?? null;
}

export async function getCurrentCycle(): Promise<Cycle | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();
  return (data as Cycle) ?? null;
}

export async function getMyMember(): Promise<Member | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as Member) ?? null;
}
