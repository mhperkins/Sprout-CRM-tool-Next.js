// lib/galleryForm.js — the gallery submission form: fields, cleaning, text helpers.
//
// Replaces the "Gallery Art Submission Form" Google Form. Shared by the public form
// (/gallery/[token]), its API route, the alert email and the CRM, so all read one shape.
// Required: name, email, and at least one piece with a size or a photo.

export const MAX_PIECES = 4;

export const READY_OPTS = [
  { id: "yes", label: "Yes, all pieces are gallery-ready" },
  { id: "some", label: "Some are" },
  { id: "no", label: "Not yet" },
  { id: "not_sure", label: "Not sure" },
];

export const MORE_OPTS = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "maybe", label: "Maybe" },
];

const LIMITS = { name: 200, email: 200, instagram: 200, website: 500, statement: 3000, notes: 1000 };
const PIECE_LIMITS = { title: 200, width: 20, height: 20, depth: 20, medium: 200, price: 60, photo_url: 1000 };

const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : typeof v === "number" ? String(v).slice(0, n) : "");

/** Keep only known keys, trimmed and capped. Blank answers are left out. */
export function sanitizeGalleryData(input, photoPrefix) {
  const out = {};
  for (const [k, n] of Object.entries(LIMITS)) {
    const v = str(input?.[k], n);
    if (v) out[k] = v;
  }
  if (out.email) out.email = out.email.toLowerCase();
  if (READY_OPTS.some((o) => o.id === input?.ready)) out.ready = input.ready;
  if (MORE_OPTS.some((o) => o.id === input?.more_work)) out.more_work = input.more_work;
  const pieces = [];
  for (const p of Array.isArray(input?.pieces) ? input.pieces.slice(0, MAX_PIECES) : []) {
    const q = {};
    for (const [k, n] of Object.entries(PIECE_LIMITS)) {
      const v = str(p?.[k], n);
      if (v) q[k] = v;
    }
    if (q.photo_url && photoPrefix && !q.photo_url.startsWith(photoPrefix)) delete q.photo_url;
    if (Object.keys(q).length) pieces.push(q);
  }
  if (pieces.length) out.pieces = pieces;
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Plain-language problems, or [] when the submission can be saved. */
export function galleryProblems(d) {
  const out = [];
  if (!d?.name) out.push("Add your name.");
  if (!EMAIL_RE.test(d?.email || "")) out.push("Check your email address.");
  const pieces = d?.pieces || [];
  if (!pieces.length) out.push("Add at least one piece.");
  else if (pieces.some((p) => !(p.width && p.height) && !p.photo_url)) out.push("Give each piece a size or a photo.");
  return out;
}

export const readyLabel = (id) => READY_OPTS.find((o) => o.id === id)?.label || "";
export const moreLabel = (id) => MORE_OPTS.find((o) => o.id === id)?.label || "";

/** "24 × 36 in" (W × H, optional depth). */
export function sizeLabel(p) {
  if (!p?.width && !p?.height) return "";
  const parts = [p.width || "?", p.height || "?"];
  if (p.depth) parts.push(p.depth);
  return `${parts.join(" × ")} in`;
}

export function pieceLine(p, i) {
  const bits = [p.title || `Piece ${i + 1}`, sizeLabel(p), p.medium, p.price].filter(Boolean);
  return bits.join(" · ");
}

/** Plain-text dump of submissions, for a hang plan or the program. */
export function galleryToText(entries) {
  return (entries || [])
    .map((e) => {
      const d = e.data || {};
      const lines = [`${d.name || "(no name)"}${d.email ? ` <${d.email}>` : ""}`];
      if (d.instagram) lines.push(`Instagram: ${d.instagram}`);
      (d.pieces || []).forEach((p, i) => lines.push(`- ${pieceLine(p, i)}${p.photo_url ? ` (${p.photo_url})` : ""}`));
      if (d.ready) lines.push(`Gallery-ready: ${readyLabel(d.ready)}`);
      if (d.more_work) lines.push(`Would share more work: ${moreLabel(d.more_work)}`);
      if (d.statement) lines.push(d.statement);
      if (d.notes) lines.push(`Notes: ${d.notes}`);
      return lines.join("\n");
    })
    .join("\n\n");
}
