import { redirect } from "next/navigation";

// The goal wizard now runs inside a venture (/ventures/[id]/goals/new).
export default function NewGoalRedirect() {
  redirect("/ventures");
}
