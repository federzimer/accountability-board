import { redirect } from "next/navigation";

// The board now lives inside a venture (/ventures/[id]/board). Old bookmarks
// land on the ventures list.
export default function BoardRedirect() {
  redirect("/ventures");
}
