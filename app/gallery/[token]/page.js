import { redirect } from "next/navigation";
import GalleryForm from "@/components/GalleryForm";
import { galleryFormByToken } from "@/lib/galleryDb";

// Gallery submission link for one event. The old standing open-call link is retired:
// it sends people to the one submission form at /submit instead.
export const metadata = {
  title: "Gallery submission | Sprout Society",
  robots: { index: false, follow: false },
};

export default async function GalleryPage({ params }) {
  const { token } = await params;
  let form = null;
  try { form = await galleryFormByToken(token); } catch { /* the form shows its own error */ }
  if (form?.kind === "open") redirect("/submit");
  return <GalleryForm token={token} />;
}
