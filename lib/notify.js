// lib/notify.js — SERVER ONLY. Staff email alerts, sent through the Gmail API as
// hello@sproutsociety.org using the same env credentials as app/api/send.
//
// Env: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER,
//      BOOKING_NOTIFY_TO (optional; defaults to Max).

import { showcaseLinks } from "./showcaseForm";
import { programLinks } from "./programForm";
import { pieceLine, readyLabel, moreLabel } from "./galleryForm";
import { interestLabel } from "./interestForm";
import { DISCORD_URL } from "./surveyForm";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export const BOOKING_NOTIFY_TO = process.env.BOOKING_NOTIFY_TO || "maxperkins@sproutsociety.org";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const b64url = (s) => Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const encSubject = (s) => `=?UTF-8?B?${Buffer.from(s || "", "utf8").toString("base64")}?=`;
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

/** A Google access token for hello@ (Gmail send + Calendar read share the same credentials). */
export async function accessToken(refreshToken = process.env.GMAIL_REFRESH_TOKEN) {
  const body = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID,
    client_secret: process.env.GMAIL_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const r = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const j = await r.json();
  if (!j.access_token) throw new Error("Gmail token refresh failed: " + (j.error_description || j.error || "unknown"));
  return j.access_token;
}

/** Send one HTML email. Throws on failure — callers decide whether that matters. */
export async function sendEmail({ to, subject, html, replyTo, from: fromAddr, fromName = "Sprout Society", refreshToken }) {
  const token = refreshToken || process.env.GMAIL_REFRESH_TOKEN;
  if (!token) throw new Error("Gmail is not connected on the server.");
  const from = fromAddr || process.env.GMAIL_SENDER || "hello@sproutsociety.org";
  const lines = [
    `From: ${fromName} <${from}>`,
    `To: ${to}`,
    isEmail(replyTo) ? `Reply-To: ${String(replyTo).trim()}` : null,
    `Subject: ${encSubject(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ].filter(Boolean);
  const body = Buffer.from(html || "", "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
  const raw = b64url(`${lines.join("\r\n")}\r\n\r\n${body}`);

  const r = await fetch(SEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(token)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!r.ok) throw new Error("Gmail send failed: " + (await r.text()).slice(0, 300));
  return r.json();
}

const fmtDate = (d) => {
  if (!d) return "";
  if (d === "tbd") return "Date not set yet";
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }
  catch { return d; }
};

const fmtTime = (t) => {
  const m = String(t || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t || "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]}${h < 12 ? "am" : "pm"}`;
};

/** Email staff that a hosting request just came in through the public /book form. */
export async function notifyBookingRequest({ answers, eventId, token, origin, slots = [] }) {
  const a = answers || {};
  const asked = slots.map((s) => `${fmtDate(s.date)}, ${fmtTime(s.start_time)}–${fmtTime(s.end_time)}`).join("; ");
  const when = [fmtDate(a.event_date), [fmtTime(a.start_time), fmtTime(a.end_time)].filter(Boolean).join("–")]
    .filter(Boolean).join(" · ");

  const rows = [
    ["Name", a.contact_name],
    ["Email", a.contact_email],
    ["Phone", a.contact_phone],
    ["Organization", a.org_name],
    ["Event", a.event_name],
    ["Type", a.event_type],
    ["Booking", a.booking_kind],
    [slots.length ? `Dates asked for (${slots.length})` : "When", slots.length ? asked : when],
    ["Backup date", fmtDate(a.alt_date)],
    ["Expected attendance", a.attendance === "tbd" ? "Don't know yet" : a.attendance],
    ["Ticketed or free", a.admission],
    ["Public or private", a.audience],
    ["Description", a.short_desc],
  ].filter(([, v]) => String(v ?? "").trim() !== "");

  const btn = (href, label, bg) =>
    `<a href="${esc(href)}" style="display:inline-block;background:${bg};color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:6px;margin:0 8px 8px 0;">${esc(label)}</a>`;

  const html = `<!doctype html><html><body style="margin:0;background:#F7F7F6;font-family:Lato,Helvetica,Arial,sans-serif;color:#030000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#030000;padding:18px 24px;color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Sprout Society · New hosting request</td></tr>
<tr><td style="height:4px;background:#C6C902;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px;">
<div style="font-size:22px;font-weight:900;line-height:1.3;">${esc(a.event_name || "New event request")}</div>
<div style="font-size:15px;color:#5f5f5c;margin-top:6px;">${esc(a.contact_name || "Someone")} wants to host at Sprout Society. Reply to this email to reach them directly.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:1px solid #ececea;">
${rows.map(([k, v]) => `<tr><td style="padding:9px 12px 9px 0;border-bottom:1px solid #ececea;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8a8a86;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #ececea;font-size:15px;line-height:1.5;">${esc(v)}</td></tr>`).join("")}
</table>
${btn(`${origin}/?event=${encodeURIComponent(eventId)}`, "Review in the CRM", "#030000")}${btn(`${origin}/portal/${token}`, "Open their portal", "#E10098")}
<div style="font-size:12.5px;color:#8a8a86;margin-top:14px;line-height:1.6;">It is saved as a Pending request on the Events page (event id ${esc(eventId)}). Nothing goes on the calendar until you approve it.</div>
</td></tr></table></td></tr></table></body></html>`;

  const subject = `New hosting request: ${a.event_name || a.org_name || a.contact_name || "event"}${a.event_date ? ` (${fmtDate(a.event_date)})` : ""}`;
  return sendEmail({ to: BOOKING_NOTIFY_TO, subject, html, replyTo: a.contact_email });
}

const shell = (bar, inner) => `<!doctype html><html><body style="margin:0;background:#F7F7F6;font-family:Lato,Helvetica,Arial,sans-serif;color:#030000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#030000;padding:18px 24px;color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">${esc(bar)}</td></tr>
<tr><td style="height:4px;background:#C6C902;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px;">${inner}</td></tr></table></td></tr></table></body></html>`;

const slotRows = (list) => `<table width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 18px;border-top:1px solid #ececea;">${list.map((s) =>
  `<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #ececea;font-size:15px;white-space:nowrap;">${esc(fmtDate(s.date))}</td><td style="padding:8px 0;border-bottom:1px solid #ececea;font-size:15px;color:#5f5f5c;">${esc(fmtTime(s.start_time))}–${esc(fmtTime(s.end_time))}</td></tr>`).join("")}</table>`;

const mailBtn = (href, label, bg) =>
  `<a href="${esc(href)}" style="display:inline-block;background:${bg};color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:6px;margin:0 8px 8px 0;">${esc(label)}</a>`;

/** A client asked for more dates from their portal. */
export async function notifySlotRequest({ eventName, contactName, contactEmail, slots = [], note = "", origin }) {
  const html = shell("Sprout Society · Dates requested", `
<div style="font-size:22px;font-weight:900;line-height:1.3;">${esc(eventName || "A booking")}</div>
<div style="font-size:15px;color:#5f5f5c;margin-top:6px;">${esc(contactName || "A client")} asked for ${slots.length} date${slots.length === 1 ? "" : "s"} from their portal.</div>
${slotRows(slots)}
${note ? `<div style="font-size:14px;line-height:1.6;background:#F7F7F6;border-radius:6px;padding:12px 14px;margin-bottom:16px;">${esc(note)}</div>` : ""}
${mailBtn(`${origin}/?view=events`, "Approve in the CRM", "#030000")}
<div style="font-size:12.5px;color:#8a8a86;margin-top:14px;line-height:1.6;">Nothing goes on the calendar until you approve it on the Events page.</div>`);
  return sendEmail({ to: BOOKING_NOTIFY_TO, subject: `Dates requested: ${eventName || contactName || "booking"} (${slots.length})`, html, replyTo: contactEmail });
}

/**
 * Tell the client we got their request. Sent from /book (with or without dates) and
 * whenever they ask for more dates from their portal. Nothing is confirmed yet.
 */
export async function notifySlotReceived({ to, name, eventName, slots = [], portalUrl, fromBook = false }) {
  if (!isEmail(to)) return null;
  const first = String(name || "").trim().split(/\s+/)[0];
  const n = slots.length;
  const html = shell("Sprout Society · Request received", `
<div style="font-size:16px;line-height:1.6;">Hi${first ? ` ${esc(first)}` : ""},</div>
<div style="font-size:16px;line-height:1.6;margin-top:10px;">${fromBook
    ? `Thanks for reaching out about hosting at Sprout Society. We got your request${eventName ? ` for <b>${esc(eventName)}</b>` : ""}.`
    : `We got your request for more dates${eventName ? ` for <b>${esc(eventName)}</b>` : ""}.`}</div>
${n ? `<div style="font-size:16px;line-height:1.6;margin-top:10px;">You asked for ${n === 1 ? "this date" : `these ${n} dates`}:</div>${slotRows(slots)}
<div style="font-size:15px;line-height:1.6;margin-bottom:16px;"><b>These aren't confirmed yet.</b> We'll check them and email you once each one is confirmed or if one doesn't work.</div>`
    : `<div style="font-size:15px;line-height:1.6;margin:10px 0 16px;">Whenever you know your dates, pick them on our calendar from your page below. We'll confirm each one by email.</div>`}
<div style="font-size:15px;line-height:1.6;margin-bottom:16px;">Your page shows your dates and lets you add details, links, and files. Save this email so you can find it again.</div>
${portalUrl ? mailBtn(portalUrl, "Open your page", "#E10098") : ""}
<div style="font-size:15px;line-height:1.6;margin-top:10px;">Thank you,<br>Max<br>Community Manager</div>`);
  const subject = n ? `We got your request for ${n} date${n === 1 ? "" : "s"} at Sprout Society` : "We got your request to host at Sprout Society";
  return sendEmail({ to, subject, html, replyTo: BOOKING_NOTIFY_TO });
}

/** Tell the client what was approved or declined. */
export async function notifySlotDecision({ to, name, eventName, confirmed = [], declined = [], reason = "", portalUrl }) {
  if (!isEmail(to)) return null;
  const first = String(name || "").trim().split(/\s+/)[0];
  const html = shell("Sprout Society · Your dates", `
<div style="font-size:16px;line-height:1.6;">Hi${first ? ` ${esc(first)}` : ""},</div>
${confirmed.length ? `<div style="font-size:16px;line-height:1.6;margin-top:10px;">These dates are confirmed for <b>${esc(eventName || "your booking")}</b>:</div>${slotRows(confirmed)}` : ""}
${declined.length ? `<div style="font-size:16px;line-height:1.6;margin-top:10px;">We can't do these dates:</div>${slotRows(declined)}${reason ? `<div style="font-size:15px;line-height:1.6;margin-bottom:16px;">${esc(reason)}</div>` : ""}` : ""}
<div style="font-size:15px;line-height:1.6;margin-bottom:16px;">Your portal always shows your confirmed dates, and it's where you ask for more.</div>
${portalUrl ? mailBtn(portalUrl, "Open your portal", "#E10098") : ""}
<div style="font-size:15px;line-height:1.6;margin-top:10px;">Thank you,<br>Max<br>Community Manager</div>`);
  const subject = confirmed.length && !declined.length ? "Confirmed: your dates at Sprout Society"
    : confirmed.length ? "Your dates at Sprout Society (some confirmed)" : "About your dates at Sprout Society";
  return sendEmail({ to, subject, html, replyTo: BOOKING_NOTIFY_TO });
}

/**
 * A showcase application landed at /showcase. Max gets the pitch and the links in
 * the email itself, so he can judge most of them without opening the CRM.
 */
export async function notifyShowcaseApplication({ data, origin }) {
  const d = data || {};
  const links = showcaseLinks(d);
  const rows = [
    ["Name", d.name],
    ["Email", d.email],
    ["Phone", d.phone],
    ["Instagram", d.instagram],
    ["Does", d.role],
    ["Would showcase", d.pitch],
    ["Notes", d.notes],
  ].filter(([, v]) => String(v ?? "").trim() !== "");

  const chip = (href, label) =>
    `<a href="${esc(href)}" style="display:inline-block;border:1px solid #d8d8d2;color:#2a8ca0;font-weight:700;font-size:13px;text-decoration:none;padding:7px 14px;border-radius:999px;margin:0 6px 6px 0;">${esc(label)}</a>`;

  const html = `<!doctype html><html><body style="margin:0;background:#F7F7F6;font-family:Lato,Helvetica,Arial,sans-serif;color:#030000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#030000;padding:18px 24px;color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Sprout Society · Showcase application</td></tr>
<tr><td style="height:4px;background:#C6C902;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px;">
<div style="font-size:22px;font-weight:900;line-height:1.3;">${esc(d.name || "Someone")}</div>
<div style="font-size:15px;color:#5f5f5c;margin-top:6px;">wants to showcase at Sprout N Tell. Reply to this email to reach them directly.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:1px solid #ececea;">
${rows.map(([k, v]) => `<tr><td style="padding:9px 12px 9px 0;border-bottom:1px solid #ececea;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8a8a86;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #ececea;font-size:15px;line-height:1.5;">${esc(v)}</td></tr>`).join("")}
</table>
${links.length ? `<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8a8a86;margin-bottom:8px;">Their work</div>${links.map((l) => chip(l.url, l.label)).join("")}` : ""}
${(d.files || []).length ? `<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8a8a86;margin:14px 0 8px;">Files they sent</div>${(d.files || []).map((f) => chip(f.url, f.name || "File")).join("")}` : ""}
<div style="margin-top:18px;"><a href="${esc(origin)}/?view=showcase" style="display:inline-block;background:#030000;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:6px;">Review in the CRM</a></div>
<div style="font-size:12.5px;color:#8a8a86;margin-top:14px;line-height:1.6;">Nothing has been added to your contacts. Accepting the application in the CRM is what creates the record and puts them on a night.</div>
</td></tr></table></td></tr></table></body></html>`;

  return sendEmail({
    to: BOOKING_NOTIFY_TO,
    subject: `Showcase application: ${d.name || "someone"}${d.role ? ` (${d.role})` : ""}`,
    html,
    replyTo: d.email,
  });
}

/**
 * Someone in the lineup sent their program info at /program/<token>. Max builds the
 * night's program from these, so he needs to know they arrived rather than
 * discovering them when he opens the event under time pressure. `updated` marks a
 * participant fixing what they already sent.
 */
export async function notifyProgramSubmission({ data, event, origin, updated = false }) {
  const d = data || {};
  const ev = event || {};
  const links = programLinks(d);
  const when = fmtDate(ev.event_date);

  const rows = [
    ["Name", d.name],
    ["Role", d.role],
    ["Bio", d.bio],
  ].filter(([, v]) => String(v ?? "").trim() !== "");

  const chip = (href, label) =>
    `<a href="${esc(href)}" style="display:inline-block;border:1px solid #d8d8d2;color:#2a8ca0;font-weight:700;font-size:13px;text-decoration:none;padding:7px 14px;border-radius:999px;margin:0 6px 6px 0;">${esc(label)}</a>`;

  const photo = d.photo_url
    ? `<img src="${esc(d.photo_url)}" alt="${esc(d.name || "Photo")}" width="120" style="width:120px;height:120px;object-fit:cover;border-radius:8px;display:block;margin-bottom:14px;">`
    : "";

  const html = `<!doctype html><html><body style="margin:0;background:#F7F7F6;font-family:Lato,Helvetica,Arial,sans-serif;color:#030000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#030000;padding:18px 24px;color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Sprout Society · Program ${updated ? "update" : "info"}</td></tr>
<tr><td style="height:4px;background:#C6C902;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px;">
<div style="font-size:22px;font-weight:900;line-height:1.3;">${esc(d.name || "Someone")}</div>
<div style="font-size:15px;color:#5f5f5c;margin-top:6px;">${updated ? "changed what they sent" : "sent their program info"} for <b>${esc(ev.name || "your event")}</b>${when ? ` on ${esc(when)}` : ""}.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:1px solid #ececea;">
${rows.map(([k, v]) => `<tr><td style="padding:9px 12px 9px 0;border-bottom:1px solid #ececea;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8a8a86;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #ececea;font-size:15px;line-height:1.5;">${esc(v)}</td></tr>`).join("")}
</table>
${photo}
${links.length ? `<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8a8a86;margin-bottom:8px;">Their links</div>${links.map((l) => chip(l.url, l.label)).join("")}` : ""}
<div style="margin-top:18px;"><a href="${esc(origin)}/?event=${encodeURIComponent(ev.id || "")}" style="display:inline-block;background:#030000;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:6px;">Open the event</a></div>
<div style="font-size:12.5px;color:#8a8a86;margin-top:14px;line-height:1.6;">Everything they sent is on the event's Program tile, where you can download the photo or copy the whole lineup as text.</div>
</td></tr></table></td></tr></table></body></html>`;

  return sendEmail({
    to: BOOKING_NOTIFY_TO,
    subject: `Program ${updated ? "update" : "info"}: ${d.name || "someone"}${ev.name ? ` (${ev.name})` : ""}`,
    html,
  });
}

/**
 * Someone answered their impact survey at /survey/<token>. `updated` marks them
 * changing answers they already sent.
 */
export async function notifySurveyReply({ invite, survey, events = [], answers = {}, origin, updated = false }) {
  const name = invite?.name || "Someone";
  const show = (q) => {
    const v = answers[q.id];
    if (v == null) return "";
    if (q.type === "event_count") return events.filter((e) => v[e.id] != null).map((e) => `${e.name}: ${v[e.id]}`).join(" · ");
    if (q.type === "multi") return v.join(", ");
    if (q.type === "rating_rows") return q.rows.map((r, i) => (v[i] ? `${r}: ${v[i]}` : "")).filter(Boolean).join(" · ");
    if (q.type === "testimonial") {
      const share = v.share === "name" ? `OK to share with name${v.credit ? ` (${v.credit})` : ""}` : v.share === "anon" ? "OK to share anonymously" : "Not for sharing";
      return `“${v.text}” (${share})`;
    }
    return String(v);
  };
  const rows = (survey?.questions || []).map((q) => [q.label, show(q)]).filter(([, v]) => v);

  const html = `<!doctype html><html><body style="margin:0;background:#F7F7F6;font-family:Lato,Helvetica,Arial,sans-serif;color:#030000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#030000;padding:18px 24px;color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Sprout Society · Impact survey</td></tr>
<tr><td style="height:4px;background:#C6C902;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px;">
<div style="font-size:22px;font-weight:900;line-height:1.3;">${esc(name)}</div>
<div style="font-size:15px;color:#5f5f5c;margin-top:6px;">${updated ? "changed their answers" : "answered the survey"}${events.length ? ` for ${esc(events.map((e) => e.name).join(", "))}` : ""}.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:1px solid #ececea;">
${rows.map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #ececea;font-size:13px;line-height:1.5;"><div style="font-size:12px;font-weight:700;color:#8a8a86;margin-bottom:2px;">${esc(k)}</div>${esc(v)}</td></tr>`).join("")}
</table>
<div><a href="${esc(origin)}/?view=survey" style="display:inline-block;background:#030000;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:6px;">Open the survey replies</a></div>
</td></tr></table></td></tr></table></body></html>`;

  return sendEmail({ to: BOOKING_NOTIFY_TO, subject: `Survey ${updated ? "update" : "reply"}: ${name}`, html });
}

const GET_INVOLVED_URL = "https://sprout-crm-tool-next-js.vercel.app/get-involved";

/** The thank-you a person gets after sending their survey (first time only). Pure. */
export function surveyThanksEmail(name) {
  const first = String(name || "").trim().split(/\s+/)[0];
  const p = (t) => `<p style="margin:0 0 16px;">${t}</p>`;
  const link = (u) => `<a href="${u}" style="color:#1a73e8;">${u}</a>`;
  const html = `<!doctype html><html><body style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222;">
<div style="max-width:600px;padding:8px 4px;">
${p(`Hi ${esc(first || "there")},`)}
${p("Thank you for taking the time to fill out our survey. Your answers help us show funders what Sprout means to the people who use it, and that's what keeps the space open and low cost.")}
${p(`Want to get more involved? Whether you'd like to come by, showcase your work, host something, or just learn more, you can let us know here:<br>${link(GET_INVOLVED_URL)}`)}
${p(`Come join us on Discord! It's a way to connect more with our community, a place to keep showcasing yourself, and where you can stay up to date on our events and offerings:<br>${link(DISCORD_URL)}`)}
${p("If you have any questions, you can reply to this email.")}
<p style="margin:0;">Thank you,<br>Max<br>Community Manager</p>
</div></body></html>`;
  return { subject: "Thank you for filling out our survey", html };
}

/** Send the survey thank-you from Max's own Gmail (MAX_GMAIL_REFRESH_TOKEN). */
export async function sendSurveyThanks({ to, name }) {
  if (!isEmail(to)) return null;
  if (!process.env.MAX_GMAIL_REFRESH_TOKEN) throw new Error("MAX_GMAIL_REFRESH_TOKEN is not set.");
  const { subject, html } = surveyThanksEmail(name);
  return sendEmail({
    to: String(to).trim(), subject, html,
    from: process.env.MAX_GMAIL_SENDER || "maxperkins@sproutsociety.org",
    fromName: "Max Perkins",
    refreshToken: process.env.MAX_GMAIL_REFRESH_TOKEN,
  });
}

/**
 * A host touched their event portal. Two flavours share this email:
 *   submitted = true   they pressed "everything I have is in"
 *   submitted = false  they are filling it in (rate limited by the route, because
 *                      the portal autosaves and would otherwise mail on every save)
 */
export async function notifyPortalActivity({ portal, event, progress, origin, submitted = false }) {
  const d = portal?.data || {};
  const ev = event || {};
  const p = progress || {};
  const who = d.contact_name || d.org_name || "The host";
  const when = fmtDate(ev.event_date);
  const missing = Array.isArray(p.missingRequired) ? p.missingRequired : [];

  const bar = (() => {
    const pct = Math.max(0, Math.min(100, Number(p.pct) || 0));
    return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;"><tr>
<td style="background:#ececea;border-radius:999px;height:10px;font-size:0;line-height:0;">
<table width="${pct}%" cellpadding="0" cellspacing="0"><tr><td style="background:#C6C902;border-radius:999px;height:10px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr></table>`;
  })();

  const rows = [
    ["Host", d.contact_name],
    ["Email", d.contact_email],
    ["Phone", d.contact_phone],
    ["Organization", d.org_name],
    ["Event", d.event_name || ev.name],
    ["Date", when],
  ].filter(([, v]) => String(v ?? "").trim() !== "");

  const html = `<!doctype html><html><body style="margin:0;background:#F7F7F6;font-family:Lato,Helvetica,Arial,sans-serif;color:#030000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#030000;padding:18px 24px;color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Sprout Society · Portal ${submitted ? "submitted" : "activity"}</td></tr>
<tr><td style="height:4px;background:#C6C902;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px;">
<div style="font-size:22px;font-weight:900;line-height:1.3;">${esc(who)} ${submitted ? "finished their portal" : "is filling in their portal"}</div>
<div style="font-size:15px;color:#5f5f5c;margin-top:6px;">${esc(String(p.answered ?? 0))} of ${esc(String(p.total ?? 0))} answers in, ${esc(String(p.requiredDone ?? 0))} of ${esc(String(p.requiredTotal ?? 0))} required.</div>
${bar}
${p.readyToSchedule
  ? `<div style="background:#E4F3EA;color:#15804A;font-weight:700;font-size:14px;border-radius:7px;padding:11px 14px;margin-bottom:16px;">Every required answer is in. This one is ready to schedule.</div>`
  : missing.length
    ? `<div style="background:#FAF0D6;color:#8A6100;font-size:14px;line-height:1.6;border-radius:7px;padding:11px 14px;margin-bottom:16px;"><b>Still missing:</b> ${esc(missing.join(", "))}</div>`
    : ""}
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-top:1px solid #ececea;">
${rows.map(([k, v]) => `<tr><td style="padding:9px 12px 9px 0;border-bottom:1px solid #ececea;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8a8a86;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #ececea;font-size:15px;line-height:1.5;">${esc(v)}</td></tr>`).join("")}
</table>
<a href="${esc(origin)}/?event=${encodeURIComponent(ev.id || portal?.event_id || "")}" style="display:inline-block;background:#030000;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:6px;">Open the event</a>
<div style="font-size:12.5px;color:#8a8a86;margin-top:14px;line-height:1.6;">${submitted
  ? "They are done adding things, so anything still missing needs a conversation."
  : "You get at most one of these per portal every 12 hours, however much they edit. A submit always emails you."}</div>
</td></tr></table></td></tr></table></body></html>`;

  return sendEmail({
    to: BOOKING_NOTIFY_TO,
    subject: `Portal ${submitted ? "submitted" : "activity"}: ${d.event_name || ev.name || "event"}${when ? ` (${when})` : ""}`,
    html,
    replyTo: d.contact_email,
  });
}

