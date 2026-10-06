// lib/kioskSignins.js — SERVER ONLY. Counts event-night sign-ins from every sign-in
// sheet in the SPROUT N TELL Drive folder (and its subfolders, e.g. Archive).
//
// Today that is the front-door kiosk sheet ("Sprout Society — Sign-Ins") and the older
// Google Form check-in ("Sprout Society - Check-In (Responses)"). A new sign-in sheet
// dropped into the folder is picked up on its own.
//
// What counts as a sign-in sheet: a spreadsheet whose tab starts with a "Timestamp"
// column. RSVP / interest forms and the hand-built MASTER list are skipped by name:
// RSVPs are not people who came, and the master copies the other sheets.
//
// Read as hello@ with the same credentials lib/notify.js sends mail with (they carry
// drive.readonly + spreadsheets.readonly). Each sheet's clock is its own time zone, so
// every row is converted to New York time; anything before 6am counts toward the
// night before. One person signing in twice on a night (even on two sheets) counts once.

import { accessToken } from "./notify";

export const SIGNIN_FOLDER_ID = process.env.SIGNIN_FOLDER_ID || "1Ho-ay2xrT2I1Q5IAJjA54JntVU_1pyJr";
export const SIGNIN_FOLDER_URL = `https://drive.google.com/drive/folders/${SIGNIN_FOLDER_ID}`;
const SKIP_NAME = /rsvp|interest|master/i;
const NIGHT_ENDS_HOUR = 6;
const SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const FOLDER_MIME = "application/vnd.google-apps.folder";

const fmtCache = {};
const partsIn = (ms, tz) => {
  fmtCache[tz] ||= new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  return Object.fromEntries(fmtCache[tz].formatToParts(new Date(ms)).map((x) => [x.type, Number(x.value)]));
};

/** A Sheets serial number is wall-clock time in the sheet's zone; return the real instant. */
export function serialToMs(serial, tz = "Etc/GMT") {
  const wall = Math.round((serial - 25569) * 86400000);
  const p = partsIn(wall, tz);
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(wall / 1000) * 1000;
  return wall - offset;
}

/** Sheets serial number (in zone tz) → the New York "night" it belongs to, YYYY-MM-DD. */
export function nightOf(serial, tz = "Etc/GMT") {
  const p = partsIn(serialToMs(serial, tz), "America/New_York");
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day, 12));
  if (p.hour < NIGHT_ENDS_HOUR) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Pick the name + email columns from a header row. */
export function columnsOf(header = []) {
  const h = header.map((x) => String(x || "").trim().toLowerCase());
  const email = h.findIndex((x) => x === "email") >= 0 ? h.findIndex((x) => x === "email") : h.findIndex((x) => /e-?mail/.test(x));
  const name = h.findIndex((x) => x === "name" || /^(full )?name$/.test(x));
  return { name, email };
}

/** Sheets of rows → { "YYYY-MM-DD": unique sign-ins }. Pure, for tests.
 *  sheets: [{ tz, header, rows }] where rows[i][0] is a serial timestamp. */
export function countNights(sheets) {
  const seen = {};
  for (const { tz, header, rows } of sheets) {
    const { name, email } = columnsOf(header);
    for (const r of rows) {
      const ts = r[0];
      if (typeof ts !== "number") continue;
      const who = String((email >= 0 && r[email]) || (name >= 0 && r[name]) || "").trim().toLowerCase();
      const night = nightOf(ts, tz);
      (seen[night] ||= new Set()).add(who || `row-${ts}`);
    }
  }
  return Object.fromEntries(Object.entries(seen).map(([d, s]) => [d, s.size]));
}

async function gget(token, url) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || String(r.status));
  return j;
}

/** Every spreadsheet under the folder, walking subfolders. */
async function listSheets(token, folderId, depth = 0) {
  const q = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false and (mimeType='${SHEET_MIME}' or mimeType='${FOLDER_MIME}')`,
    fields: "files(id,name,mimeType)", pageSize: "200",
    supportsAllDrives: "true", includeItemsFromAllDrives: "true",
  });
  const { files = [] } = await gget(token, `https://www.googleapis.com/drive/v3/files?${q}`);
  const out = [];
  for (const f of files) {
    if (f.mimeType === SHEET_MIME) out.push(f);
    else if (depth < 3) out.push(...(await listSheets(token, f.id, depth + 1)));
  }
  return out;
}

/** Read one spreadsheet: every tab whose header starts with "Timestamp". */
async function readSheet(token, file) {
  const meta = await gget(token, `https://sheets.googleapis.com/v4/spreadsheets/${file.id}?fields=properties.timeZone,sheets.properties.title`);
  const tz = meta.properties?.timeZone || "Etc/GMT";
  const tabs = [];
  for (const s of meta.sheets || []) {
    const title = s.properties.title;
    const q = new URLSearchParams({ valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "SERIAL_NUMBER" });
    const { values = [] } = await gget(token, `https://sheets.googleapis.com/v4/spreadsheets/${file.id}/values/${encodeURIComponent(`'${title.replace(/'/g, "''")}'`)}?${q}`);
    if (!/^timestamp$/i.test(String(values[0]?.[0] || "").trim())) continue;
    tabs.push({ tz, header: values[0], rows: values.slice(1) });
  }
  return tabs;
}

/** { nights, sheets: [{ name, url, rows }] } across the whole sign-in folder. */
export async function fetchSigninNights() {
  const token = await accessToken();
  const files = (await listSheets(token, SIGNIN_FOLDER_ID)).filter((f) => !SKIP_NAME.test(f.name));
  const all = [];
  const sheets = [];
  for (const f of files) {
    const tabs = await readSheet(token, f);
    if (!tabs.length) continue;
    all.push(...tabs);
    sheets.push({ name: f.name, url: `https://docs.google.com/spreadsheets/d/${f.id}/edit`, rows: tabs.reduce((s, t) => s + t.rows.length, 0) });
  }
  return { nights: countNights(all), sheets };
}
