// 90-day GOAL window helpers. Ventures are long-term businesses — the 90-day
// clock lives on individual goals (goal.end_date), not on the venture.

export const GOAL_DAYS = 90;

function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return localISO(d);
}

// Default deadline for a new goal: today + 90 days.
export function defaultGoalEndISO(now: Date = new Date()): string {
  return addDays(localISO(now), GOAL_DAYS);
}

export type Countdown = { daysLeft: number; overdue: boolean };

// Days remaining until a goal's end_date (negative if past). null if no date.
export function goalCountdown(
  endISO: string | null | undefined,
  now: Date = new Date()
): Countdown | null {
  if (!endISO) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(endISO + "T00:00:00");
  const daysLeft = Math.round((end.getTime() - today.getTime()) / 86_400_000);
  return { daysLeft, overdue: daysLeft < 0 };
}
