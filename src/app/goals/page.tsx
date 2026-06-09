import { redirect } from "next/navigation";

// Goals now live inside a venture (/ventures/[id]/goals).
export default function GoalsRedirect() {
  redirect("/ventures");
}
