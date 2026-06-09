import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import FeedbackBoard, { type FeedbackItem } from "@/components/FeedbackBoard";
import { createClient } from "@/lib/supabase-server";
import { getMyMember } from "@/lib/data";
import type { Feedback } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = Feedback & { members: { name: string } | null };

export default async function FeedbackPage() {
  const member = await getMyMember();
  if (!member) redirect("/login");

  const supabase = await createClient();
  const [{ data: rows }, { data: votes }] = await Promise.all([
    supabase
      .from("feedback")
      .select("*, members!feedback_member_id_fkey(name)")
      .order("created_at", { ascending: false }),
    supabase.from("feedback_votes").select("feedback_id, member_id"),
  ]);

  const voteCount = new Map<string, number>();
  const myVotes = new Set<string>();
  for (const v of (votes as { feedback_id: string; member_id: string }[]) ?? []) {
    voteCount.set(v.feedback_id, (voteCount.get(v.feedback_id) ?? 0) + 1);
    if (v.member_id === member.id) myVotes.add(v.feedback_id);
  }

  const items: FeedbackItem[] = ((rows as Row[]) ?? []).map((r) => ({
    ...r,
    authorName: r.member_id === member.id ? "You" : r.members?.name ?? "Member",
    votes: voteCount.get(r.id) ?? 0,
    voted: myVotes.has(r.id),
  }));

  return (
    <div className="min-h-screen">
      <AppHeader active="/feedback" />
      <main className="p-6 max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-extrabold tracking-[1px] uppercase text-[#3d1c1c] font-[Playfair_Display,serif]">
            Feedback & Requests
          </h2>
          <p className="text-[13px] text-[#9b7a8f] tracking-[1px] uppercase font-medium">
            Shape the tool · upvote what matters most
          </p>
        </div>
        <FeedbackBoard initialItems={items} myMemberId={member.id} isAdmin={member.role === "admin"} />
      </main>
    </div>
  );
}
