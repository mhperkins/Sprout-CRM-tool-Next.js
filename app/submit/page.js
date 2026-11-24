import ShowcaseForm from "@/components/ShowcaseForm";

// The one public submission form for musicians, artists and makers. The Sprout N Tell
// TV slide QR, flyers and /showcase all land here. ?t=<token> reopens someone's own
// unfinished submission (the link in their reminder email).
export const metadata = {
  title: "Show your work | Sprout Society",
  description: "Musicians, artists and makers: submit your work to show at Sprout Society in Bushwick.",
};

export default async function SubmitPage({ searchParams }) {
  const sp = await searchParams;
  const t = typeof sp?.t === "string" ? sp.t : "";
  return <ShowcaseForm resumeToken={t} />;
}
