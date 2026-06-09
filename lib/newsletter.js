// lib/newsletter.js — Newsletter template engine (shared)
// Ports the assemble_newsletter logic out of the MCP server's Node/fs context so
// the browser can render templates too. Both the in-app Newsletter view and the
// MCP tool can import from here — one source of truth for the templates.
//
// Flow: start from a raw template → fill CRM-derived blocks (recaps, upcoming
// events, profile footer, month) → expose the REMAINING [BRACKETS] as editable
// fields → substitute the user's field values. Empty fields keep their bracket so
// the preview still shows the placeholder.

/* ─── Constants ──────────────────────────────────────────────────────────────── */

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

// Brand accents rotate for visual rhythm (cyan, fuchsia, acid, banana).
const RECAP_BARS = ["#73C4D6", "#E10098", "#C6C902", "#FAD100"];
const EVT_PILLS = [
  { bg: "#73C4D6", fg: "#0d3d49" },
  { bg: "#73C4D6", fg: "#0d3d49" },
];

export const TEMPLATES = [
  {
    id: "monthly-roundup-compact",
    name: "Monthly Roundup",
    blurb: "Featured event photo → coworking → membership → community spotlight → all events. Compact, mobile-first (~7in tall). Custom section fields with add-more for events.",
  },
  {
    id: "quick-hit",
    name: "Quick Hit",
    blurb: "Short single-focus send between roundups. One recap, one upcoming event, one CTA. Manual fill.",
  },
];

/* ─── Compact roundup: structured section model ──────────────────────────────────
   The compact template is NOT filled by bracket-extraction. It uses these sections:
   single boxes for editorial copy, and "repeat" sections (events) that start with one
   entry and grow via an Add-more button. buildCompact() renders HTML from these values.
   field_values shape: { headline:"", ..., upcoming:[{date,name,note}], past:[{name,date,recap}] }. */
// kind: "single" = one textarea (polish:true adds a "Polish with Comms" button).
//       "image"  = an upload button storing a public URL in field_values[key].
//       "repeat" = a list of entries with an Add-more button (itemImage:true adds a
//                  per-entry image; a field with polish:true gets its own Polish button).
export const COMPACT_SECTIONS = [
  // kind: "header" = an editable static title/subheader/button label. Blank falls
  // back to its default text (`ph`), so leaving it empty keeps the original wording.
  { key: "mastheadLabel",  label: "Masthead — label",                 kind: "header", ph: "Sprout Monthly" },
  { key: "headline",       label: "Headline",                         kind: "single", rows: 2, polish: true },
  { key: "intro",          label: "Intro / thank-you",                kind: "single", rows: 3, polish: true },
  { key: "featuredEyebrow", label: "Featured — eyebrow",              kind: "header", ph: "Featured" },
  { key: "featuredTitle",  label: "Featured event — title",           kind: "single", rows: 1 },
  { key: "featuredRecap",  label: "Featured event — recap",           kind: "single", rows: 3, polish: true },
  { key: "featuredAnnounce", label: "Featured event — announcement (optional)", kind: "single", rows: 2, polish: true },
  { key: "featuredPhoto",  label: "Featured event — photo",           kind: "image", crop: true, ratio: 544 / 200 },
  { key: "coworkingEyebrow", label: "Announcement — eyebrow",          kind: "header", ph: "Announcement" },
  { key: "coworkingTitle", label: "Announcement — title",             kind: "header", ph: "e.g. Sprout Co-Working: Tuesdays and Thursdays" },
  { key: "coworking",      label: "Announcement — body",              kind: "single", rows: 2, polish: true },
  { key: "coworkingChip",  label: "Announcement — highlight chip label (optional)", kind: "header", ph: "Sprout-by-Day" },
  { key: "coworkingThurs", label: "Announcement — highlight line (optional)", kind: "single", rows: 1, polish: true },
  { key: "membership",     label: "Membership ask",                   kind: "single", rows: 2, polish: true },
  { key: "membershipBtn",  label: "Membership — button label",        kind: "header", ph: "Become a member" },
  { key: "membershipLink", label: "Membership — button link",         kind: "single", ph: "https://givebutter.com/sproutmembership" },
  { key: "marketing",      label: "Marketing — message",              kind: "single", rows: 2, polish: true },
  { key: "marketingLink",  label: "Marketing — button: URL, or [Button text](URL)", kind: "single", rows: 1 },
  { key: "scholarship",    label: "Scholarship — message",            kind: "single", rows: 2, polish: true },
  { key: "scholarshipBtn", label: "Scholarship — button label",       kind: "header", ph: "Learn more" },
  { key: "scholarshipLink", label: "Scholarship — button link (URL)", kind: "single", rows: 1 },
  { key: "spotlightEyebrow", label: "Community spotlight — eyebrow",   kind: "header", ph: "Community Sprout Shout" },
  { key: "spotlightName",  label: "Community spotlight — name",        kind: "single", rows: 1 },
  { key: "spotlightBlurb", label: "Community spotlight — blurb",       kind: "single", rows: 3, polish: true },
  { key: "spotlightImage", label: "Community spotlight — photo",       kind: "image", crop: true, ratio: 495 / 200 },
  { key: "spotlightIG",    label: "Community spotlight — Instagram: URL, or [Button text](URL)", kind: "single", rows: 1 },
  { key: "spotlightWeb",   label: "Community spotlight — website/streaming: URL, or [Button text](URL)", kind: "single", rows: 1 },
  { key: "spotlightTestimonial", label: "Community spotlight — testimonial / quote", kind: "single", rows: 3, polish: true },
  { key: "upcomingTitle",  label: "Upcoming events — section title",   kind: "header", ph: "Upcoming" },
  { key: "upcoming",       label: "Upcoming events",                  kind: "repeat", itemLabel: "event", itemImage: true, itemCrop: true, itemRatio: 544 / 180,
    fields: [{ k: "date", ph: "Date" }, { k: "name", ph: "Event name" }, { k: "note", ph: "One line", polish: true }, { k: "link", ph: "Button: URL, or [Button text](URL)" }] },
  { key: "pastTitle",      label: "Past events — section title",       kind: "header", ph: "Past Events" },
  { key: "past",           label: "Past events",                      kind: "repeat", itemLabel: "past event", itemImage: true, itemCrop: true, itemRatio: 160 / 110,
    fields: [{ k: "name", ph: "Event name" }, { k: "date", ph: "Date" }, { k: "recap", ph: "One-line recap", polish: true }] },
  { key: "footerBrand",    label: "Footer — brand name",              kind: "header", ph: "SPROUT SOCIETY" },
  { key: "donateLink",     label: "Footer — Donate button (link)",    kind: "single", ph: "Button: URL, or [Button text](URL)" },
  { key: "memberLink",     label: "Footer — Become a member button (link)", kind: "single", ph: "Button: URL, or [Button text](URL)" },
];

