// lib/showcaseForm.js — the public showcase application: fields, cleaning, helpers.
//
// Shared by the public form (/showcase), its API route, and the CRM's Showcase
// applications view, so all three read one shape. This replaces the Sprout N Tell
// Google Form. It is an APPLICATION, not a program entry: it asks what someone
// would showcase and how to hear their work. Bio and photo come later, through the
// per-event program form, once Max accepts them.

export const SHOWCASE_ROLES = ["Music", "Art", "Something else"];

export const MAX_LINKS = 12;
export const MAX_FILES = 3;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

// Files land in the same public bucket the portal uses, under this prefix.
export const SHOWCASE_SCOPE = "showcase";

const LIMITS = {
  name: 200,
  email: 320,
  phone: 60,
  instagram: 200,
  role: 40,
  pitch: 4000,
  notes: 2000,
};

export const SHOWCASE_TEXT_KEYS = Object.keys(LIMITS);

const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (v) => EMAIL_RE.test(str(v, LIMITS.email));

/** Keep only known keys, trimmed and capped. Blank answers are left out entirely. */
export function sanitizeShowcaseData(input) {
  const out = {};
  for (const k of SHOWCASE_TEXT_KEYS) {
    const v = str(input?.[k], LIMITS[k]);
    if (v) out[k] = v;
  }
  if (out.role && !SHOWCASE_ROLES.includes(out.role)) delete out.role;

  const links = Array.isArray(input?.links) ? input.links : [];
  const seen = new Set();
  const cleanLinks = [];
  for (const raw of links) {
    const v = str(raw, 500);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleanLinks.push(v);
    if (cleanLinks.length >= MAX_LINKS) break;
  }
  if (cleanLinks.length) out.links = cleanLinks;

  const files = Array.isArray(input?.files) ? input.files : [];
  const cleanFiles = files
    .slice(0, MAX_FILES)
    .map((f) => ({
      url: str(f?.url, 1000),
      name: str(f?.name, 200),
      size: Number.isFinite(f?.size) ? Math.max(0, Math.round(f.size)) : 0,
      kind: f?.kind === "audio" ? "audio" : f?.kind === "image" ? "image" : "file",
    }))
    .filter((f) => f.url);
  if (cleanFiles.length) out.files = cleanFiles;

  return out;
}

/**
 * What the form requires. Returns a list of plain-language problems, empty when fine.
 * The same check runs in the browser (so people see it inline) and on the server
 * (so a crafted request cannot skip it).
 */
export function showcaseProblems(d) {
  const out = [];
  if (!str(d?.name, LIMITS.name)) out.push("Tell us your name.");
  if (!isEmail(d?.email)) out.push("We need an email address we can reply to.");
  if (!d?.role) out.push("Pick what you do: music, art, or something else.");
  if (!str(d?.pitch, LIMITS.pitch)) out.push("Tell us a little about what you'd showcase.");
  return out;
}

const withHttps = (v) => {
  const s = String(v || "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

const HOSTS = [
  [/spotify\.com/i, "Spotify"],
  [/soundcloud\.com/i, "SoundCloud"],
  [/bandcamp\.com/i, "Bandcamp"],
  [/(youtube\.com|youtu\.be)/i, "YouTube"],
  [/instagram\.com/i, "Instagram"],
  [/tiktok\.com/i, "TikTok"],
  [/linktr\.ee|solo\.to/i, "Links"],
  [/vimeo\.com/i, "Vimeo"],
  [/drive\.google\.com/i, "Google Drive"],
  [/music\.apple\.com/i, "Apple Music"],
];

/** Turn what someone pasted into a clickable link with a recognizable label. */
export function showcaseLinks(d) {
  return (d?.links || []).map((raw) => {
    const url = withHttps(raw);
    const match = HOSTS.find(([re]) => re.test(url));
    let label = match?.[1];
    if (!label) {
      try { label = new URL(url).hostname.replace(/^www\./, ""); }
      catch { label = "Link"; }
    }
    return { url, label };
  });
}

/** The Instagram handle as a URL, whether they typed a handle or a full link. */
export function showcaseInstagramUrl(d) {
  const v = String(d?.instagram || "").trim();
  if (!v) return "";
  if (/instagram\.com/i.test(v)) return withHttps(v);
  return `https://instagram.com/${encodeURIComponent(v.replace(/^@+/, "").replace(/\/+$/, ""))}`;
}

export const splitName = (full) => {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "", last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
};

/** One application as plain text, for pasting into an email or a note. */
export function showcaseToText(app) {
  const d = app?.data || {};
  const lines = [d.name || "(no name)", d.role || "", d.email || ""];
  if (d.phone) lines.push(d.phone);
  if (d.instagram) lines.push(`Instagram: ${d.instagram}`);
  if (d.pitch) lines.push("", d.pitch);
  showcaseLinks(d).forEach((l) => lines.push(`${l.label}: ${l.url}`));
  (d.files || []).forEach((f) => lines.push(`${f.name}: ${f.url}`));
  if (d.notes) lines.push("", `Notes: ${d.notes}`);
  return lines.filter((l) => l !== "").join("\n");
}
