import type { TacticStatus } from "./types";

// Status visual tokens — extracted from the original KanbanBoard so every
// view (board, mini-board, prep, leaderboard) renders identical colors.
export type StatusMeta = {
  id: TacticStatus;
  title: string;
  desc: string;
  dotColor: string;
  titleColor: string;
  borderAccent: string;
  hoverBg: string;
  chipBg: string;
};

export const STATUS_META: StatusMeta[] = [
  {
    id: "committed",
    title: "Committed",
    desc: "Promised for this week",
    dotColor: "bg-[#4a6fa5]",
    titleColor: "text-[#4a6fa5]",
    borderAccent: "border-b-[#d6e3f5]",
    hoverBg: "hover:bg-[#d6e3f5]/30",
    chipBg: "bg-[#d6e3f5]",
  },
  {
    id: "working_on",
    title: "Working On",
    desc: "Actively in progress now",
    dotColor: "bg-[#c9a84c]",
    titleColor: "text-[#c9a84c]",
    borderAccent: "border-b-[#f5ecd0]",
    hoverBg: "hover:bg-[#f5ecd0]/30",
    chipBg: "bg-[#f5ecd0]",
  },
  {
    id: "completed",
    title: "Completed",
    desc: "Shipped & done this week",
    dotColor: "bg-[#8ba888]",
    titleColor: "text-[#8ba888]",
    borderAccent: "border-b-[#dbe8d5]",
    hoverBg: "hover:bg-[#dbe8d5]/30",
    chipBg: "bg-[#dbe8d5]",
  },
  {
    id: "blocked",
    title: "Blocked",
    desc: "Stuck — needs a decision or help",
    dotColor: "bg-[#d4736c]",
    titleColor: "text-[#d4736c]",
    borderAccent: "border-b-[#f5dad7]",
    hoverBg: "hover:bg-[#f5dad7]/30",
    chipBg: "bg-[#f5dad7]",
  },
];

export const STATUS_BY_ID = Object.fromEntries(
  STATUS_META.map((s) => [s.id, s])
) as Record<TacticStatus, StatusMeta>;