// A fresh empty entry for a repeat section ({date:"",name:"",note:""} etc.).
export function blankCompactItem(sec) {
  const o = {};
  (sec.fields || []).forEach((f) => { o[f.k] = ""; });
  return o;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

export function esc(s) {
  return (s || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function defaultMonthYear(today) {
  // today is "YYYY-MM-DD"; fall back to a neutral label if absent.
  if (!today) return "";
  const [y, m] = today.split("-").map((x) => +x);
  return `${MONTHS_LONG[(m || 1) - 1]} ${y}`;
}

const pill = (dstr) => {
  const [, m, d] = (dstr || "").split("-");
  return { mon: MONTHS_SHORT[(+m || 1) - 1] || "", day: String(+d || "") };
};

// Replace every literal occurrence of `find` (no regex — placeholders contain
// brackets, slashes, em dashes, middots that would all need escaping).
const replaceAllLiteral = (str, find, repl) => str.split(find).join(repl);

const recapBlock = (e, i) =>
  `              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px; border-left:4px solid ${
    RECAP_BARS[i % RECAP_BARS.length]
  }; background-color:#F7F7F6; border-radius:0 8px 8px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 4px 0; font-size:17px; font-weight:900; color:#030000;">${esc(e.name)}</p>
                    <p style="margin:0; font-size:14px; line-height:1.55; color:#4B5563;">${esc(e.recap)}</p>
                  </td>
                </tr>
              </table>`;

const eventBlock = (e, i) => {
  const { mon, day } = pill(e.event_date);
  const p = EVT_PILLS[i % EVT_PILLS.length];
  const meta =
    [e.location, e.description].filter(Boolean).join(" · ") ||
    "[Time · Location · one-line description]";
  return `              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                <tr>
                  <td width="64" valign="top" style="padding-right:14px;">
                    <table role="presentation" width="56" cellpadding="0" cellspacing="0" style="background-color:${p.bg}; border-radius:10px;">
                      <tr><td align="center" style="padding:8px 0 0 0; font-size:11px; font-weight:900; text-transform:uppercase; color:${p.fg};">${mon}</td></tr>
                      <tr><td align="center" style="padding:0 0 8px 0; font-size:24px; font-weight:900; line-height:1; color:#030000;">${day}</td></tr>
                    </table>
                  </td>
                  <td valign="top">
                    <p style="margin:0 0 2px 0; font-size:16px; font-weight:900; color:#030000;">${esc(e.name)}</p>
                    <p style="margin:0; font-size:13px; line-height:1.5; color:#4B5563;">${esc(meta)}</p>
                  </td>
                </tr>
              </table>`;
};

/* ─── Compact roundup renderer ───────────────────────────────────────────────── */
// Empty values render as a muted [placeholder] so the live preview still reads.
const cph = (t) => `<span style="color:#c2c2bf;">[${t}]</span>`;
// Inline markdown links inside any fill-in box: `[label](https://url)` → styled anchor.
// Runs AFTER esc() — the brackets/parens survive escaping (esc only touches & < >).
const linkify = (html, color = "#2a8ca0") =>
  html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_m, label, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:${color}; font-weight:700; text-decoration:underline;">${label}</a>`
  );
// Real values: escape, linkify markdown, and turn newlines into <br> so pressing
// Enter in any fill-in box adds a line break in the email. Empty → muted placeholder.
const cval = (v, t, linkColor) => (v && v.toString().trim() ? linkify(esc(v), linkColor).replace(/\n/g, "<br>") : cph(t));
// Editable static text (titles/subheaders/button labels): typed value, else the
// hardcoded default. Unlike cval, a blank field keeps the original wording — so
// drafts that never set these render identically to before.
const tval = (v, fallback) => (v && v.toString().trim() ? esc(v.toString().trim()) : fallback);
// A link box accepts either a bare URL (uses the fallback button label) or
// markdown `[Button text](https://url)` to set a custom label + URL.
const parseBtn = (raw, fallbackLabel) => {
  const s = (raw || "").toString().trim();
  if (!s) return null;
  const m = s.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
  if (m) return { label: m[1], url: m[2] };
  return { label: fallbackLabel, url: s };
};

const compactUpCard = (e, side) => {
  const p = EVT_PILLS[side % EVT_PILLS.length];
  const img = e.image
    ? `<img src="${esc(e.image)}" alt="${esc(e.name || "Event")}" width="100%" height="180" style="display:block; width:100%; height:180px; object-fit:cover; object-position:${esc(e.imagePos || "center")}; border:0; border-radius:6px; margin-bottom:10px;">`
    : "";
  return `                  <td valign="top" style="padding:0 0 12px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F7F7F6" style="border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,0.16);">
                      <tr><td style="padding:18px 16px; font-family:'Lato',Helvetica,Arial,sans-serif;">
                        ${img}<span style="display:inline-block; background-color:${p.bg}; color:${p.fg}; font-size:12px; font-weight:900; padding:3px 9px; border-radius:3px;">${cval(e.date, "Date")}</span><br>
                        <span style="font-size:16px; font-weight:700; color:#030000; line-height:1.4;">${cval(e.name, "Event name")}</span><br>
                        <span style="font-size:13px; line-height:1.5; color:#3a3a38;">${cval(e.note, "One line")}</span>${
                          (() => {
                            const btn = parseBtn(e.link, "Sign up / RSVP");
                            return btn
                              ? `<br><a href="${esc(btn.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-top:8px; font-size:13px; font-weight:900; color:#E10098; text-decoration:none;">${esc(btn.label)} &rarr;</a>`
                              : "";
                          })()
                        }
                      </td></tr>
                    </table>
                  </td>`;
};

const compactUpcomingRows = (list) => {
  const items = list && list.length ? list : [{}];
  return items
    .map((e, i) => `                <tr>\n${compactUpCard(e, i)}\n                </tr>`)
    .join("\n");
};

// Spotlight link button (Instagram / website), rendered inline. Empty field → "".
const spotlightBtn = (raw, fallbackLabel, bg) => {
  const b = parseBtn(raw, fallbackLabel);
  if (!b) return "";
  return `<a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin:10px 8px 0 0; padding:9px 16px; font-size:13px; font-weight:900; color:#FFFFFF; background-color:${bg}; border-radius:6px; text-decoration:none;">${esc(b.label)} &rarr;</a>`;
};
// The two spotlight buttons laid out in a row below the blurb. All empty → nothing.
const spotlightButtonRow = (ig, web) => {
  const row = spotlightBtn(ig, "Instagram", "#E10098") + spotlightBtn(web, "Website", "#030000");
  return row ? `<div>${row}</div>` : "";
};

const compactPastRows = (list) => {
  const items = list && list.length ? list : [{}];
  return items
    .map((e, i) => {
      const bar = RECAP_BARS[i % RECAP_BARS.length];
      const div =
        i === items.length - 1
          ? ""
          : `\n                <tr><td colspan="2" style="border-top:1px solid #ECECEA; font-size:1px; line-height:1px;">&nbsp;</td></tr>`;
      const img = e.image
        ? `<br><img src="${esc(e.image)}" alt="${esc(e.name || "Event")}" width="160" height="110" style="display:block; max-width:160px; width:100%; height:110px; object-fit:cover; object-position:${esc(e.imagePos || "center")}; border:0; border-radius:6px; margin-top:8px;">`
        : "";
      return `                <tr>
                  <td width="4" bgcolor="${bar}" style="width:4px; line-height:1px; font-size:1px;">&nbsp;</td>
                  <td style="padding:14px 0 14px 14px; font-family:'Lato',Helvetica,Arial,sans-serif;">
                    <span style="font-size:15px; font-weight:700; color:#030000;">${cval(e.name, "Event name")}</span>
                    <span style="font-size:13px; color:#8a8a86;">&nbsp;·&nbsp;${cval(e.date, "Date")}</span><br>
                    <span style="font-size:13px; line-height:1.5; color:#3a3a38;">${cval(e.recap, "One-line recap")}</span>${img}
                  </td>
                </tr>${div}`;
    })
    .join("\n");
};

/**
 * Render the compact monthly roundup from structured section values.
 * Mirrors docs/newsletter/monthly-roundup-compact.html. Logo is served from /public.
 */
export function buildCompact({ fieldValues = {}, monthYear, profile = {}, today } = {}) {
  const v = fieldValues || {};
  const monthLong = monthYear || defaultMonthYear(today) || "Month Year";
  const photo = (v.featuredPhoto || "").toString().trim();
  // Footer contact info — render as clickable links when the profile has a value, plain placeholder otherwise.
  const linkStyle = "color:inherit; text-decoration:underline;";
  const igDisplay = profile.igHandle
    ? (profile.igHandle.startsWith("@") ? profile.igHandle : `@${profile.igHandle}`)
    : "";
  const igUrl = profile.igHandle ? `https://instagram.com/${igDisplay.replace(/^@/, "")}` : "https://instagram.com";
  const ig = profile.igHandle
    ? `<a href="${esc(igUrl)}" target="_blank" rel="noopener noreferrer" style="${linkStyle}">${esc(igDisplay)}</a>`
    : cph("@instagram");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Sprout Society Monthly Roundup</title>
  <style>
    html { scroll-behavior: smooth; }
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#F7F7F6;">

  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#F7F7F6; font-size:1px; line-height:1px;">${cval(v.intro, "Inbox preview line")}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F7F6;">
    <tr>
      <td align="center" style="padding:40px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:#FFFFFF; border-radius:8px; overflow:hidden;">

          <!-- MASTHEAD -->
          <tr>
            <td style="padding:30px 18px 20px 18px; background-color:#FFFFFF;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <img src="https://ixdnmjchvjzytyhmripc.supabase.co/storage/v1/object/public/newsletter-images/brand/sprout-logo-blackheart.png" alt="Sprout Society" width="156" style="display:block; border:0; height:auto; max-width:156px;">
                  </td>
                  <td align="right" valign="middle" style="font-family:'Lato',Helvetica,Arial,sans-serif; font-size:11px; font-weight:700; letter-spacing:2px; color:#030000; text-transform:uppercase;">
                    ${tval(v.mastheadLabel, "Sprout Monthly")}<br>
                    <span style="color:#8a8a86;">${esc(monthLong)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td bgcolor="#C6C902" style="height:3px; line-height:3px; font-size:1px;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- INTRO / GREETING -->
          <tr>
            <td style="padding:24px 18px 0 18px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:22px; font-weight:900; line-height:1.3; color:#030000;">
              ${cval(v.headline, "A warm one-line headline")}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 18px 2px 18px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#3a3a38;">
              ${cval(v.intro, "A sentence or two welcoming readers and thanking the community.")}
            </td>
          </tr>

          <!-- FOLLOW ON INSTAGRAM -->
          <tr>
            <td style="padding:14px 18px 0 18px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr><td bgcolor="#E10098" style="border-radius:6px;">
                  <a href="${esc(igUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:10px 20px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; font-weight:900; color:#FFFFFF; text-decoration:none;">Follow ${igDisplay ? esc(igDisplay) : "us on Instagram"} &rarr;</a>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- FEATURED EVENT -->
          <tr>
            <td style="padding:24px 18px 6px 18px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:12px; font-weight:900; letter-spacing:2px; color:#E10098; text-transform:uppercase;">
              ${tval(v.featuredEyebrow, "Featured")} &middot; ${esc(monthLong.split(/\s+/)[0])}
            </td>
          </tr>
          <tr>
            <td style="padding:0 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#73C4D6" style="border-radius:8px; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.16);">
                <tr>
                  <td align="center" valign="middle" height="200" style="height:200px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; font-weight:700; color:#0d3d49;">
                    ${
                      photo
                        ? `<img src="${esc(photo)}" alt="${esc(v.featuredTitle || "Featured event")}" width="544" height="200" style="display:block; width:100%; max-width:544px; height:200px; object-fit:cover; object-position:${esc(v.featuredPhotoPos || "center")}; border:0;">`
                        : cph("Paste a featured photo URL")
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 18px 4px 18px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:24px; font-weight:900; line-height:1.25; color:#030000;">
              ${cval(v.featuredTitle, "Featured event title")}
            </td>
          </tr>
          <tr>
            <td style="padding:0 18px 14px 18px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#3a3a38;">
              ${cval(v.featuredRecap, "Two or three sentence recap of the featured event.")}
            </td>
          </tr>
          ${
            (v.featuredAnnounce || "").toString().trim()
              ? `
          <!-- FEATURED ANNOUNCEMENT (optional) -->
          <tr>
            <td style="padding:0 18px 16px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ECECEA; border-radius:8px;">
                <tr>
                  <td style="padding:14px 18px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.5; font-weight:900; color:#E10098;">${cval(v.featuredAnnounce, "Optional announcement.")}</td>
                </tr>
              </table>
            </td>
          </tr>`
              : ""
          }

          <!-- ANNOUNCEMENT -->
          <tr>
            <td style="padding:0 18px 24px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F7F7F6" style="border-radius:8px; box-shadow:0 4px 14px rgba(0,0,0,0.16);">
                <tr>
                  <td width="6" bgcolor="#73C4D6" style="width:6px; line-height:1px; font-size:1px;">&nbsp;</td>
                  <td style="padding:20px 22px; font-family:'Lato',Helvetica,Arial,sans-serif;">
                    <span style="font-size:12px; font-weight:900; letter-spacing:2px; color:#73C4D6; text-transform:uppercase;">${tval(v.coworkingEyebrow, "Announcement")}</span><br>
                    <span style="display:inline-block; padding-top:6px; font-size:20px; font-weight:900; color:#030000; line-height:1.3;">${tval(v.coworkingTitle, "")}</span>
                    <p style="margin:8px 0 0 0; font-size:16px; line-height:1.6; color:#3a3a38;">${cval(v.coworking, "Share an update with the community. What's new, what's changing, what to know.")}</p>
                    ${
                      (v.coworkingThurs || "").toString().trim()
                        ? `<p style="margin:10px 0 0 0; font-size:16px; line-height:1.6; color:#030000;">
                      <span style="display:inline-block; background-color:#FAD100; color:#3a3000; font-size:12px; font-weight:900; padding:3px 9px; border-radius:3px; letter-spacing:1px;">${tval(v.coworkingChip, "Sprout-by-Day")}</span>
                      &nbsp;${cval(v.coworkingThurs, "")}
                    </p>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MEMBERSHIP -->
          <tr>
            <td style="padding:0 18px 24px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#E10098" style="border-radius:8px; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.16);">
                <tr>
                  <td width="6" bgcolor="#FAD100" style="width:6px; line-height:1px; font-size:1px;">&nbsp;</td>
                  <td style="padding:22px 18px; font-family:'Lato',Helvetica,Arial,sans-serif;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-family:'Lato',Helvetica,Arial,sans-serif; font-size:17px; font-weight:700; color:#FFFFFF; line-height:1.45;">${cval(v.membership, "One-line membership ask.")}</td>
                      </tr>
                      <tr>
                        <td style="padding-top:14px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr><td bgcolor="#030000" style="border-radius:4px;">
                              <a href="${esc((v.membershipLink || "").trim() || "https://givebutter.com/sproutmembership")}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:9px 18px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; font-weight:900; color:#FAD100; text-decoration:none; white-space:nowrap;">${tval(v.membershipBtn, "Become a member")} &rarr;</a>
                            </td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MARKETING -->
          <tr>
            <td style="padding:0 18px 24px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#73C4D6" style="border-radius:8px; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.16);">
                <tr>
                  <td width="6" bgcolor="#FAD100" style="width:6px; line-height:1px; font-size:1px;">&nbsp;</td>
                  <td style="padding:22px 18px; font-family:'Lato',Helvetica,Arial,sans-serif;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-family:'Lato',Helvetica,Arial,sans-serif; font-size:17px; font-weight:700; color:#FFFFFF; line-height:1.45;">${
                          v.marketing && v.marketing.toString().trim()
                            ? linkify(esc(v.marketing)).replace(/\n/g, "<br>")
                            : `<span style="color:#FFFFFF; opacity:0.7;">[One-line marketing message.]</span>`
                        }</td>
                      </tr>
                      <tr>
                        <td style="padding-top:14px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr><td bgcolor="#030000" style="border-radius:4px;">
                              ${(() => {
                                const btn = parseBtn(v.marketingLink, "Learn more");
                                return btn
                                  ? `<a href="${esc(btn.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:9px 18px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; font-weight:900; color:#FAD100; text-decoration:none; white-space:nowrap;">${esc(btn.label)} &rarr;</a>`
                                  : `<span style="display:inline-block; padding:9px 18px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; font-weight:900; color:#FAD100; white-space:nowrap;">[Button link]</span>`;
                              })()}
                            </td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SCHOLARSHIP -->
          ${(v.scholarship || "").toString().trim() ? `
          <tr>
            <td style="padding:0 18px 24px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#C6C902" style="border-radius:8px; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.16);">
                <tr>
                  <td width="6" bgcolor="#FAD100" style="width:6px; line-height:1px; font-size:1px;">&nbsp;</td>
                  <td style="padding:22px 18px; font-family:'Lato',Helvetica,Arial,sans-serif;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-family:'Lato',Helvetica,Arial,sans-serif; font-size:17px; font-weight:700; color:#030000; line-height:1.45;">${linkify(esc(v.scholarship), "#030000").replace(/\n/g, "<br>")}</td>
                      </tr>
                      ${(() => {
                        const btn = parseBtn(v.scholarshipLink, "Learn more");
                        const label = (v.scholarshipBtn || "").toString().trim() || (btn ? btn.label : "Learn more");
                        return btn ? `
                      <tr>
                        <td style="padding-top:14px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr><td bgcolor="#030000" style="border-radius:4px;">
                              <a href="${esc(btn.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:9px 18px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; font-weight:900; color:#FAD100; text-decoration:none; white-space:nowrap;">${esc(label)} &rarr;</a>
                            </td></tr>
                          </table>
                        </td>
                      </tr>` : "";
                      })()}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ""}

          <!-- COMMUNITY SPOTLIGHT -->
          <tr>
            <td style="padding:0 18px 28px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #ECECEA; border-radius:8px; box-shadow:0 4px 14px rgba(0,0,0,0.16);">
                <tr>
                  <td width="6" bgcolor="#C6C902" style="width:6px; line-height:1px; font-size:1px;">&nbsp;</td>
                  <td style="padding:22px 18px; font-family:'Lato',Helvetica,Arial,sans-serif;">
                    <span style="font-size:12px; font-weight:900; letter-spacing:2px; color:#8a9000; text-transform:uppercase;">${tval(v.spotlightEyebrow, "Community Sprout Shout")}</span>
                    ${
                      (v.spotlightImage || "").toString().trim()
                        ? `<img src="${esc(v.spotlightImage)}" alt="${esc(v.spotlightName || "Member")}" width="100%" height="200" style="display:block; width:100%; height:200px; border-radius:8px; object-fit:cover; object-position:${esc(v.spotlightImagePos || "center")}; border:0; margin:12px 0 14px 0;">`
                        : `<div style="height:12px; line-height:12px; font-size:1px;">&nbsp;</div>`
                    }
                    <span style="font-size:18px; font-weight:900; color:#030000; line-height:1.4;">${cval(v.spotlightName, "Member name")}</span><br>
                    <span style="display:inline-block; margin-top:4px; font-size:16px; line-height:1.6; color:#3a3a38;">${cval(v.spotlightBlurb, "Two or three line spotlight blurb.")}</span>
                    ${
                      (v.spotlightTestimonial || "").toString().trim()
                        ? `
                    <!-- testimonial pop-out -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 4px 0; background:#C6C902; border-radius:10px; box-shadow:0 6px 18px rgba(0,0,0,0.22);">
                      <tr>
                        <td style="padding:20px 20px 18px 20px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; font-style:italic; font-weight:600; color:#030000;"><span style="font-family:Georgia,'Times New Roman',serif; font-size:46px; line-height:0; font-weight:900; color:#FAD100; vertical-align:-16px; padding-right:6px;">&ldquo;</span>${cval(v.spotlightTestimonial, "A short testimonial or quote.")}<span style="font-family:Georgia,'Times New Roman',serif; font-size:46px; line-height:0; font-weight:900; color:#FAD100; vertical-align:-16px; padding-left:4px;">&rdquo;</span></td>
                      </tr>
                    </table>`
                        : ""
                    }
                    ${spotlightButtonRow(v.spotlightIG, v.spotlightWeb)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- EVENTS (scroll target — id on a real row so it isn't foster-parented out of the table) -->
          <tr id="events">
            <td style="padding:6px 18px 0 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td bgcolor="#ECECEA" style="height:1px; line-height:1px; font-size:1px;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 18px 4px 18px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; font-weight:900; letter-spacing:2px; color:#030000; text-transform:uppercase;">
              ${tval(v.upcomingTitle, "Upcoming")}
            </td>
          </tr>
          <tr>
            <td style="padding:0 18px 6px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${compactUpcomingRows(v.upcoming)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 18px 4px 18px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; font-weight:900; letter-spacing:2px; color:#030000; text-transform:uppercase;">
              ${tval(v.pastTitle, "Past Events")}
            </td>
          </tr>
          <tr>
            <td style="padding:0 18px 24px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${compactPastRows(v.past)}
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:34px 20px; background-color:#030000; font-family:'Lato',Helvetica,Arial,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top">
                    <p style="margin:0 0 6px 0; font-size:14px; font-weight:900; color:#F7F7F6; letter-spacing:1px;">${tval(v.footerBrand, "SPROUT SOCIETY")}</p>
                    <p style="margin:0 0 14px 0; font-size:13px; line-height:1.6; color:#9a9a96;">Brooklyn, NY &nbsp;·&nbsp; ${ig}</p>
                    ${(() => {
                      const donate = parseBtn(v.donateLink, "Donate");
                      const member = parseBtn(v.memberLink, "Become a member");
                      const cell = (b, bg) => `<td width="220" style="border-radius:6px; background-color:${bg};"><a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer" style="display:block; padding:10px 22px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; font-weight:900; letter-spacing:0.5px; color:#ffffff; text-decoration:none; border-radius:6px; text-align:center;">${esc(b.label)} &rarr;</a></td>`;
                      const rows = [donate ? cell(donate, "#E10098") : "", member ? cell(member, "#2a8ca0") : ""].filter(Boolean);
                      if (!rows.length) return "";
                      const spacer = '<tr><td style="height:10px; line-height:10px; font-size:1px;">&nbsp;</td></tr>';
                      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">${rows.map(c=>`<tr>${c}</tr>`).join(spacer)}</table>`;
                    })()}
                    <p style="margin:0; font-size:11px; line-height:1.6; color:#9a9a96;">
                      <a href="mailto:hello@sproutsociety.org?subject=Unsubscribe" style="color:#9a9a96; text-decoration:underline;">Unsubscribe</a> &nbsp;·&nbsp; ${esc(profile.address || "Sprout Society, Brooklyn, NY")}${profile.ein ? `<br>Sprout Society is a registered 501(c)(3) nonprofit &nbsp;·&nbsp; EIN ${esc(profile.ein)}` : ""}
                    </p>
                  </td>
                  <td valign="middle" align="right" width="130" style="padding-left:16px;">
                    <img src="https://ixdnmjchvjzytyhmripc.supabase.co/storage/v1/object/public/newsletter-images/brand/sprout-logo-white.png" alt="Sprout Society" width="120" style="display:block; border:0; height:auto; max-width:120px;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Collect the unique remaining [BRACKET] placeholders in an html string.
 * Returns [{ key, label }] where `key` is the raw match (used for literal
 * replacement, may contain newlines) and `label` is whitespace-collapsed for UI.
 */
export function extractPlaceholders(html) {
  const raw = html.match(/\[[^\]]*\]/g) || [];
  const seen = new Set();
  const out = [];
  for (const k of raw) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ key: k, label: k.replace(/\s+/g, " ").trim() });
  }
  return out;
}

/* ─── Build ──────────────────────────────────────────────────────────────────── */

/**
 * Render a newsletter.
 *   templateId    — "monthly-roundup" | "quick-hit"
 *   monthYear     — e.g. "June 2026" (falls back to today's month)
 *   events        — CRM events (used for recap + upcoming blocks on the roundup)
 *   profile       — org profile (website + IG fill the footer)
 *   fieldValues   — { [placeholderKey]: string } the user typed
 *   spotlightName — optional name to drop into the spotlight block
 *   recapLimit / upcomingLimit — caps on auto-filled blocks
 *   today         — "YYYY-MM-DD" (passed in so the engine stays pure/testable)
 *
 * Returns { html, placeholders, recapsUsed, upcomingUsed }.
 * placeholders is computed AFTER CRM fill but BEFORE field substitution, so the
 * editable field list is stable no matter what the user has filled in.
 */
export function buildNewsletter({
  templateId = "monthly-roundup",
  monthYear,
  events = [],
  profile = {},
  fieldValues = {},
  spotlightName = null,
  recapLimit = 4,
  upcomingLimit = 4,
  today,
} = {}) {
  // Compact roundup uses the structured-section renderer, not bracket extraction.
  if (templateId === "monthly-roundup-compact") {
    return {
      html: buildCompact({ fieldValues, monthYear: monthYear || defaultMonthYear(today), profile, today }),
      placeholders: [],
      recapsUsed: [],
      upcomingUsed: [],
    };
  }

  const tpl = RAW_TEMPLATES[templateId] || RAW_TEMPLATES["monthly-roundup"];
  let html = tpl;

  const monthLong = monthYear || defaultMonthYear(today) || "[MONTH YEAR]";
  const monthName = monthLong.split(/\s+/)[0];

  let recapsUsed = [];
  let upcomingUsed = [];

  if (templateId === "monthly-roundup") {
    const t = today || "";
    recapsUsed = events
      .filter((e) => e.status === "completed" && (e.recap || "").trim())
      .sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? ""))
      .slice(0, recapLimit);

    upcomingUsed = events
      .filter((e) => e.status === "upcoming" && e.event_date && (!t || e.event_date >= t))
      .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""))
      .slice(0, upcomingLimit);

    const recapBlocks = recapsUsed.length
      ? recapsUsed.map(recapBlock).join("\n\n")
      : `              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px; border-left:4px solid #73C4D6; background-color:#F7F7F6; border-radius:0 8px 8px 0;">
                <tr><td style="padding:16px 18px;">
                  <p style="margin:0 0 4px 0; font-size:17px; font-weight:900; color:#030000;">[EVENT NAME]</p>
                  <p style="margin:0; font-size:14px; line-height:1.55; color:#4B5563;">[2-3 sentence recap]</p>
                </td></tr>
              </table>`;

    const eventBlocks = upcomingUsed.length
      ? upcomingUsed.map(eventBlock).join("\n\n")
      : `              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                <tr><td valign="top"><p style="margin:0; font-size:13px; color:#4B5563;">[No upcoming events - add some, or remove this section]</p></td></tr>
              </table>`;

    html = html
      .replace(/<!-- RECAP BLOCK[\s\S]*\/RECAP BLOCK -->/, recapBlocks)
      .replace(/<!-- EVENT BLOCK[\s\S]*\/EVENT BLOCK -->/, eventBlocks);
  }

  html = html
    .replace(/\[MONTH YEAR\]/g, esc(monthLong))
    .replace(/\[MONTH\]/g, esc(monthName));

  // Footer + RSVP link from the org profile, if present.
  if (profile.website) {
    html = html
      .replace(/\[WEBSITE\]/g, esc(profile.website))
      .replace(/\[RSVP \/ EVENTS PAGE LINK\]/g, esc(profile.website));
  }
  if (profile.igHandle) {
    const handle = profile.igHandle.startsWith("@") ? profile.igHandle : `@${profile.igHandle}`;
    html = html
      .replace(/\[INSTAGRAM @handle\]/g, esc(handle))
      .replace(/\[INSTAGRAM\]/g, esc(handle));
  }

  // Spotlight name from a chosen contact; role/blurb stay editable.
  if (spotlightName) {
    html = html
      .replace(/\[NAME — e\.g\. Pat\]/g, esc(spotlightName))
      .replace(/\[NAME\]/g, esc(spotlightName));
    // No photo on file → drop the optional photo cell so there's no broken img.
    html = html.replace(/<!-- Optional photo[\s\S]*?<\/td>\s*/, "");
  }

  // Placeholders the user still needs to fill (stable list).
  const placeholders = extractPlaceholders(html);

  // Apply the user's field values. Empty values keep the bracket visible.
  for (const [key, val] of Object.entries(fieldValues)) {
    if (val && val.toString().trim()) {
      html = replaceAllLiteral(html, key, esc(val));
    }
  }

  return { html, placeholders, recapsUsed, upcomingUsed };
}