/** One launch-list sign-up from the public coming-soon page. */
export async function notifySiteSignup({ name, email, total }) {
  const html = `<!doctype html><html><body style="margin:0;background:#F7F7F6;font-family:Lato,Helvetica,Arial,sans-serif;color:#030000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#030000;padding:18px 24px;color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Sprout Society · Launch list</td></tr>
<tr><td style="height:4px;background:#C6C902;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px;">
<div style="font-size:22px;font-weight:900;line-height:1.3;">${esc(name || "Someone")}</div>
<div style="font-size:15px;color:#5f5f5c;margin-top:6px;">${esc(email)} signed up on the coming-soon page.</div>
${total ? `<div style="font-size:13px;color:#8a8a86;margin-top:14px;">${esc(String(total))} people are on the launch list so far.</div>` : ""}
</td></tr></table></td></tr></table></body></html>`;
  return sendEmail({
    to: BOOKING_NOTIFY_TO,
    subject: `Launch list sign-up: ${name || email}`,
    html,
    replyTo: email,
  });
}

// Call-for-submissions sign-up (/submit). Reply-To is the person, so Max can
// answer with the form link straight from the alert.
export async function notifySubmissionSignup({ name, email, role, instagram, total, formSent = false }) {
  const roleLabel = { music: "Music", art: "Art", other: "Something else" }[role] || role;
  const html = `<!doctype html><html><body style="margin:0;background:#F7F7F6;font-family:Lato,Helvetica,Arial,sans-serif;color:#030000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#030000;padding:18px 24px;color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Sprout Society · Call for submissions</td></tr>
<tr><td style="height:4px;background:#FAD100;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px;">
<div style="font-size:22px;font-weight:900;line-height:1.3;">${esc(name || "Someone")}</div>
<div style="font-size:15px;color:#5f5f5c;margin-top:6px;">${esc(email)} · ${esc(roleLabel)}${instagram ? ` · ${esc(instagram)}` : ""}</div>
<div style="font-size:15px;margin-top:14px;">${formSent ? "The gallery submission form was emailed to them automatically." : "<b>The gallery form could not be sent automatically.</b> Reply to send it."}</div>
${total ? `<div style="font-size:13px;color:#8a8a86;margin-top:14px;">${esc(String(total))} people are on the submissions list so far.</div>` : ""}
</td></tr></table></td></tr></table></body></html>`;
  return sendEmail({
    to: BOOKING_NOTIFY_TO,
    subject: `Submission list: ${name || email} (${roleLabel})`,
    html,
    replyTo: email,
  });
}

