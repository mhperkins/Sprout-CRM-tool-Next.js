// lib/notify.js — SERVER ONLY. Staff email alerts, sent through the Gmail API as
// hello@sproutsociety.org using the same env credentials as app/api/send.
//
// Env: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER,
//      BOOKING_NOTIFY_TO (optional; defaults to Max).

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export const BOOKING_NOTIFY_TO = process.env.BOOKING_NOTIFY_TO || "maxperkins@sproutsociety.org";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const b64url = (s) => Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const encSubject = (s) => `=?UTF-8?B?${Buffer.from(s || "", "utf8").toString("base64")}?=`;
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

async function accessToken() {
  const body = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID,
    client_secret: process.env.GMAIL_CLIENT_SECRET,
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });
  const r = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const j = await r.json();
  if (!j.access_token) throw new Error("Gmail token refresh failed: " + (j.error_description || j.error || "unknown"));
  return j.access_token;
}

/** Send one HTML email. Throws on failure — callers decide whether that matters. */
export async function sendEmail({ to, subject, html, replyTo }) {
  if (!process.env.GMAIL_REFRESH_TOKEN) throw new Error("Gmail is not connected on the server.");
  const from = process.env.GMAIL_SENDER || "hello@sproutsociety.org";
  const lines = [
    `From: Sprout Society <${from}>`,
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
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!r.ok) throw new Error("Gmail send failed: " + (await r.text()).slice(0, 300));
  return r.json();
}

const fmtDate = (d) => {
  if (!d) return "";
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
export async function notifyBookingRequest({ answers, eventId, token, origin }) {
  const a = answers || {};
  const when = [fmtDate(a.event_date), [fmtTime(a.start_time), fmtTime(a.end_time)].filter(Boolean).join("–")]
    .filter(Boolean).join(" · ");

  const rows = [
    ["Name", a.contact_name],
    ["Email", a.contact_email],
    ["Phone", a.contact_phone],
    ["Organization", a.org_name],
    ["Event", a.event_name],
    ["Type", a.event_type],
    ["When", when],
    ["Backup date", fmtDate(a.alt_date)],
    ["Expected attendance", a.attendance],
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

  const subject = `New hosting request: ${a.event_name || "event"}${a.event_date ? ` (${fmtDate(a.event_date)})` : ""}`;
  return sendEmail({ to: BOOKING_NOTIFY_TO, subject, html, replyTo: a.contact_email });
}
