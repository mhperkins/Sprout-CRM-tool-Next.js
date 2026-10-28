import MediaUploadForm from "@/components/MediaUploadForm";

// Per-event link guests use to send photos and video. Never index it.
export const metadata = {
  title: "Share your photos & video | Sprout Society",
  robots: { index: false, follow: false },
};

export default async function MediaPage({ params }) {
  const { token } = await params;
  return <MediaUploadForm token={token} />;
}