/** Email staff that someone filled out the /get-involved form. */
export async function notifyInterest({ name, email, interests = [], message, instagram, how_heard, origin }) {
  const chips = interests.map((i) =>
    `<span style="display:inline-block;background:#F1F1EC;border-radius:999px;padding:3px 10px;margin:0 6px 6px 0;font-size:13px;">${esc(interestLabel(i))}</span>`
  ).join("");
  const review = origin ? `${origin}/?view=interest` : "";
  const html = `<!doctype html><html><body style="margin:0;background:#F7F7F6;font-family:Lato,Helvetica,Arial,sans-serif;color:#030000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#030000;padding:18px 24px;color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Sprout Society · Get involved</td></tr>
<tr><td style="height:4px;background:#73C4D6;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px;">
<div style="font-size:22px;font-weight:900;line-height:1.3;">${esc(name || "Someone")}</div>
<div style="font-size:15px;color:#5f5f5c;margin-top:6px;">${esc(email)}${instagram ? ` · ${esc(instagram)}` : ""}${how_heard ? ` · heard via ${esc(how_heard)}` : ""}</div>
<div style="margin-top:14px;">${chips}</div>
${message ? `<div style="font-size:15px;line-height:1.6;margin-top:10px;white-space:pre-wrap;background:#F7F7F6;border-radius:6px;padding:12px 14px;">${esc(message)}</div>` : ""}
${review ? `<p style="margin:20px 0 0;"><a href="${esc(review)}" style="display:inline-block;background:#030000;color:#fff;font-weight:900;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:6px;">Open in the CRM</a></p>` : ""}
<div style="font-size:13px;color:#8a8a86;margin-top:14px;">Reply to this email to answer them directly.</div>
</td></tr></table></td></tr></table></body></html>`;
  return sendEmail({
    to: BOOKING_NOTIFY_TO,
    subject: `Get involved: ${name || email} (${interests.map(interestLabel).join(", ")})`,
    html,
    replyTo: email,
  });
}

