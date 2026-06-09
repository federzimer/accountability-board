import Link from "next/link";
import SignOutButton from "./SignOutButton";
import { getMyMember } from "@/lib/data";

const NAV = [
  { href: "/life", label: "Life Goals" },
  { href: "/ventures", label: "Ventures" },
  { href: "/board", label: "Board" },
  { href: "/checkin", label: "Check-in" },
  { href: "/members", label: "Members" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/feedback", label: "Feedback" },
];

// Shared top bar. `active` is the href of the current page (for highlight).
export default async function AppHeader({ active }: { active?: string }) {
  const member = await getMyMember();

  return (
    <header className="bg-white border-b border-[#ddd2c8] px-6 md:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-6">
        <Link href="/board" className="shrink-0">
          <h1 className="text-base font-extrabold tracking-[2px] uppercase text-[#3d1c1c] font-[Playfair_Display,serif] leading-none">
            Builder&apos;s <span className="text-[#9b7a8f]">Assembly</span>
          </h1>
          <p className="text-[10px] tracking-[3px] uppercase text-[#9b7a8f] font-medium mt-0.5">
            Accountability Portal
          </p>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => {
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium tracking-[0.5px] transition-all ${
                  isActive
                    ? "bg-[#f5f0ea] text-[#3d1c1c]"
                    : "text-[#8b6b6b] hover:text-[#3d1c1c] hover:bg-[#f5f0ea]/60"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {member && (
          <span className="text-sm text-[#8b6b6b] font-medium hidden sm:inline">
            {member.name}
            {member.role === "admin" && (
              <span className="ml-1.5 text-[10px] uppercase tracking-[1px] text-[#9b7a8f] bg-[#9b7a8f]/10 px-1.5 py-0.5 rounded-full align-middle">
                Admin
              </span>
            )}
          </span>
        )}
        <SignOutButton />
      </div>
      {/* mobile nav */}
      <nav className="flex md:hidden w-full items-center gap-1 overflow-x-auto pb-0.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              active === item.href
                ? "bg-[#f5f0ea] text-[#3d1c1c]"
                : "text-[#8b6b6b] hover:bg-[#f5f0ea]/60"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
