// app/api/send/route.js — newsletter send endpoint (Gmail API, hello@sproutsociety.org).
//
// Two modes:
//   mode:"test" — sends to manually-typed addresses (To:), subject prefixed [TEST]. For previewing.
//   mode:"list" — sends the real blast. Recipients are fetched SERVER-SIDE from the CRM by segment
//                 (so this route can never be aimed at arbitrary addresses) and BCC'd in batches.
//
// Gated by NEWSLETTER_SEND_SECRET (the app is public and unauthenticated — without this gate anyone
// who found the URL could blast the list). All Gmail creds live in env and never reach the browser.
//
// Env: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER, NEWSLETTER_SEND_SECRET,
//      NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (recipient read; falls back to anon key).

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const BATCH = 45; // BCC recipients per message

async function getAccessToken() {
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

const b64url = (s) => Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
// RFC 2047 encoded-word so emoji / non-ASCII subjects survive.
const encSubject = (s) => `=?UTF-8?B?${Buffer.from(s || "", "utf8").toString("base64")}?=`;

function buildMime({ from, to = [], bcc = [], subject, html }) {
  const lines = [
    `From: ${from}`,
    `To: ${to.length ? to.join(", ") : from}`,
    bcc.length ? `Bcc: ${bcc.join(", ")}` : null,
    `Subject: ${encSubject(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ].filter(Boolean);
  // Body base64 (CRLF-wrapped) to avoid any 998-char line limit issues with long HTML.
  const body = Buffer.from(html || "", "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
  return `${lines.join("\r\n")}\r\n\r\n${body}`;
}

async function sendMessage(token, msg) {
  const raw = b64url(buildMime(msg));
  const r = await fetch(SEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!r.ok) throw new Error("Gmail send failed: " + (await r.text()).slice(0, 300));
  return r.json();
}

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim());

async function fetchRecipients(segment) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use the service-role key server-side so this read works after RLS is locked to
  // authenticated-only (this route has no user session). The key never leaves the
  // server, and the route is already gated by NEWSLETTER_SEND_SECRET. Falls back to
  // the anon key if the service-role key isn't set (e.g. before env is configured).
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const r = await fetch(`${url}/rest/v1/sprout_contacts?select=email,data`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!r.ok) throw new Error("Could not load contacts: " + (await r.text()).slice(0, 200));
  const rows = await r.json();
  const out = new Set();
  for (const row of rows) {
    const seg = row?.data?.segment || "community";
    if (segment !== "all" && seg !== segment) continue;
    const em = (row.email || row?.data?.email || "").trim().toLowerCase();
    if (isEmail(em)) out.add(em);
  }
  return [...out];
}

export async function POST(req) {
  try {
    const { mode = "test", to = [], subject = "", html = "", secret = "", segment = "all" } = await req.json();

    if (!process.env.NEWSLETTER_SEND_SECRET) return NextResponse.json({ error: "Send is not configured (no passphrase set on the server)." }, { status: 503 });
    if (secret !== process.env.NEWSLETTER_SEND_SECRET) return NextResponse.json({ error: "Wrong passphrase." }, { status: 401 });
    if (!subject.trim() || !html.trim()) return NextResponse.json({ error: "Missing subject or content." }, { status: 400 });
    if (!process.env.GMAIL_REFRESH_TOKEN) return NextResponse.json({ error: "Gmail is not connected on the server." }, { status: 503 });

    const from = process.env.GMAIL_SENDER || "hello@sproutsociety.org";
    const token = await getAccessToken();

    if (mode === "test") {
      const recips = [...new Set((to || []).map((s) => (s || "").trim().toLowerCase()).filter(isEmail))].slice(0, 25);
      if (!recips.length) return NextResponse.json({ error: "Enter at least one valid email address." }, { status: 400 });
      await sendMessage(token, { from, to: recips, subject: `[TEST] ${subject}`, html });
      return NextResponse.json({ ok: true, mode: "test", sent: recips.length, recipients: recips });
    }

    // list mode — recipients resolved server-side from the CRM by segment.
    const emails = await fetchRecipients(segment);
    if (!emails.length) return NextResponse.json({ error: `No contacts with an email in "${segment}".` }, { status: 400 });
    const batches = [];
    for (let i = 0; i < emails.length; i += BATCH) batches.push(emails.slice(i, i + BATCH));
    for (const b of batches) await sendMessage(token, { from, to: [from], bcc: b, subject, html });
    return NextResponse.json({ ok: true, mode: "list", sent: emails.length, batches: batches.length, segment });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
