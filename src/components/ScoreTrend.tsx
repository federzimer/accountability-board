import { CYCLE_WEEKS } from "@/lib/score";

// Lightweight inline-SVG line chart for a member's 12-week execution score.
// No charting dependency — matches the cream/serif aesthetic.
export default function ScoreTrend({
  series,
  height = 120,
}: {
  series: (number | null)[];
  height?: number;
}) {
  const W = 320;
  const H = height;
  const padX = 8;
  const padY = 12;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const denom = Math.max(CYCLE_WEEKS - 1, 1);
  const xFor = (i: number) => padX + (i / denom) * innerW;
  const yFor = (v: number) => padY + innerH - (Math.min(v, 100) / 100) * innerH;

  const points = series
    .map((v, i) => (v === null ? null : { x: xFor(i), y: yFor(v), v, i }))
    .filter((p): p is { x: number; y: number; v: number; i: number } => p !== null);

  const path = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const hasData = points.length > 0;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Weekly execution score trend"
      >
        {/* gridlines at 0/50/100 */}
        {[0, 50, 100].map((g) => {
          const y = yFor(g);
          return (
            <g key={g}>
              <line
                x1={padX}
                x2={W - padX}
                y1={y}
                y2={y}
                stroke="#ddd2c8"
                strokeWidth={1}
                strokeDasharray={g === 0 ? "0" : "3 3"}
              />
            </g>
          );
        })}

        {hasData && (
          <>
            <path d={path} fill="none" stroke="#9b7a8f" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p) => (
              <circle key={p.i} cx={p.x} cy={p.y} r={3.5} fill="#fff" stroke="#9b7a8f" strokeWidth={2} />
            ))}
          </>
        )}
      </svg>
      {!hasData && (
        <p className="text-center text-xs text-[#8b7b7b] -mt-2">No check-ins logged yet</p>
      )}
    </div>
  );
}
