// Project (goal) color palette — muted tones that fit the cream/serif look.
// A goal stores a `color` key; tactic cards inherit it on the board.

export type GoalColor = {
  key: string;
  label: string;
  dot: string; // bg for the swatch/dot
  stripe: string; // left border accent on a card
  chipBg: string;
  chipText: string;
};

export const GOAL_COLORS: GoalColor[] = [
  { key: "sky",   label: "Sky",   dot: "bg-[#4a6fa5]", stripe: "border-l-[#4a6fa5]", chipBg: "bg-[#d6e3f5]", chipText: "text-[#3a587f]" },
  { key: "gold",  label: "Gold",  dot: "bg-[#c9a84c]", stripe: "border-l-[#c9a84c]", chipBg: "bg-[#f5ecd0]", chipText: "text-[#8a7327]" },
  { key: "sage",  label: "Sage",  dot: "bg-[#8ba888]", stripe: "border-l-[#8ba888]", chipBg: "bg-[#dbe8d5]", chipText: "text-[#5a7456]" },
  { key: "rose",  label: "Rose",  dot: "bg-[#d4736c]", stripe: "border-l-[#d4736c]", chipBg: "bg-[#f5dad7]", chipText: "text-[#9c4a44]" },
  { key: "plum",  label: "Plum",  dot: "bg-[#9b7a8f]", stripe: "border-l-[#9b7a8f]", chipBg: "bg-[#e9dde5]", chipText: "text-[#6f5263]" },
  { key: "clay",  label: "Clay",  dot: "bg-[#b87d56]", stripe: "border-l-[#b87d56]", chipBg: "bg-[#f0e0d2]", chipText: "text-[#8a5a39]" },
  { key: "teal",  label: "Teal",  dot: "bg-[#5b9aa0]", stripe: "border-l-[#5b9aa0]", chipBg: "bg-[#d5e8e9]", chipText: "text-[#3d6e72]" },
  { key: "slate", label: "Slate", dot: "bg-[#7d8597]", stripe: "border-l-[#7d8597]", chipBg: "bg-[#e0e3e9]", chipText: "text-[#565d6c]" },
];

export const GOAL_COLOR_BY_KEY = Object.fromEntries(
  GOAL_COLORS.map((c) => [c.key, c])
) as Record<string, GoalColor>;

export function colorForKey(key: string | null | undefined): GoalColor | null {
  if (!key) return null;
  return GOAL_COLOR_BY_KEY[key] ?? null;
}

// Pick the next unused color (falls back to round-robin once all are used).
export function nextColorKey(usedKeys: (string | null)[]): string {
  const used = new Set(usedKeys.filter(Boolean) as string[]);
  const free = GOAL_COLORS.find((c) => !used.has(c.key));
  if (free) return free.key;
  return GOAL_COLORS[used.size % GOAL_COLORS.length].key;
}