/* ─── Raw Templates ──────────────────────────────────────────────────────────── */
// 600px, table-based, inline-styled. Mirror docs/newsletter/*.html. Keep the
// <!-- RECAP BLOCK ... /RECAP BLOCK --> and <!-- EVENT BLOCK ... /EVENT BLOCK -->
// markers intact — buildNewsletter swaps them for CRM-derived content.

const MONTHLY_ROUNDUP = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sprout Society — [MONTH] Roundup</title>
</head>
<body style="margin:0; padding:0; background-color:#F7F7F6; font-family:'Lato','Helvetica Neue',Arial,sans-serif; color:#030000;">

  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
    [ONE-LINE PREVIEW — e.g. "Thanks for a great month + here's what's coming up at Sprout."]
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F7F6;">
    <tr>
      <td align="center" style="padding:24px 12px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#F7F7F6;">

          <!-- ============ HEADER ============ -->
          <tr>
            <td style="background-color:#030000; padding:28px 32px; border-radius:14px 14px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:24px; font-weight:900; letter-spacing:-0.5px; color:#C6C902;">
                    SPROUT&nbsp;SOCIETY
                  </td>
                  <td align="right" style="font-size:12px; font-weight:700; color:#73C4D6; text-transform:uppercase; letter-spacing:1px;">
                    [MONTH YEAR]
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ============ INTRO / THANK YOU ============ -->
          <tr>
            <td style="background-color:#ffffff; padding:32px 32px 8px 32px;">
              <h1 style="margin:0 0 12px 0; font-size:26px; line-height:1.25; font-weight:900; color:#030000;">
                Thanks for growing with us. &#127793;
              </h1>
              <p style="margin:0; font-size:16px; line-height:1.6; color:#4B5563;">
                [1-2 warm sentences. e.g. "What a month. Whether you came to co-work, threw down at game night, or just waved from afar - thank you for being part of the Sprout community."]
              </p>
            </td>
          </tr>

          <!-- ============ SECTION: EVENT RECAPS ============ -->
          <tr>
            <td style="background-color:#ffffff; padding:24px 32px 8px 32px;">
              <p style="margin:0 0 16px 0; font-size:12px; font-weight:900; letter-spacing:1.5px; text-transform:uppercase; color:#E10098;">
                What we got up to
              </p>

              <!-- RECAP BLOCK (copy this whole block per event) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px; border-left:4px solid #73C4D6; background-color:#F7F7F6; border-radius:0 8px 8px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 4px 0; font-size:17px; font-weight:900; color:#030000;">[EVENT NAME]</p>
                    <p style="margin:0; font-size:14px; line-height:1.55; color:#4B5563;">[2-3 sentence recap.]</p>
                  </td>
                </tr>
              </table>
              <!-- /RECAP BLOCK -->
            </td>
          </tr>

          <!-- ============ SECTION: UPCOMING EVENTS ============ -->
          <tr>
            <td style="background-color:#ffffff; padding:24px 32px 8px 32px;">
              <p style="margin:0 0 16px 0; font-size:12px; font-weight:900; letter-spacing:1.5px; text-transform:uppercase; color:#155e6e;">
                Coming up
              </p>

              <!-- EVENT BLOCK (copy per event) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                <tr>
                  <td width="64" valign="top" style="padding-right:14px;">
                    <table role="presentation" width="56" cellpadding="0" cellspacing="0" style="background-color:#C6C902; border-radius:10px;">
                      <tr><td align="center" style="padding:8px 0 0 0; font-size:11px; font-weight:900; text-transform:uppercase; color:#3a3d00;">[MON]</td></tr>
                      <tr><td align="center" style="padding:0 0 8px 0; font-size:24px; font-weight:900; line-height:1; color:#030000;">[12]</td></tr>
                    </table>
                  </td>
                  <td valign="top">
                    <p style="margin:0 0 2px 0; font-size:16px; font-weight:900; color:#030000;">[EVENT NAME]</p>
                    <p style="margin:0; font-size:13px; line-height:1.5; color:#4B5563;">[Time · Location · one-line description]</p>
                  </td>
                </tr>
              </table>
              <!-- /EVENT BLOCK -->

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:6px;">
                <tr>
                  <td style="border-radius:8px; background-color:#030000;">
                    <a href="[RSVP / EVENTS PAGE LINK]" style="display:inline-block; padding:12px 26px; font-size:14px; font-weight:900; color:#C6C902; text-decoration:none;">See all events &amp; RSVP &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ============ SECTION: MEMBERSHIP CTA ============ -->
          <tr>
            <td style="background-color:#ffffff; padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#E10098; border-radius:14px;">
                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0 0 8px 0; font-size:20px; font-weight:900; color:#FFFFFF;">Membership that includes everyone</p>
                    <p style="margin:0 0 18px 0; font-size:14px; line-height:1.55; color:#FFCDF0;">
                      Sprout runs on a pay-it-forward model: members' dues and donations fund
                      <strong style="color:#FFFFFF;">scholarship memberships</strong> for neighbors who can't afford one.
                      Become a member, or apply for a scholarship &mdash; no one's left out. That's the whole point.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-radius:8px; background-color:#FFFFFF;">
                          <a href="https://docs.google.com/forms/d/e/1FAIpQLSf_dl6csiQD3PWhrKJzAU56anu8jDMQ24ilAobIYpbb8BZGcw/viewform" style="display:inline-block; padding:12px 26px; font-size:14px; font-weight:900; color:#E10098; text-decoration:none;">Apply for a scholarship &rarr;</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:14px 0 0 0; font-size:13px; color:#FFCDF0;">
                      Able to pay it forward? <a href="https://givebutter.com/sproutmembership" style="color:#FFFFFF; font-weight:900; text-decoration:underline;">Become a member &rarr;</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ============ SECTION: MEMBER SPOTLIGHT ============ -->
          <tr>
            <td style="background-color:#ffffff; padding:8px 32px 32px 32px;">
              <p style="margin:0 0 16px 0; font-size:12px; font-weight:900; letter-spacing:1.5px; text-transform:uppercase; color:#7a5c00;">
                Member spotlight
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FEF4C1; border-radius:14px;">
                <tr>
                  <td style="padding:24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Optional photo. Delete this <td> if no photo. -->
                        <td width="72" valign="top" style="padding-right:16px;">
                          <img src="[PHOTO URL]" alt="[NAME]" width="64" height="64" style="border-radius:50%; display:block; object-fit:cover;">
                        </td>
                        <td valign="top">
                          <p style="margin:0 0 2px 0; font-size:18px; font-weight:900; color:#030000;">[NAME — e.g. Pat]</p>
                          <p style="margin:0 0 10px 0; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#7a5c00;">[ROLE / ONE-LINER]</p>
                          <p style="margin:0; font-size:14px; line-height:1.6; color:#4B5563;">[2-4 sentences. How they got involved, what they bring to the community, a fun detail.]</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ============ FOOTER ============ -->
          <tr>
            <td style="background-color:#030000; padding:28px 32px; border-radius:0 0 14px 14px;">
              <p style="margin:0 0 10px 0; font-size:14px; font-weight:900; color:#C6C902;">Sprout Society</p>
              <p style="margin:0 0 14px 0; font-size:12px; line-height:1.6; color:#9CA3AF;">
                Brooklyn, NY · [WEBSITE] · [INSTAGRAM @handle]
              </p>
              <p style="margin:0; font-size:11px; line-height:1.5; color:#6b7280;">
                You're getting this because you connected with Sprout Society.<br>
                <a href="*|UNSUB|*" style="color:#73C4D6; text-decoration:underline;">Unsubscribe</a> &nbsp;·&nbsp; *|LIST:ADDRESS|*
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const QUICK_HIT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Sprout Society</title>
  <style> :root { color-scheme: light dark; supported-color-schemes: light dark; } </style>
