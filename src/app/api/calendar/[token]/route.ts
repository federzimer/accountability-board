// Public, tokenized ICS feed of a member's deadlines (tasks + active goals).
// Subscribe in Google/Apple/Outlook. Read-only; the token is the secret.
// Data is fetched via the security-definer `calendar_feed` RPC (anon-callable),
// so no service-role key is needed here.

export const dynamic = "force-dynamic";

type FeedRow = {
  kind: "task" | "goal";
  item_id: string;
  title: string;
  event_date: string; // YYYY-MM-DD
  venture: string;
  extra: string;
};

// Escape per RFC 5545 text rules.
function esc(s: string): string {
  return (s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function ymd(dateISO: string): string {
  return dateISO.replace(/-/g, "");
}

function nextDayYmd(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

// Fold long lines at 75 octets per RFC 5545.
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let s = line;
  parts.push(s.slice(0, 73));
  s = s.slice(73);
  while (s.length > 72) {
    parts.push(" " + s.slice(0, 72));
    s = s.slice(72);
  }
  if (s.length) parts.push(" " + s);
  return parts.join("\r\n");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: raw } = await params;
  const token = raw.replace(/\.ics$/i, "");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let rows: FeedRow[] = [];
  // Only query for a plausibly-valid uuid; otherwise just serve an empty feed.
  if (/^[0-9a-f-]{36}$/i.test(token)) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/calendar_feed`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_token: token }),
        cache: "no-store",
      });
      if (res.ok) rows = (await res.json()) as FeedRow[];
    } catch {
      // serve an empty (but valid) calendar rather than erroring the subscription
    }
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Builders Assembly//Ventures//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Builders Assembly Deadlines",
    "NAME:Builders Assembly Deadlines",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];

  for (const r of rows) {
    if (!r.event_date) continue;
    const isGoal = r.kind === "goal";
    const icon = isGoal ? "🎯" : "✓";
    const suffix = r.venture ? ` — ${r.venture}` : "";
    const summary = `${icon} ${isGoal ? "Goal: " : ""}${r.title}${suffix}`;
    const desc = isGoal
      ? r.extra
        ? `90-day goal · metric: ${r.extra}`
        : "90-day goal deadline"
      : r.extra
      ? `Task toward: ${r.extra}`
      : "Task deadline";

    lines.push(
      "BEGIN:VEVENT",
      fold(`UID:${r.kind}-${r.item_id}@buildersassembly.com`),
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(r.event_date)}`,
      `DTEND;VALUE=DATE:${nextDayYmd(r.event_date)}`,
      fold(`SUMMARY:${esc(summary)}`),
      fold(`DESCRIPTION:${esc(desc)}`),
      "TRANSP:TRANSPARENT",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  const body = lines.join("\r\n") + "\r\n";

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="builders-assembly.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
