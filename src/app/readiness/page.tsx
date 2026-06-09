import { redirect } from "next/navigation";

// Readiness is now per-venture (/ventures/[id]/readiness).
export default function ReadinessRedirect() {
  redirect("/ventures");
}
