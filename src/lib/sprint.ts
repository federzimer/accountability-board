// 90-day sprint math for a venture, anchored on its start_date.

export const SPRINT_DAYS = 90;

export type Sprint = {
  startISO: string;
  endISO: string;
  dayOf: number; // 1-based day within the sprint (clamped 1..90)
  daysLeft: number; // remaining days (0..90)
  pct: number; // elapsed %
  ended: boolean;
};

function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function sprintFromStart(startISO: string, now: Date = new Date()): Sprint {
  const start = new Date(startISO + "T00:00:00");
  const today = dateOnly(now);
  const elapsed = Math.floor((today.getTime() - dateOnly(start).getTime()) / 86_400_000);
  const dayOf = Math.min(Math.max(elapsed + 1, 1), SPRINT_DAYS);
  const daysLeft = Math.min(Math.max(SPRINT_DAYS - elapsed, 0), SPRINT_DAYS);
  return {
    startISO,
    endISO: addDays(startISO, SPRINT_DAYS),
    dayOf,
    daysLeft,
    pct: Math.min(Math.max(Math.round((elapsed / SPRINT_DAYS) * 100), 0), 100),
    ended: elapsed >= SPRINT_DAYS,
  };
}
