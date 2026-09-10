// lib/eventPortal.js — the Events Portal field spec.
//
// ONE source of truth for the client-facing portal form AND the CRM-side viewer.
// The public form (app/portal/[token]) renders these sections; the CRM event page
// renders the SAME spec read-only. Add a field here and it appears in both places.
//
// Deliberately short: the booking form's questions, food and drinks, and one shared
// "More details" box that both the host and Sprout edit. Links and files live on the
// event record itself (shared with the CRM's Links and Media tiles), not in here.
//
// Field types: text | email | tel | url | textarea | select | date | time | number
//
// `required: true` means "we cannot put this on the calendar without it".

/* ─── Field spec ─────────────────────────────────────────────────────────────── */

export const PORTAL_SECTIONS = [
  {
    key: "contact",
    title: "Who you are",
    icon: "1",
    blurb: "So we know who to talk to about this event.",
    fields: [
      { key: "contact_name",  label: "Your name", type: "text",  required: true, half: true },
      { key: "contact_email", label: "Email",     type: "email", required: true, half: true },
      { key: "contact_phone", label: "Phone",     type: "tel",   required: true, half: true, help: "We text this the day of the event." },
      { key: "org_name",      label: "Organization / collective", type: "text", half: true, placeholder: "If you are booking on behalf of a group" },
    ],
  },
  {
    key: "basics",
    title: "The event",
    icon: "2",
    blurb: "The details we need to hold a date for you.",
    fields: [
      { key: "event_name", label: "Event name", type: "text", required: true, help: "What it will be called publicly." },
      { key: "event_type", label: "Type of event", type: "select", required: true, half: true,
        options: ["Performance / show", "Workshop / class", "Market / pop-up", "Meeting / gathering",
                  "Screening", "Party / social", "Photo or video shoot", "Rehearsal", "Support group", "Other"] },
      { key: "audience",   label: "Public or private?", type: "select", required: true, half: true,
        options: ["Open to the public", "Private / invite only", "Members only"] },
      { key: "event_date", label: "Preferred date", type: "date", required: true, half: true },
      { key: "alt_date",   label: "Backup date",    type: "date", half: true, help: "In case your first choice is taken." },
      { key: "start_time", label: "Event start",    type: "time", required: true, half: true },
      { key: "end_time",   label: "Event end",      type: "time", required: true, half: true },
      { key: "attendance", label: "Expected attendance", type: "number", required: true, half: true,
        help: "Your best guess. Capacity is 75." },
      { key: "short_desc", label: "Description", type: "textarea",
        help: "What happens, who it is for, and the vibe. We use this on the calendar and in the newsletter." },
    ],
  },
  {
    key: "food",
    title: "Food and drinks",
    icon: "3",
    blurb: "Sprout runs a lot of sober and sober-friendly programming, so let us know what is planned.",
    fields: [
      { key: "food_drink", label: "Food and drinks", type: "textarea",
        placeholder: "Serving food? Any alcohol? Non-alcoholic options?" },
    ],
  },
  {
    key: "more",
    title: "More details",
    icon: "4",
    blurb: "Everything else: lineup, sound, setup, promo, tickets. Sprout can read and edit this too.",
    fields: [
      { key: "more_details", label: "More details", type: "textarea",
        placeholder: "Lineup, set times, what you need from the sound system, how you want the room set up..." },
    ],
  },
];

/* ─── Derived lookups ────────────────────────────────────────────────────────── */

export const ALL_FIELDS = PORTAL_SECTIONS.flatMap((s) =>
  s.fields.map((f) => ({ ...f, section: s.key, sectionTitle: s.title }))
);

export const FIELD_BY_KEY = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f]));

// Fields that must be answered before an event can go on the calendar.
export const REQUIRED_KEYS = ALL_FIELDS.filter((f) => f.required).map((f) => f.key);

// The subset the public "request a booking" form asks up front. Ordered so the
// half-width fields pair up sensibly on screen.
export const REQUEST_KEYS = [
  "contact_name", "contact_email", "contact_phone", "org_name",
  "event_name", "event_type", "audience",
  "event_date", "alt_date", "start_time", "end_time",
  "attendance", "short_desc",
];

export const FILE_KEYS = ALL_FIELDS.filter((f) => f.type === "files").map((f) => f.key);

/* ─── Value helpers ──────────────────────────────────────────────────────────── */

export function isBlank(v) {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "boolean") return v === false;
  if (typeof v === "number") return Number.isNaN(v);
  return false;
}

/** Human-readable value for the CRM viewer and any plain-text export. */
export function displayValue(field, v) {
  if (isBlank(v)) return "";
  if (field.type === "checkbox") return v ? "Yes" : "";
  if (field.type === "multi") return (Array.isArray(v) ? v : [v]).join(", ");
  if (field.type === "files") {
    return (Array.isArray(v) ? v : []).map((f) => f?.name || f?.url || "").filter(Boolean).join(", ");
  }
  return String(v);
}

