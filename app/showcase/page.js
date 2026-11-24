import { redirect } from "next/navigation";

// /showcase was the old application link (still on flyers and the sign-in page).
// Everything now goes through the one submission form.
export default function ShowcasePage() {
  redirect("/submit");
}
