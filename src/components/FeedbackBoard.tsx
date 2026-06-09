"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { Feedback, FeedbackKind, FeedbackStatus } from "@/lib/types";

export type FeedbackItem = Feedback & {
  authorName: string;
  votes: number;
  voted: boolean;
};

const KIND_META: Record<FeedbackKind, { label: string; cls: string }> = {
  feature: { label: "Feature", cls: "bg-[#e9dde5] text-[#6f5263]" },
  bug: { label: "Bug", cls: "bg-[#f5dad7] text-[#9c4a44]" },
  idea: { label: "Idea", cls: "bg-[#f5ecd0] text-[#8a7327]" },
};

const STATUS_META: Record<FeedbackStatus, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-[#f0e8df] text-[#8b6b6b]" },
  planned: { label: "Planned", cls: "bg-[#d6e3f5] text-[#3a587f]" },
  in_progress: { label: "In progress", cls: "bg-[#f5ecd0] text-[#8a7327]" },
  done: { label: "Done", cls: "bg-[#dbe8d5] text-[#5a7456]" },
  declined: { label: "Declined", cls: "bg-[#eee] text-[#999]" },
};

const STATUSES: FeedbackStatus[] = ["open", "planned", "in_progress", "done", "declined"];

export default function FeedbackBoard({
  initialItems,
  myMemberId,
  isAdmin,
}: {
  initialItems: FeedbackItem[];
  myMemberId: string;
  isAdmin: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<FeedbackItem[]>(initialItems);
  const [kind, setKind] = useState<FeedbackKind>("feature");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!title.trim()) {
      setError("Add a short title.");
      return;
    }
    setBusy(true);
    setError("");
    const { data, error } = await supabase
      .from("feedback")
      .insert({ member_id: myMemberId, kind, title: title.trim(), detail: detail.trim() })
      .select("*")
      .single();
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    setItems((is) => [
      { ...(data as Feedback), authorName: "You", votes: 0, voted: false },
      ...is,
    ]);
    setTitle("");
    setDetail("");
    setKind("feature");
    setBusy(false);
  };

  const toggleVote = async (item: FeedbackItem) => {
    const voting = !item.voted;
    setItems((is) =>
      is.map((x) =>
        x.id === item.id ? { ...x, voted: voting, votes: x.votes + (voting ? 1 : -1) } : x
      )
    );
    if (voting) {
      await supabase.from("feedback_votes").insert({ feedback_id: item.id, member_id: myMemberId });
    } else {
      await supabase
        .from("feedback_votes")
        .delete()
        .eq("feedback_id", item.id)
        .eq("member_id", myMemberId);
    }
  };

  const setStatus = async (id: string, status: FeedbackStatus) => {
    setItems((is) => is.map((x) => (x.id === id ? { ...x, status } : x)));
    await supabase.from("feedback").update({ status }).eq("id", id);
  };

  // Sort: most-voted first, then newest.
  const sorted = [...items].sort(
    (a, b) => b.votes - a.votes || b.created_at.localeCompare(a.created_at)
  );

  const field =
    "w-full px-3 py-2 bg-[#f5f0ea] border border-[#ddd2c8] rounded-lg text-sm text-[#3d1c1c] focus:outline-none focus:ring-2 focus:ring-[#9b7a8f]/30 focus:border-[#9b7a8f] transition-all";

  return (
    <div>
      {/* submit */}
      <div className="bg-white border border-[#ddd2c8] rounded-2xl p-5 mb-6 space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <select
            className={`${field} w-32 shrink-0`}
            value={kind}
            onChange={(e) => setKind(e.target.value as FeedbackKind)}
          >
            <option value="feature">Feature</option>
            <option value="idea">Idea</option>
            <option value="bug">Bug</option>
          </select>
          <input
            className={field}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What would make this better?"
          />
        </div>
        <textarea
          className={`${field} resize-none`}
          rows={2}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Any detail (optional) — the problem, the use case…"
        />
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={busy}
            className="bg-[#3d1c1c] hover:bg-[#5a3535] disabled:opacity-50 text-white rounded-lg px-5 py-2 text-sm font-semibold tracking-[0.5px] transition-colors cursor-pointer"
          >
            {busy ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>

      {/* list */}
      <div className="space-y-2.5">
        {sorted.map((item) => {
          const k = KIND_META[item.kind];
          const st = STATUS_META[item.status];
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 bg-white border border-[#ddd2c8] rounded-xl p-4"
            >
              <button
                type="button"
                onClick={() => toggleVote(item)}
                className={`shrink-0 flex flex-col items-center justify-center w-12 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  item.voted
                    ? "bg-[#9b7a8f]/10 border-[#9b7a8f] text-[#9b7a8f]"
                    : "bg-[#f5f0ea] border-[#ddd2c8] text-[#8b7b7b] hover:border-[#c4a8b8]"
                }`}
                title={item.voted ? "Remove vote" : "Upvote"}
              >
                <span className="text-sm leading-none">▲</span>
                <span className="text-[13px] font-bold mt-0.5">{item.votes}</span>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] uppercase tracking-[1px] font-semibold px-2 py-0.5 rounded-full ${k.cls}`}>
                    {k.label}
                  </span>
                  <h3 className="font-bold text-[14px] text-[#3d1c1c]">{item.title}</h3>
                </div>
                {item.detail && (
                  <p className="text-[13px] text-[#8b6b6b] mt-1 leading-relaxed">{item.detail}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-[#a89]">{item.authorName}</span>
                  {isAdmin ? (
                    <select
                      value={item.status}
                      onChange={(e) => setStatus(item.id, e.target.value as FeedbackStatus)}
                      className="text-[11px] border border-[#ddd2c8] rounded px-1.5 py-0.5 text-[#8b6b6b] cursor-pointer bg-white"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_META[s].label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-[10px] uppercase tracking-[1px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>
                      {st.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-center text-sm text-[#8b7b7b] italic py-8">
            No feedback yet — be the first to suggest something.
          </p>
        )}
      </div>
    </div>
  );
}
