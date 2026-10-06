// lib/kioskSignins.js — SERVER ONLY. Counts front-door kiosk sign-ins per event night.
//
// The door QR → sprout-sign-in.html → Apps Script appends a row to the "Sign-ins" tab
// of "Sprout Society — Sign-Ins". Read as hello@ with the same credentials
// lib/notify.js sends mail with (they carry spreadsheets.readonly).
//
// The sheet's clock is GMT, so a 9pm New York sign-in lands on the next day there.
// Each row is converted to New York time, and anything before 6am counts toward the
// night before. One person signing in twice on a night counts once.

import { accessToken } from "./notify";

export const KIOSK_SHEET_ID = process.env.KIOSK_SHEET_ID || "1VokUNOaYOiVzvbKAUoZldNI9pCssaD9F2AeRLd_R4ss";
export const KIOSK_SHEET_URL = `https://docs.google.com/spreadsheets/d/${KIOSK_SHEET_ID}/edit`;
const RANGE = "Sign-ins!A2:C";
const NIGHT_ENDS_HOUR = 6;

const nyParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
});

/** Sheets serial day number (GMT) → the New York "night" it belongs to, YYYY-MM-DD. */
export function nightOf(serial) {
  const ms = (serial - 25569) * 86400000;
  const p = Object.fromEntries(nyParts.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  let date = `${p.year}-${p.month}-${p.day}`;
  if (Number(p.hour) < NIGHT_ENDS_HOUR) {
    const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1);
    date = d.toISOString().slice(0, 10);
  }
  return date;
}

/** Rows of [serial, name, email] → { "YYYY-MM-DD": unique sign-ins }. Pure, for tests. */
export function countNights(rows) {
  const seen = {};
  for (const [ts, name, email] of rows) {
    if (typeof ts !== "number") continue;
    const who = String(email || name || "").trim().toLowerCase();
    const night = nightOf(ts);
    (seen[night] ||= new Set()).add(who || `row-${ts}`);
  }
  return Object.fromEntries(Object.entries(seen).map(([d, s]) => [d, s.size]));
}

export async function fetchKioskNights() {
  const token = await accessToken();
  const q = new URLSearchParams({ valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "SERIAL_NUMBER" });
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${KIOSK_SHEET_ID}/values/${encodeURIComponent(RANGE)}?${q}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  const j = await r.json();
  if (!r.ok) throw new Error(`Sign-in sheet: ${j.error?.message || r.status}`);
  return countNights(j.values || []);
}