// The automatic reply to a /submit sign-up: the gallery submission form link.
// Replies go to Max, not the hello@ inbox.
export async function sendGalleryFormLink({ name, email, url }) {
  const first = String(name || "").trim().split(/\s+/)[0] || "there";
  const html = `<!doctype html><html><body style="margin:0;background:#F7F7F6;font-family:Lato,Helvetica,Arial,sans-serif;color:#030000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#030000;padding:18px 24px;color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Sprout Society · Sprout N Tell</td></tr>
<tr><td style="height:4px;background:#FAD100;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:26px 24px;font-size:16px;line-height:1.6;">
<p style="margin:0 0 14px;">Hi ${esc(first)},</p>
<p style="margin:0 0 14px;">Thanks for wanting to show your work at Sprout N Tell! Here is the submission form. Tell us about 2 to 4 pieces (size, medium, and a photo if you have one) and a short bio.</p>
<p style="margin:22px 0;"><a href="${esc(url)}" style="display:inline-block;background:#E10098;color:#fff;font-weight:900;font-size:15px;text-decoration:none;padding:13px 24px;border-radius:6px;">Open the submission form</a></p>
<p style="margin:0 0 14px;color:#5f5f5c;font-size:14px;">Or paste this link: ${esc(url)}</p>
<p style="margin:0;">Questions? Just reply to this email.</p>
<p style="margin:14px 0 0;">Sprout Society</p>
</td></tr></table></td></tr></table></body></html>`;
  return sendEmail({ to: email, subject: "Your Sprout N Tell submission form", html, replyTo: BOOKING_NOTIFY_TO });
}

