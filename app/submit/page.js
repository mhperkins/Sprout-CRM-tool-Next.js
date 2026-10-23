import SubmitList from "@/components/SubmitList";

// Call for submissions: the QR on the Sprout N Tell TV slide lands here.
export const metadata = {
  title: "Sprout Society | Show your work at Sprout N Tell",
  description: "Artists and musicians: leave your email and we'll send you the Sprout N Tell submission form.",
};

export default function SubmitPage() {
  return <SubmitList />;
}