/**
 * Completion stats for a portal's answers.
 * Returns { requiredDone, requiredTotal, missingRequired[], answered, total, pct, readyToSchedule }
 */
export function portalProgress(data) {
  const d = data || {};
  const missingRequired = REQUIRED_KEYS.filter((k) => isBlank(d[k]));
  const answered = ALL_FIELDS.filter((f) => !isBlank(d[f.key])).length;
  const total = ALL_FIELDS.length;
  return {
    requiredTotal: REQUIRED_KEYS.length,
    requiredDone: REQUIRED_KEYS.length - missingRequired.length,
    missingRequired,
    answered,
    total,
    pct: total ? Math.round((answered / total) * 100) : 0,
    readyToSchedule: missingRequired.length === 0,
  };
}

/** Per-section completion. */
export function sectionProgress(section, data) {
  const d = data || {};
  const answered = section.fields.filter((f) => !isBlank(d[f.key])).length;
  const missingRequired = section.fields.filter((f) => f.required && isBlank(d[f.key])).length;
  return { answered, total: section.fields.length, missingRequired };
}

/* ─── Sanitizing ─────────────────────────────────────────────────────────────── */

const MAX_TEXT = 8000;

const str = (v) => (v == null ? "" : String(v).slice(0, MAX_TEXT));

/**
 * Accept only keys the spec knows about, coerced to the shape that key expects.
 * The portal is a public write surface, so nothing reaches the database without
 * passing through here first. Keys from the retired longer form are dropped.
 */
export function sanitizePortalData(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const f = FIELD_BY_KEY[k];
    if (!f || v == null) continue;
    switch (f.type) {
      case "number": {
        const n = Number(v);
        if (v !== "" && Number.isFinite(n)) out[k] = n;
        break;
      }
      case "select": {
        const s = str(v);
        if (!f.options || f.options.includes(s) || s === "") out[k] = s;
        break;
      }
      default:
        out[k] = str(v);
    }
  }
  return out;
}

/* ─── Event mapping ──────────────────────────────────────────────────────────── */

/**
 * Map portal answers onto the CRM event record's own fields. Used when a booking
 * request creates an event, and whenever the host saves. Only fills fields the
 * portal actually owns — never clears an event field the portal left blank.
 */
export function portalToEventPatch(data) {
  const d = data || {};
  const patch = {};
  if (!isBlank(d.event_name))  patch.name = String(d.event_name).trim();
  if (!isBlank(d.event_date))  patch.event_date = d.event_date;
  if (!isBlank(d.start_time))  patch.start_time = d.start_time;
  if (!isBlank(d.end_time))    patch.end_time = d.end_time;
  if (!isBlank(d.short_desc))  patch.description = String(d.short_desc).trim();
  return patch;
}

/* ─── CRM → portal prefill ───────────────────────────────────────────────────── */

/**
 * The contact running an event: the linked contact tagged event_host, or the only
 * linked contact when there is just one. Returns null when it is ambiguous (a roster
 * of attendees with no host tag), so an attendee never lands in "Your name".
 */
export function pickOrganizer(event, contacts) {
  const byId = new Map((contacts || []).map((c) => [c.id, c]));
  const linked = (event?.contact_ids || []).map((id) => byId.get(id)).filter(Boolean);
  return linked.find((c) => (c.relationship_types || []).includes("event_host"))
    || (linked.length === 1 ? linked[0] : null);
}

/** Portal answers the CRM already knows: the event, its organizer, and their org. */
export function portalSeedFromCRM({ event, organizer, org } = {}) {
  const e = event || {}, c = organizer || {}, o = org || {};
  const name = [c.first_name, c.last_name].map((s) => String(s || "").trim()).filter(Boolean).join(" ");
  const seed = {
    contact_name:  name,
    contact_email: c.email,
    contact_phone: c.phone || o.phone,
    org_name:      o.name,
    event_name:    e.name,
    event_date:    e.event_date,
    start_time:    e.start_time,
    end_time:      e.end_time,
    short_desc:    e.description,
  };
  return Object.fromEntries(Object.entries(seed).filter(([, v]) => !isBlank(v)));
}

/** Fill only the blank answers. Never overwrites anything the host typed. */
export function fillBlanks(data, seed) {
  const next = { ...(data || {}) };
  let changed = false;
  for (const [k, v] of Object.entries(seed || {})) {
    if (isBlank(next[k]) && !isBlank(v)) { next[k] = v; changed = true; }
  }
  return { data: next, changed };
}

/** A plain-text digest of every answered field — handy for pasting into email. */
export function portalToText(data) {
  const d = data || {};
  const out = [];
  for (const s of PORTAL_SECTIONS) {
    const lines = [];
    for (const f of s.fields) {
      const v = displayValue(f, d[f.key]);
      if (v) lines.push(`${f.label}: ${v}`);
    }
    if (lines.length) out.push(`## ${s.title}\n${lines.join("\n")}`);
  }
  return out.join("\n\n");
}
