import ProgramForm from "@/components/ProgramForm";

// Per-event link sent to artists and musicians. Never index it.
export const metadata = {
  title: "Program info | Sprout Society",
  robots: { index: false, follow: false },
};

export default async function ProgramPage({ params }) {
  const { token } = await params;
  return <ProgramForm token={token} />;
}