/** Email staff that someone sent (or changed) a gallery submission. */
export async function notifyGallerySubmission({ data, event, origin, updated = false }) {
  const d = data || {};
  const ev = event || null;
  const pieces = (d.pieces || []).map((p, i) =>
    `<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #ececea;vertical-align:top;width:72px;">${p.photo_url ? `<img src="${esc(p.photo_url)}" width="64" style="width:64px;height:64px;object-fit:cover;border-radius:6px;display:block;">` : ""}</td><td style="padding:8px 0;border-bottom:1px solid #ececea;font-size:15px;line-height:1.5;">${esc(pieceLine(p, i))}</td></tr>`).join("");
  const rows = [
    ["Email", d.email], ["Instagram", d.instagram], ["Website", d.website],
    ["Gallery-ready", readyLabel(d.ready)], ["Would share more", moreLabel(d.more_work)],
    ["Statement / bio", d.statement], ["Notes", d.notes],
  ].filter(([, v]) => String(v ?? "").trim() !== "");
  const where = ev ? `for <b>${esc(ev.name)}</b>${ev.event_date ? ` on ${esc(fmtDate(ev.event_date))}` : ""}` : "through the open call (no show yet)";
  const link = ev ? `${origin}/?event=${encodeURIComponent(ev.id)}` : `${origin}/?view=showcase`;
  const html = `<!doctype html><html><body style="margin:0;background:#F7F7F6;font-family:Lato,Helvetica,Arial,sans-serif;color:#030000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#030000;padding:18px 24px;color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Sprout Society · Gallery ${updated ? "update" : "submission"}</td></tr>
<tr><td style="height:4px;background:#E10098;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px;">
<div style="font-size:22px;font-weight:900;line-height:1.3;">${esc(d.name || "Someone")}</div>
<div style="font-size:15px;color:#5f5f5c;margin-top:6px;">${updated ? "changed their gallery submission" : "sent a gallery submission"} ${where}.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px;border-top:1px solid #ececea;">${pieces}</table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 18px;border-top:1px solid #ececea;">
${rows.map(([k, v]) => `<tr><td style="padding:9px 12px 9px 0;border-bottom:1px solid #ececea;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8a8a86;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #ececea;font-size:15px;line-height:1.5;">${esc(v)}</td></tr>`).join("")}
</table>
<a href="${esc(link)}" style="display:inline-block;background:#030000;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:6px;">Review in the CRM</a>
</td></tr></table></td></tr></table></body></html>`;
  return sendEmail({
    to: BOOKING_NOTIFY_TO,
    subject: `Gallery ${updated ? "update" : "submission"}: ${d.name || d.email || "someone"}${ev ? ` (${ev.name})` : " (open call)"}`,
    html,
    replyTo: d.email,
  });
}


