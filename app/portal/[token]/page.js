import EventPortal from "@/components/EventPortal";

// Private per-event link. Never index it.
export const metadata = {
  title: "Your event | Sprout Society",
  robots: { index: false, follow: false },
};

export default async function PortalPage({ params }) {
  const { token } = await params;
  return <EventPortal token={token} />;
}
