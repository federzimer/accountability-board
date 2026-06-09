import type { Cycle, WeeklyCheckin } from "./types";

// A 90-day cycle, displayed as a 12-week execution trend.
export const CYCLE_WEEKS = 12;

// 1-based week number of `date` within a cycle (clamped to 1..CYCLE_WEEKS).
export function weekNumberForDate(cycle: Cycle, date: Date = new Date()): number {
  const start = new Date(cycle.start_date + "T00:00:00");
  const days = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  const wk = Math.floor(days / 7) + 1;
  return Math.min(Math.max(wk, 1), CYCLE_WEEKS);
}

// Execution score for a single week: completed / committed * 100 (0 if none committed).
export function computeScore(committed: number, completed: number): number {
  if (committed <= 0) return 0;
  return Math.round((completed / committed) * 1000) / 10; // one decimal
}

// Cycle-to-date average of weekly scores (only weeks with a check-in count).
export function averageScore(checkins: WeeklyCheckin[]): number {
  const scored = checkins.filter((c) => c.score !== null);
  if (scored.length === 0) return 0;
  const sum = scored.reduce((acc, c) => acc + (c.score ?? 0), 0);
  return Math.round((sum / scored.length) * 10) / 10;
}

// Build a dense 12-week series (null where no check-in exists yet).
export function weeklySeries(checkins: WeeklyCheckin[]): (number | null)[] {
  const byWeek = new Map(checkins.map((c) => [c.week_number, c.score]));
  return Array.from({ length: CYCLE_WEEKS }, (_, i) => byWeek.get(i + 1) ?? null);
}
