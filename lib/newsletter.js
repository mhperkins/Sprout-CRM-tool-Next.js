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
  { bg: "#C6C902", fg: "#3a3d00" },
  { bg: "#73C4D6", fg: "#0d3d49" },
];

export const TEMPLATES = [
  {
    id: "monthly-roundup",
    name: "Monthly Roundup",
    blurb: "Thank-you + event recaps → upcoming events → membership CTA → spotlight. Auto-fills recaps and upcoming events from the CRM.",
  },
  {
    id: "quick-hit",
    name: "Quick Hit",
    blurb: "Short single-focus send between roundups. One recap, one upcoming event, one CTA. Manual fill.",
  },
];

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
  <title>Sprout Society</title>
</head>
<body style="margin:0; padding:0; background-color:#F7F7F6; font-family:'Lato','Helvetica Neue',Arial,sans-serif; color:#030000;">

  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">[ONE-LINE PREVIEW]</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F7F6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#030000; padding:24px 32px; border-radius:14px 14px 0 0;">
              <span style="font-size:22px; font-weight:900; letter-spacing:-0.5px; color:#C6C902;">SPROUT&nbsp;SOCIETY</span>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background-color:#ffffff; padding:32px;">

              <h1 style="margin:0 0 10px 0; font-size:24px; line-height:1.25; font-weight:900; color:#030000;">
                [HEADLINE — e.g. "Game night was a blast - here's what's next"]
              </h1>
              <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#4B5563;">
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
            <td style="background-color:#030000; padding:24px 32px; border-radius:0 0 14px 14px;">
              <p style="margin:0 0 12px 0; font-size:12px; line-height:1.6; color:#9CA3AF;">
                Sprout Society · Brooklyn, NY · [WEBSITE] · [INSTAGRAM]
              </p>
              <p style="margin:0; font-size:11px; color:#6b7280;">
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

const RAW_TEMPLATES = {
  "monthly-roundup": MONTHLY_ROUNDUP,
  "quick-hit": QUICK_HIT,
};
