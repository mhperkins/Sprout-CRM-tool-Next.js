import GalleryForm from "@/components/GalleryForm";

// Gallery submission link (per event, or the standing open call). Never index it.
export const metadata = {
  title: "Gallery submission | Sprout Society",
  robots: { index: false, follow: false },
};

export default async function GalleryPage({ params }) {
  const { token } = await params;
  return <GalleryForm token={token} />;
}
