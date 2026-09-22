import ShowcaseForm from "@/components/ShowcaseForm";

// The standing public link that replaces the Sprout N Tell Google Form. This one IS
// meant to be found: it goes on flyers, the TV slide, Instagram and the sign-in page.
export const metadata = {
  title: "Showcase at Sprout N Tell | Sprout Society",
  description:
    "Apply to showcase your music or art at Sprout N Tell, a monthly showcase in Bushwick at Sprout Society.",
};

export default function ShowcasePage() {
  return <ShowcaseForm />;
}
