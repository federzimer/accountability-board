import Link from "next/link";
import type { Project } from "@/lib/types";
import { colorForKey } from "@/lib/goalColors";
import { sprintFromStart, SPRINT_DAYS } from "@/lib/sprint";

// Venture name, color, and 90-day sprint progress. Shown atop every venture page.
export default function VentureHeader({ project }: { project: Project }) {
  const gc = colorForKey(project.color);
  const sprint = sprintFromStart(project.start_date);

  return (
    <div className="mb-5">
      <Link href="/ventures" className="text-sm text-[#9b7a8f] hover:underline">
        ← All ventures
      </Link>
      <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold tracking-[0.5px] text-[#3d1c1c] font-[Playfair_Display,serif] flex items-center gap-2.5">
            {gc && <span className={`w-3 h-3 rounded-full shrink-0 ${gc.dot}`} />}
            {project.name}
          </h2>
          {project.description && (
            <p className="text-[13px] text-[#8b6b6b] mt-1 max-w-xl">{project.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[13px] font-semibold text-[#3d1c1c]">
            {sprint.ended ? "Sprint complete" : `Day ${sprint.dayOf} of ${SPRINT_DAYS}`}
          </p>
          <p className="text-[11px] uppercase tracking-[1px] text-[#9b7a8f]">
            {sprint.ended ? "90-day sprint" : `${sprint.daysLeft} days left`}
          </p>
        </div>
      </div>
      {/* sprint progress bar */}
      <div className="mt-3 h-1.5 w-full rounded-full bg-[#efe6dc] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#c4a8b8] to-[#9b7a8f] transition-all"
          style={{ width: `${sprint.pct}%` }}
        />
      </div>
    </div>
  );
}
