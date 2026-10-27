// Shared shape for the public /get-involved form: the form, its API route and the
// CRM's Get Involved page all read these, so the choices can't drift apart.

export const INTERESTS = [
  { id: "events", label: "Upcoming events", short: "Events" },
  { id: "showcase", label: "Showcasing my work", short: "Showcasing" },
  { id: "hosting", label: "Hosting an event", short: "Hosting" },
  { id: "membership", label: "Membership", short: "Membership" },
  { id: "volunteering", label: "Volunteering", short: "Volunteering" },
  { id: "partnering", label: "Partnering", short: "Partnering" },
  { id: "question", label: "Just a question", short: "Question" },
];
export const INTEREST_IDS = INTERESTS.map((i) => i.id);
export const interestLabel = (id) => INTERESTS.find((i) => i.id === id)?.short || id;

// Same choices as the door sign-in page.
export const HEARD_OPTIONS = ["A friend", "Social media", "Flyer", "Reddit", "Other"];

export const LIMITS = { name: 120, email: 200, message: 2000, instagram: 80 };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Clean a raw POST body. Returns { data, problems } where problems is keyed by field. */
export function cleanInterest(body) {
  const str = (v, n) => String(v ?? "").trim().slice(0, n);
  const name = str(body?.name, LIMITS.name);
  const email = str(body?.email, LIMITS.email).toLowerCase();
  const interests = [...new Set((Array.isArray(body?.interests) ? body.interests : []).filter((i) => INTEREST_IDS.includes(i)))];
  const message = str(body?.message, LIMITS.message);
  let instagram = str(body?.instagram, LIMITS.instagram);
  if (instagram && !instagram.startsWith("@") && !instagram.includes("/")) instagram = "@" + instagram;
  const how_heard = HEARD_OPTIONS.includes(body?.how_heard) ? body.how_heard : "";

  const problems = {};
  if (!name) problems.name = "Add your name so we know who to reply to.";
  if (!EMAIL_RE.test(email)) problems.email = "Add an email we can reach you at.";
  if (!interests.length) problems.interests = "Pick at least one.";
  return { data: { name, email, interests, message, instagram, how_heard }, problems };
}