/**
 * A guest sent photos, video or links through an event's /media/<token> link. One
 * email per send, listing the files and the sender's consent to post.
 */
export async function notifyGuestMedia({ sender, rows = [], event, folderId, origin }) {
  const s = sender || {};
  const ev = event || {};
  const when = fmtDate(ev.event_date);
  const files = rows.filter((r) => r.kind === "file");
  const links = rows.filter((r) => r.kind === "link");
  const mb = (n) => (Number(n) >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} GB` : `${Math.max(0.1, (Number(n) || 0) / 1024 ** 2).toFixed(1)} MB`);
  const who = s.name || (s.instagram ? `@${s.instagram}` : "Someone");
  const count = [files.length && `${files.length} file${files.length === 1 ? "" : "s"}`, links.length && `${links.length} link${links.length === 1 ? "" : "s"}`].filter(Boolean).join(" and ");

  const rowsHtml = [
    ["Name", s.name],
    ["Instagram", s.instagram ? `@${s.instagram}` : ""],
    ["Email", s.email],
    ["OK to post", s.ok_to_post ? "Yes" : "Not given"],
    ["Note", s.note],
  ].filter(([, v]) => String(v ?? "").trim() !== "");

  const line = (href, label) =>
    `<div style="padding:7px 0;border-bottom:1px solid #ececea;font-size:14px;"><a href="${esc(href)}" style="color:#2a8ca0;font-weight:700;text-decoration:none;">${esc(label)}</a></div>`;

  const html = `<!doctype html><html><body style="margin:0;background:#F7F7F6;font-family:Lato,Helvetica,Arial,sans-serif;color:#030000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#030000;padding:18px 24px;color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Sprout Society · Guest media</td></tr>
<tr><td style="height:4px;background:#C6C902;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px;">
<div style="font-size:22px;font-weight:900;line-height:1.3;">${esc(who)}</div>
<div style="font-size:15px;color:#5f5f5c;margin-top:6px;">sent ${esc(count || "media")} from <b>${esc(ev.name || "your event")}</b>${when ? ` on ${esc(when)}` : ""}.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:1px solid #ececea;">
${rowsHtml.map(([k, v]) => `<tr><td style="padding:9px 12px 9px 0;border-bottom:1px solid #ececea;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8a8a86;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #ececea;font-size:15px;line-height:1.5;">${esc(v)}</td></tr>`).join("")}
</table>
${files.length ? `<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8a8a86;margin-bottom:4px;">Files</div>${files.map((f) => line(`https://drive.google.com/file/d/${encodeURIComponent(f.drive_file_id || "")}/view`, `${f.name} · ${mb(f.size)}`)).join("")}` : ""}
${links.length ? `<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8a8a86;margin:16px 0 4px;">Links</div>${links.map((l) => line(l.url, l.url)).join("")}` : ""}
<div style="margin-top:18px;">
${folderId ? `<a href="https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}" style="display:inline-block;background:#030000;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:6px;margin:0 8px 8px 0;">Open the Drive folder</a>` : ""}
<a href="${esc(origin)}/?event=${encodeURIComponent(ev.id || "")}" style="display:inline-block;border:1px solid #d8d8d2;color:#030000;font-weight:700;font-size:14px;text-decoration:none;padding:10px 18px;border-radius:6px;">Open the event</a>
</div>
</td></tr></table></td></tr></table></body></html>`;

  return sendEmail({
    to: BOOKING_NOTIFY_TO,
    subject: `Guest media: ${who}${ev.name ? ` (${ev.name})` : ""}`,
    html,
    replyTo: s.email || undefined,
  });
}
