import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AppHeader from "@/components/AppHeader";
import CopyButton from "@/components/CopyButton";
import { getMyMember } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const member = await getMyMember();
  if (!member) redirect("/login");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "app.buildersassembly.com";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const feedUrl = `${proto}://${host}/api/calendar/${member.calendar_token}.ics`;

  const step = "flex gap-3 items-start";
  const num =
    "shrink-0 w-6 h-6 rounded-full bg-[#9b7a8f] text-white text-[12px] font-bold flex items-center justify-center";

  return (
    <div className="min-h-screen">
      <AppHeader active="/calendar" />
      <main className="p-6 max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-extrabold tracking-[1px] uppercase text-[#3d1c1c] font-[Playfair_Display,serif]">
            Calendar Sync
          </h2>
          <p className="text-[13px] text-[#9b7a8f] tracking-[1px] uppercase font-medium">
            Your task & goal deadlines, in your own calendar
          </p>
        </div>

        <div className="bg-white border border-[#ddd2c8] rounded-2xl p-6">
          <p className="text-sm text-[#8b6b6b] mb-4 leading-relaxed">
            Subscribe to this private feed and every task with a deadline (and each active 90-day
            goal) shows up on your calendar automatically — across all your ventures. It stays in
            sync; just keep the URL private.
          </p>

          <label className="block text-[11px] font-semibold uppercase tracking-[1px] text-[#8b6b6b] mb-1.5">
            Your private feed URL
          </label>
          <div className="flex gap-2 mb-6">
            <input
              readOnly
              value={feedUrl}
              className="flex-1 min-w-0 px-3 py-2 bg-[#f5f0ea] border border-[#ddd2c8] rounded-lg text-[13px] text-[#3d1c1c] font-mono"
            />
            <CopyButton text={feedUrl} label="Copy URL" />
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-[12px] font-bold uppercase tracking-[1.5px] text-[#3d1c1c] mb-2">
                Google Calendar
              </h3>
              <ol className="space-y-2 text-[13px] text-[#4a3a3a]">
                <li className={step}>
                  <span className={num}>1</span>
                  <span>
                    On a computer, open{" "}
                    <a
                      href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#9b7a8f] hover:underline"
                    >
                      Google Calendar → Other calendars → From URL
                    </a>
                    .
                  </span>
                </li>
                <li className={step}>
                  <span className={num}>2</span>
                  <span>Paste the URL above and click <span className="font-semibold">Add calendar</span>.</span>
                </li>
                <li className={step}>
                  <span className={num}>3</span>
                  <span>
                    Your deadlines appear within a little while. Google refreshes subscribed feeds on
                    its own schedule (often a few hours), so new tasks may not show instantly.
                  </span>
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-[12px] font-bold uppercase tracking-[1.5px] text-[#3d1c1c] mb-2">
                Apple Calendar
              </h3>
              <p className="text-[13px] text-[#4a3a3a]">
                File → New Calendar Subscription → paste the URL. On iPhone: Settings → Calendar →
                Accounts → Add Account → Other → Add Subscribed Calendar.
              </p>
            </div>
          </div>

          <p className="text-[12px] text-[#8b7b7b] italic mt-6">
            🔒 Anyone with this URL can see your deadline titles. If it leaks, ask to have it reset.
          </p>
        </div>
      </main>
    </div>
  );
}
