// lib/programForm.js — the participant program form: fields, cleaning, link helpers.
//
// Shared by the public form (/program/[token]), its API route, and the CRM's Program
// tile, so all three read one shape. Nothing in the form is required.

export const PROGRAM_ROLES = ["Music", "Art", "Something else"];

export const PROGRAM_LINKS = [
  { key: "instagram", label: "Instagram", placeholder: "@yourhandle" },
  { key: "venmo", label: "Venmo", placeholder: "@your-venmo" },
  { key: "website", label: "Website", placeholder: "yoursite.com" },
  { key: "linktree", label: "Linktree", placeholder: "linktr.ee/yourname" },
];

// Every key the form may store, with its length cap. Anything else is dropped.
const LIMITS = {
  name: 200,
  role: 40,
  bio: 2000,
  email: 200,
  photo_url: 1000,
  instagram: 200,
  venmo: 200,
  website: 500,
  linktree: 500,
  other_label: 80,
  other_url: 500,
};

export const PROGRAM_KEYS = Object.keys(LIMITS);

const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** Keep only known keys, trimmed and capped. Blank answers are left out entirely. */
export function sanitizeProgramData(input) {
  const out = {};
  for (const k of PROGRAM_KEYS) {
    const v = str(input?.[k], LIMITS[k]);
    if (v) out[k] = v;
  }
  if (out.role && !PROGRAM_ROLES.includes(out.role)) delete out.role;
  if (out.email) out.email = out.email.toLowerCase();
  return out;
}

export const hasProgramContent = (d) => PROGRAM_KEYS.some((k) => Boolean(str(d?.[k], LIMITS[k])));

const handle = (v) => String(v || "").trim().replace(/^@+/, "").replace(/\/+$/, "");
const withHttps = (v) => {
  const s = String(v || "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

/** Turn whatever people typed (handles, bare domains, full URLs) into clickable links. */
export function programLinks(d) {
  const out = [];
  if (d?.instagram) {
    const v = d.instagram.trim();
    out.push({ key: "instagram", label: "Instagram", url: /instagram\.com/i.test(v) ? withHttps(v) : `https://instagram.com/${encodeURIComponent(handle(v))}` });
  }
  if (d?.venmo) {
    const v = d.venmo.trim();
    out.push({ key: "venmo", label: "Venmo", url: /venmo\.com/i.test(v) ? withHttps(v) : `https://venmo.com/u/${encodeURIComponent(handle(v))}` });
  }
  if (d?.website) out.push({ key: "website", label: "Website", url: withHttps(d.website) });
  if (d?.linktree) out.push({ key: "linktree", label: "Linktree", url: withHttps(d.linktree) });
  if (d?.other_url) out.push({ key: "other", label: d.other_label || "Link", url: withHttps(d.other_url) });
  return out;
}

/** Plain-text dump of every submission, for pasting into a program layout. */
export function programToText(entries) {
  return (entries || [])
    .map((e) => {
      const d = e.data || {};
      const lines = [d.name || "(no name)"];
      if (d.role) lines.push(d.role);
      if (d.bio) lines.push(d.bio);
      programLinks(d).forEach((l) => lines.push(`${l.label}: ${l.url}`));
      if (d.photo_url) lines.push(`Photo: ${d.photo_url}`);
      if (d.email) lines.push(`Email (not for print): ${d.email}`);
      return lines.join("\n");
    })
    .join("\n\n");
}
