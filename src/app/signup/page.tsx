"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/board");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-[#f5f0ea] to-[#ede6dc]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold tracking-[3px] uppercase text-[#3d1c1c] font-[Playfair_Display,serif]">
            Builder&apos;s Assembly
          </h1>
          <p className="text-xs tracking-[2px] uppercase text-[#9b7a8f] font-medium mt-2">
            Hospitality \u00b7 Community \u00b7 Momentum
          </p>
        </div>

        <form onSubmit={handleSignUp} className="bg-white rounded-2xl p-8 space-y-5 border border-[#ddd2c8] shadow-[0_4px_24px_rgba(61,28,28,0.06)]">
          <h2 className="text-xl font-bold text-center text-[#3d1c1c] font-[Playfair_Display,serif]">Join the Assembly</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[1px] text-[#8b6b6b] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#f5f0ea] border border-[#ddd2c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b7a8f]/30 focus:border-[#9b7a8f] text-[#3d1c1c] transition-all"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[1px] text-[#8b6b6b] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#f5f0ea] border border-[#ddd2c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9b7a8f]/30 focus:border-[#9b7a8f] text-[#3d1c1c] transition-all"
              placeholder="Min 6 characters"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#3d1c1c] hover:bg-[#5a3535] disabled:opacity-50 rounded-lg font-semibold tracking-[1px] uppercase text-sm text-white transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center text-[#8b7b7b] text-sm">
            Already a builder?{" "}
            <Link href="/login" className="text-[#9b7a8f] hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
