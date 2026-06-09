"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

// Two-step delete for a venture. Deleting cascades its goals, bets, board
// tasks, and readiness, so we make the user confirm with the scope spelled out.
export default function DeleteVentureButton({
  projectId,
  projectName,
  goalCount,
  tacticCount,
}: {
  projectId: string;
  projectName: string;
  goalCount: number;
  tacticCount: number;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const remove = async () => {
    setDeleting(true);
    setError("");
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) {
      setError(error.message);
      setDeleting(false);
      return;
    }
    router.push("/ventures");
    router.refresh();
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-[13px] text-[#8b7b7b] hover:text-[#d4736c] border border-[#ddd2c8] hover:border-[#d4736c] rounded-lg px-3 py-2 transition-all cursor-pointer"
      >
        Delete venture
      </button>
    );
  }

  return (
    <div className="bg-[#f5dad7]/40 border border-[#d4736c]/40 rounded-xl p-4">
      <p className="text-[13px] text-[#3d1c1c] font-semibold mb-1">
        Delete &ldquo;{projectName}&rdquo;?
      </p>
      <p className="text-[12px] text-[#8b6b6b] mb-3">
        This permanently removes its {goalCount} {goalCount === 1 ? "goal" : "goals"},
        {" "}
        {tacticCount} board {tacticCount === 1 ? "task" : "tasks"}, all bets, and its readiness
        checklist. This can&apos;t be undone.
      </p>
      {error && <p className="text-[12px] text-[#d4736c] mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          className="bg-[#d4736c] hover:bg-[#bd5d57] disabled:opacity-50 text-white rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors cursor-pointer"
        >
          {deleting ? "Deleting…" : "Delete permanently"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="text-[13px] text-[#8b7b7b] hover:text-[#3d1c1c] border border-[#ddd2c8] rounded-lg px-4 py-2 transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
