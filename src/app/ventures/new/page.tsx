import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import VentureForm from "@/components/VentureForm";
import { getMyMember, getMyProjects } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewVenturePage() {
  const member = await getMyMember();
  if (!member) redirect("/login");

  const projects = await getMyProjects();
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen">
      <AppHeader active="/ventures" />
      <main className="p-6 max-w-2xl mx-auto">
        <Link href="/ventures" className="text-sm text-[#9b7a8f] hover:underline">
          ← All ventures
        </Link>
        <div className="my-5">
          <h2 className="text-2xl font-extrabold tracking-[1px] uppercase text-[#3d1c1c] font-[Playfair_Display,serif]">
            New Venture
          </h2>
          <p className="text-[13px] text-[#9b7a8f] tracking-[1px] uppercase font-medium">
            Spin up a business · it gets its own 90-day sprint
          </p>
        </div>
        <VentureForm
          memberId={member.id}
          usedColors={projects.map((p) => p.color)}
          todayISO={todayISO}
        />
      </main>
    </div>
  );
}
