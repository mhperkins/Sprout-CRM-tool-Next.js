// lib/eventPortal.js — the Events Portal field spec.
//
// ONE source of truth for the client-facing portal form AND the CRM-side viewer.
// The public form (app/portal/[token]) renders these sections; the CRM event page
// renders the SAME spec read-only. Add a field here and it appears in both places.
//
// Field types:
//   text | email | tel | url | textarea | select | multi | date | time | number
//   | checkbox | files | repeat
//
// `required: true` means "we cannot put this on the calendar without it".
// Everything else is planning detail — the portal is the home for all of it, but
// it never blocks a booking.

/* ─── Field spec ─────────────────────────────────────────────────────────────── */

export const PORTAL_SECTIONS = [
  {
    key: "contact",
    title: "Who you are",
    icon: "1",
    blurb: "So we know who to talk to about this event.",
    fields: [
      { key: "contact_name",  label: "Your name",            type: "text",  required: true, half: true },
      { key: "pronouns",      label: "Pronouns",             type: "text",  half: true, placeholder: "optional" },
      { key: "contact_email", label: "Email",                type: "email", required: true, half: true },
      { key: "contact_phone", label: "Phone",                type: "tel",   required: true, half: true, help: "We text this the day of the event." },
      { key: "org_name",      label: "Organization / collective", type: "text", half: true, placeholder: "If you are booking on behalf of a group" },
      { key: "instagram",     label: "Instagram",            type: "text",  half: true, placeholder: "@yourhandle" },
      { key: "website",       label: "Website",              type: "url",   half: true, placeholder: "https://" },
      { key: "member_status", label: "Are you a Sprout member?", type: "select", half: true,
        options: ["Yes", "No", "Applying / would like to be", "Not sure"] },
      { key: "day_of_contact", label: "Day-of contact (if different)", type: "text",
        help: "Name and phone number of whoever is actually on site running the event." },
    ],
  },
  {
    key: "basics",
    title: "The event",
    icon: "2",
    blurb: "The details we need to hold a date for you.",
    fields: [
      { key: "event_name",   label: "Event name",  type: "text", required: true,
        help: "What it will be called publicly." },
      { key: "event_type",   label: "Type of event", type: "select", required: true, half: true,
        options: ["Performance / show", "Workshop / class", "Market / pop-up", "Meeting / gathering",
                  "Screening", "Party / social", "Photo or video shoot", "Rehearsal", "Support group", "Other"] },
      { key: "event_type_other", label: "If other, what?", type: "text", half: true },
      { key: "event_date",   label: "Preferred date",  type: "date", required: true, half: true },
      { key: "alt_date",     label: "Backup date",     type: "date", half: true,
        help: "In case your first choice is taken." },
      { key: "start_time",   label: "Event start",     type: "time", required: true, half: true },
      { key: "end_time",     label: "Event end",       type: "time", required: true, half: true },
      { key: "load_in",      label: "Load-in time",    type: "time", half: true,
        help: "When you would arrive to set up." },
      { key: "load_out",     label: "Load-out done by", type: "time", half: true },
      { key: "attendance",   label: "Expected attendance", type: "number", required: true, half: true,
        help: "Your best guess. Capacity is 75." },
      { key: "audience",     label: "Public or private?", type: "select", required: true, half: true,
        options: ["Open to the public", "Private / invite only", "Members only"] },
      { key: "recurring",    label: "Is this a recurring event?", type: "select", half: true,
        options: ["One time", "Weekly", "Every 2 weeks", "Monthly", "Not sure yet"] },
      { key: "short_desc",   label: "One-line description", type: "text",
        help: "How you would describe it in a single sentence. We use this on the calendar and in the newsletter." },
      { key: "full_desc",    label: "Full description", type: "textarea",
        help: "Tell us what actually happens. Who it is for, what the vibe is, anything that makes it yours." },
    ],
  },
  {
    key: "programming",
    title: "Lineup and run of show",
    icon: "3",
    blurb: "Who is performing, teaching, or hosting. Add a row for each.",
    fields: [
      { key: "host_name", label: "Host / MC", type: "text", half: true },
      { key: "lineup", label: "Lineup", type: "repeat", addLabel: "Add a performer or facilitator",
        itemFields: [
          { key: "name",     label: "Name",             type: "text", half: true },
          { key: "act",      label: "What they do",     type: "text", half: true, placeholder: "Band, DJ, painter, facilitator..." },
          { key: "handle",   label: "Instagram / link", type: "text", half: true },
          { key: "set_time", label: "Set / slot time",  type: "text", half: true, placeholder: "8:00-8:30pm" },
          { key: "needs",    label: "What they need",   type: "textarea", placeholder: "2 mics, a stool, a table for merch..." },
        ] },
      { key: "run_of_show", label: "Run of show", type: "textarea",
        help: "A rough timeline. Doors at 7, first act at 7:30, that kind of thing." },
    ],
  },
  {
    key: "space",
    title: "Space and setup",
    icon: "4",
    blurb: "How you want the room to look when you walk in.",
    fields: [
      { key: "setup_style", label: "Setup style", type: "select", half: true,
        options: ["Standing / open floor", "Seated rows", "Cabaret tables", "Circle of chairs",
                  "Classroom / tables", "Market booths", "Cleared floor", "Other"] },
      { key: "stage_needed", label: "Do you need the stage area?", type: "select", half: true,
        options: ["Yes", "No", "Not sure"] },
      { key: "chairs", label: "Chairs needed", type: "number", half: true },
      { key: "tables", label: "Tables needed", type: "number", half: true },
      { key: "setup_notes", label: "Setup notes", type: "textarea",
        help: "Anything about the layout, or what you are bringing yourself." },
      { key: "setup_files", label: "Layout sketch or floor plan", type: "files",
        help: "Optional. A photo of a napkin drawing is completely fine." },
    ],
  },
  {
    key: "tech",
    title: "Sound, lights, and AV",
    icon: "5",
    blurb: "Tell us what you need so nothing is a surprise at load-in.",
    fields: [
      { key: "need_sound", label: "Do you need the PA / sound system?", type: "select", half: true,
        options: ["Yes", "No", "Not sure"] },
      { key: "mics", label: "How many microphones?", type: "number", half: true },
      { key: "need_projector", label: "Projector or screen?", type: "select", half: true,
        options: ["Yes", "No", "Not sure"] },
      { key: "need_lights", label: "Stage lighting?", type: "select", half: true,
        options: ["Yes", "No", "Not sure"] },
      { key: "own_engineer", label: "Bringing your own sound person or gear?", type: "select", half: true,
        options: ["No, we will use the house setup", "Yes, bringing an engineer", "Yes, bringing gear", "Both"] },
      { key: "soundcheck", label: "Soundcheck time", type: "time", half: true },
      { key: "tech_notes", label: "Tech notes", type: "textarea",
        help: "Instruments, backline, DI needs, playback from a laptop, anything else." },
      { key: "tech_files", label: "Tech rider / stage plot", type: "files" },
    ],
  },
  {
    key: "money",
    title: "Tickets and money",
    icon: "6",
    blurb: "How people get in and whether anything is being sold.",
    fields: [
      { key: "ticketing", label: "How do people get in?", type: "select", half: true,
        options: ["Free", "Free with RSVP", "Ticketed", "Suggested donation", "Private buyout"] },
      { key: "ticket_price", label: "Ticket price / suggested amount", type: "text", half: true, placeholder: "$15, or $10-20 sliding" },
      { key: "ticket_link", label: "Ticketing or RSVP link", type: "url", half: true, placeholder: "https://" },
      { key: "sales_onsite", label: "Anything sold at the event?", type: "multi",
        options: ["Merch", "Art / prints", "Food", "Drinks", "Nothing"] },
      { key: "money_notes", label: "Revenue notes", type: "textarea",
        help: "Door splits, artist payouts, anything we agreed on. Write it here so we both have it." },
    ],
  },
  {
    key: "food",
    title: "Food and drink",
    icon: "7",
    blurb: "Sprout runs a lot of sober and sober-friendly programming, so please be specific here.",
    fields: [
      { key: "food", label: "Serving food?", type: "select", half: true,
        options: ["No", "Yes, catered", "Yes, self-provided", "Light snacks only"] },
      { key: "caterer", label: "Caterer / vendor", type: "text", half: true },
      { key: "alcohol", label: "Alcohol?", type: "select", half: true, required: true,
        options: ["No alcohol", "Yes, served", "Yes, BYOB", "Not sure"],
        help: "This changes what we need from you, so we ask everyone." },
      { key: "na_drinks", label: "Non-alcoholic options?", type: "select", half: true,
        options: ["Yes", "No", "Not sure"] },
      { key: "food_notes", label: "Food and drink notes", type: "textarea" },
    ],
  },
  {
    key: "promo",
    title: "Promotion",
    icon: "8",
    blurb: "Optional, but the earlier we get this the more we can do with it.",
    fields: [
      { key: "want_promo", label: "Would you like Sprout to help promote?", type: "select", half: true,
        options: ["Yes please", "No thanks", "Just the calendar listing"] },
      { key: "promo_channels", label: "Where", type: "multi",
        options: ["Instagram", "Newsletter", "Sprout website calendar", "In-space TV screens", "Discord"] },
      { key: "promo_copy", label: "Promo copy", type: "textarea",
        help: "A caption or blurb we can post as-is. If you leave this blank we will write one from your description." },
      { key: "tag_handles", label: "Handles to tag", type: "text", placeholder: "@artist, @collective, @venue" },
      { key: "flyer_files", label: "Flyer / artwork", type: "files",
        help: "Square works best for Instagram. Send whatever you have." },
      { key: "photo_files", label: "Photos or headshots", type: "files" },
      { key: "press", label: "Press or photographer coming?", type: "text" },
    ],
  },
  {
    key: "logistics",
    title: "Logistics and paperwork",
    icon: "9",
    blurb: "The unglamorous part. Most of it only applies to some events.",
    fields: [
      { key: "crew", label: "People you are bringing", type: "text", half: true,
        placeholder: "3 volunteers, 1 door person" },
      { key: "accessibility", label: "Accessibility needs", type: "textarea",
        help: "Yours or your guests'. Tell us early and we will sort it out." },
      { key: "insurance_files", label: "Certificate of insurance", type: "files",
        help: "Only needed for some event types. We will tell you if yours is one." },
      { key: "vendor_files", label: "W9 or vendor paperwork", type: "files" },
      { key: "cleanup_ack", label: "I understand we are responsible for leaving the space as we found it", type: "checkbox" },
      { key: "rules_ack", label: "I have read and agree to the house rules", type: "checkbox" },
      { key: "anything_else", label: "Anything else we should know?", type: "textarea",
        help: "Genuinely anything. This is the most useful box on the page." },
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

// The subset the public "request a booking" form asks up front. Everything else
// is filled in later through the portal link, so the front door stays short.
// Ordered so the half-width fields pair up sensibly on screen: name/email,
// phone/org, type/audience, date/backup date, start/end.
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
  if (field.type === "repeat") {
    return (Array.isArray(v) ? v : [])
      .map((row) => (row?.name || row?.act || "").trim())
      .filter(Boolean)
      .join(", ");
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

/** Per-section completion, for the progress rail in the form. */
export function sectionProgress(section, data) {
  const d = data || {};
  const answered = section.fields.filter((f) => !isBlank(d[f.key])).length;
  const missingRequired = section.fields.filter((f) => f.required && isBlank(d[f.key])).length;
  return { answered, total: section.fields.length, missingRequired };
}

/* ─── Sanitizing ─────────────────────────────────────────────────────────────── */

const MAX_TEXT = 8000;
const MAX_ROWS = 60;
const MAX_FILES = 20;

const str = (v) => (v == null ? "" : String(v).slice(0, MAX_TEXT));

/**
 * Accept only keys the spec knows about, coerced to the shape that key expects.
 * The portal is a public write surface, so nothing reaches the database without
 * passing through here first.
 */
export function sanitizePortalData(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const f = FIELD_BY_KEY[k];
    if (!f || v == null) continue;
    switch (f.type) {
      case "checkbox":
        out[k] = Boolean(v);
        break;
      case "number": {
        const n = Number(v);
        if (v !== "" && Number.isFinite(n)) out[k] = n;
        break;
      }
      case "multi": {
        const allowed = new Set(f.options || []);
        const arr = (Array.isArray(v) ? v : [v]).map(str).filter((x) => allowed.has(x));
        out[k] = arr.slice(0, 40);
        break;
      }
      case "select": {
        const s = str(v);
        if (!f.options || f.options.includes(s) || s === "") out[k] = s;
        break;
      }
      case "files": {
        const arr = (Array.isArray(v) ? v : [])
          .filter((x) => x && typeof x.url === "string" && /^https?:\/\//.test(x.url))
          .map((x) => ({
            url: str(x.url).slice(0, 1000),
            name: str(x.name).slice(0, 200),
            size: Number.isFinite(Number(x.size)) ? Number(x.size) : 0,
          }));
        out[k] = arr.slice(0, MAX_FILES);
        break;
      }
      case "repeat": {
        const subs = f.itemFields || [];
        const arr = (Array.isArray(v) ? v : []).slice(0, MAX_ROWS).map((row) => {
          const clean = {};
          for (const sub of subs) if (row && row[sub.key] != null) clean[sub.key] = str(row[sub.key]);
          return clean;
        });
        out[k] = arr;
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
 * request creates an event, and again whenever Max pulls updated portal answers
 * onto the event. Only fills fields the portal actually owns — never clears an
 * event field the portal left blank.
 */
export function portalToEventPatch(data) {
  const d = data || {};
  const patch = {};
  if (!isBlank(d.event_name))  patch.name = String(d.event_name).trim();
  if (!isBlank(d.event_date))  patch.event_date = d.event_date;
  if (!isBlank(d.start_time))  patch.start_time = d.start_time;
  if (!isBlank(d.end_time))    patch.end_time = d.end_time;
  const desc = !isBlank(d.full_desc) ? d.full_desc : d.short_desc;
  if (!isBlank(desc))          patch.description = String(desc).trim();
  return patch;
}

/** A plain-text digest of every answered field — handy for pasting into email. */
export function portalToText(data) {
  const d = data || {};
  const out = [];
  for (const s of PORTAL_SECTIONS) {
    const lines = [];
    for (const f of s.fields) {
      const v = displayValue(f, d[f.key]);
      if (!v) continue;
      if (f.type === "repeat") {
        lines.push(`${f.label}:`);
        (d[f.key] || []).forEach((row, i) => {
          const parts = (f.itemFields || [])
            .map((sub) => (isBlank(row?.[sub.key]) ? "" : `${sub.label}: ${row[sub.key]}`))
            .filter(Boolean);
          if (parts.length) lines.push(`  ${i + 1}. ${parts.join(" · ")}`);
        });
      } else {
        lines.push(`${f.label}: ${v}`);
      }
    }
    if (lines.length) out.push(`## ${s.title}\n${lines.join("\n")}`);
  }
  return out.join("\n\n");
}