</head>
<body style="margin:0; padding:0; background-color:#F7F7F6; font-family:'Lato','Helvetica Neue',Arial,sans-serif; color:#030000;">

  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">[ONE-LINE PREVIEW]</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F7F6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#030000; padding:26px 32px; border-radius:14px 14px 0 0;">
              <img src="https://ixdnmjchvjzytyhmripc.supabase.co/storage/v1/object/public/newsletter-images/brand/sprout-logo-white.png" alt="Sprout Society" width="156" style="display:block; border:0; height:auto; max-width:156px;">
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background-color:#ffffff; padding:32px;">

              <h1 style="margin:0 0 10px 0; font-size:24px; line-height:1.25; font-weight:900; color:#030000;">
                [HEADLINE — e.g. "Game night was a blast - here's what's next"]
              </h1>
              <p style="margin:0 0 24px 0; font-size:16px; line-height:1.6; color:#4B5563;">
                [2-3 sentence recap of the thing that just happened. Warm, short, a thank-you in there.]
              </p>

              <!-- NEXT EVENT -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F7F6; border-radius:12px; margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 6px 0; font-size:11px; font-weight:900; letter-spacing:1.5px; text-transform:uppercase; color:#E10098;">Next up</p>
                    <p style="margin:0 0 4px 0; font-size:18px; font-weight:900; color:#030000;">[EVENT NAME]</p>
                    <p style="margin:0; font-size:14px; line-height:1.5; color:#4B5563;">[Date · Time · Location · one line]</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px; background-color:#E10098;">
                    <a href="[RSVP LINK / SCHOLARSHIP LINK]" style="display:inline-block; padding:13px 30px; font-size:15px; font-weight:900; color:#FFFFFF; text-decoration:none;">[RSVP &rarr; / Apply for a scholarship &rarr;]</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#030000; padding:34px 32px; border-radius:0 0 14px 14px; font-family:'Lato','Helvetica Neue',Arial,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top">
                    <p style="margin:0 0 6px 0; font-size:14px; font-weight:900; color:#F7F7F6; letter-spacing:1px;">SPROUT SOCIETY</p>
                    <p style="margin:0 0 14px 0; font-size:13px; line-height:1.6; color:#9a9a96;">Brooklyn, NY &nbsp;·&nbsp; <a href="https://instagram.com/sproutsociety" target="_blank" rel="noopener noreferrer" style="color:#9a9a96; text-decoration:underline;">@sproutsociety</a></p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
                      <tr>
                        <td width="220" style="border-radius:6px; background-color:#E10098;"><a href="https://givebutter.com/sproutspacedonors" target="_blank" rel="noopener noreferrer" style="display:block; padding:10px 22px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; font-weight:900; letter-spacing:0.5px; color:#ffffff; text-decoration:none; border-radius:6px; text-align:center;">Donate &rarr;</a></td>
                      </tr>
                      <tr><td style="height:10px; line-height:10px; font-size:1px;">&nbsp;</td></tr>
                      <tr>
                        <td width="220" style="border-radius:6px; background-color:#2a8ca0;"><a href="https://givebutter.com/sproutmembership" target="_blank" rel="noopener noreferrer" style="display:block; padding:10px 22px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; font-weight:900; letter-spacing:0.5px; color:#ffffff; text-decoration:none; border-radius:6px; text-align:center;">Become a member &rarr;</a></td>
                      </tr>
                    </table>
                    <p style="margin:0; font-size:11px; line-height:1.6; color:#9a9a96;">
                      <a href="mailto:hello@sproutsociety.org?subject=Unsubscribe" style="color:#9a9a96; text-decoration:underline;">Unsubscribe</a> &nbsp;·&nbsp; 26 Scott Ave, Brooklyn, NY 11237<br>Sprout Society is a registered 501(c)(3) nonprofit &nbsp;·&nbsp; EIN 83-1298420
                    </p>
                  </td>
                  <td valign="middle" align="right" width="130" style="padding-left:16px;">
                    <img src="https://ixdnmjchvjzytyhmripc.supabase.co/storage/v1/object/public/newsletter-images/brand/sprout-logo-white.png" alt="Sprout Society" width="120" style="display:block; border:0; height:auto; max-width:120px;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const RAW_TEMPLATES = {
  "monthly-roundup": MONTHLY_ROUNDUP,
  "quick-hit": QUICK_HIT,
};
