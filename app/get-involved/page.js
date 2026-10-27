import GetInvolvedForm from "@/components/GetInvolvedForm";

// General interest form: linked from the thank-you emails. Covers more info, more
// events, and joining the community, for people who aren't booking a date.
export const metadata = {
  title: "Sprout Society | Get involved",
  description: "Tell us what you're curious about: events, showcasing, hosting, membership, volunteering, or just a question.",
};

export default function GetInvolvedPage() {
  return <GetInvolvedForm />;
}
