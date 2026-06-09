import Link from "next/link";
import type { Project } from "@/lib/types";
import { colorForKey } from "@/lib/goalColors";

// Venture name + color. Ventures are long-term — no 90-day countdown here
// (that lives on goals). Shows a quiet "since" date for context.
export default function VentureHeader({ project }: { project: Project }) {
  const gc = colorForKey(project.color);
  const since = new Date(project.start_date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

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
        <p className="text-[11px] uppercase tracking-[1px] text-[#9b7a8f] shrink-0 pt-1">
          Since {since}
        </p>
      </div>
    </div>
  );
}
