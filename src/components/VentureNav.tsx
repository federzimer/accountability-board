import Link from "next/link";

// Sub-navigation tabs inside a single venture.
// `active` is the tab segment: "" (overview) | "goals" | "board" | "readiness".
const TABS = [
  { seg: "", label: "Overview" },
  { seg: "goals", label: "Goals" },
  { seg: "board", label: "Board" },
  { seg: "readiness", label: "Readiness" },
];

export default function VentureNav({ id, active }: { id: string; active: string }) {
  return (
    <div className="flex items-center gap-1 border-b border-[#ddd2c8] mb-6 overflow-x-auto">
      {TABS.map((t) => {
        const href = t.seg ? `/ventures/${id}/${t.seg}` : `/ventures/${id}`;
        const isActive = active === t.seg;
        return (
          <Link
            key={t.seg}
            href={href}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-all ${
              isActive
                ? "border-[#9b7a8f] text-[#3d1c1c]"
                : "border-transparent text-[#8b6b6b] hover:text-[#3d1c1c]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
