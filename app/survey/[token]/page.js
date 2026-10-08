import SurveyForm from "@/components/SurveyForm";

// Private per-person link. Never index it.
export const metadata = {
  title: "A few questions | Sprout Society",
  robots: { index: false, follow: false },
};

export default async function SurveyPage({ params }) {
  const { token } = await params;
  return <SurveyForm token={token} />;
}
