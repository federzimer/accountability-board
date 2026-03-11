import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import KanbanBoard from "@/components/KanbanBoard";
import SignOutButton from "@/components/SignOutButton";

export default async function BoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-[#ddd2c8] px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold tracking-[2px] uppercase text-[#3d1c1c] font-[Playfair_Display,serif]">
            Builder&apos;s <span className="text-[#9b7a8f]">Assembly</span>
          </h1>
          <p className="text-[11px] tracking-[3px] uppercase text-[#9b7a8f] font-medium">
            Accountability Board
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#8b6b6b] font-medium">
            {user.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center mb-7 py-5">
          <h2 className="text-2xl font-extrabold tracking-[2px] uppercase text-[#3d1c1c] font-[Playfair_Display,serif] mb-1.5">
            Your Accountability Board
          </h2>
          <p className="text-[13px] text-[#9b7a8f] tracking-[2px] uppercase font-medium">
            Commit \u00b7 Build \u00b7 Ship \u00b7 Repeat
          </p>
        </div>
        <KanbanBoard />
      </div>
    </div>
  );
}
