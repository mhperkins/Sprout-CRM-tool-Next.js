// app/api/send/route.js — newsletter TEST send endpoint (Gmail API, hello@sproutsociety.org).
//
// Test mode only: sends to manually-typed addresses (To:, max 25), subject prefixed [TEST].
// List sends were removed 2026-11-19: Campaign Monitor is the send channel (Copy HTML in the editor).
//
// Gated by NEWSLETTER_SEND_SECRET. All Gmail creds live in env and never reach the browser.
//
// Env: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER, NEWSLETTER_SEND_SECRET.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

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

export async function POST(req) {
  try {
    const { mode = "test", to = [], subject = "", html = "", secret = "" } = await req.json();

    if (!process.env.NEWSLETTER_SEND_SECRET) return NextResponse.json({ error: "Send is not configured (no passphrase set on the server)." }, { status: 503 });
    if (secret !== process.env.NEWSLETTER_SEND_SECRET) return NextResponse.json({ error: "Wrong passphrase." }, { status: 401 });
    if (!subject.trim() || !html.trim()) return NextResponse.json({ error: "Missing subject or content." }, { status: 400 });
    if (!process.env.GMAIL_REFRESH_TOKEN) return NextResponse.json({ error: "Gmail is not connected on the server." }, { status: 503 });

    const from = process.env.GMAIL_SENDER || "hello@sproutsociety.org";
    const token = await getAccessToken();

    if (mode !== "test") return NextResponse.json({ error: "List sends go through Campaign Monitor now." }, { status: 400 });

    const recips = [...new Set((to || []).map((s) => (s || "").trim().toLowerCase()).filter(isEmail))].slice(0, 25);
    if (!recips.length) return NextResponse.json({ error: "Enter at least one valid email address." }, { status: 400 });
    await sendMessage(token, { from, to: recips, subject: `[TEST] ${subject}`, html });
    return NextResponse.json({ ok: true, mode: "test", sent: recips.length, recipients: recips });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
