// lib/googleCalendar.js — SERVER ONLY. Reads Max's calendar and the Sprout HQ Program
// Calendar through the Google Calendar API as hello@sproutsociety.org (the same
// credentials lib/notify.js sends mail with). hello@ can read Max's calendar through
// Workspace sharing, so no second sign-in is needed.

import { accessToken } from "./notify";
import { addDays, etParts, categoryForColorId } from "./dayBoard";

export const MY_CALENDAR_ID = process.env.DAY_BOARD_CALENDAR_ID || "maxperkins@sproutsociety.org";
export const PROGRAM_CALENDAR_ID =
  process.env.PROGRAM_CALENDAR_ID ||
  "c_ddc75ed1b88e4b983ab9abe8e8ffd8f17c558e1f9a5bf4a51c1ecd43cba270c9@group.calendar.google.com";

async function listEvents(token, calendarId, fromISO, toISO) {
  const items = [];
  let pageToken = "";
  do {
    const q = new URLSearchParams({
      // A day of slack either side; events are filtered to New York dates below.
      timeMin: `${addDays(fromISO, -1)}T00:00:00Z`,
      timeMax: `${addDays(toISO, 2)}T00:00:00Z`,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    if (pageToken) q.set("pageToken", pageToken);
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`Google Calendar (${calendarId === MY_CALENDAR_ID ? "your calendar" : "Sprout calendar"}): ${j.error?.message || r.status}`);
    items.push(...(j.items || []));
    pageToken = j.nextPageToken || "";
  } while (pageToken);
  return items;
}

function shape(item, cal) {
  if (item.status === "cancelled") return null;
  if (item.eventType === "workingLocation" || item.eventType === "outOfOffice") return null;
  // An invite Max declined is not his time.
  if ((item.attendees || []).some((a) => a.self && a.responseStatus === "declined")) return null;
  const base = { id: `${cal}:${item.id}`, cal, title: item.summary || "(No title)", category: cal === "mine" ? categoryForColorId(item.colorId) : null };
  if (item.start?.date) return { ...base, date: item.start.date, start: null, end: null, allDay: true };
  if (!item.start?.dateTime) return null;
  const s = etParts(item.start.dateTime);
  const e = etParts(item.end?.dateTime || item.start.dateTime);
  return { ...base, date: s.date, start: s.minutes, end: e.date === s.date ? e.minutes : 24 * 60, allDay: false };
}

/** Both calendars' events between two New York dates, inclusive. */
export async function fetchCalendarEvents(fromISO, toISO) {
  const token = await accessToken();
  const [mine, sprout] = await Promise.all([
    listEvents(token, MY_CALENDAR_ID, fromISO, toISO),
    listEvents(token, PROGRAM_CALENDAR_ID, fromISO, toISO),
  ]);
  return [...mine.map((i) => shape(i, "mine")), ...sprout.map((i) => shape(i, "sprout"))]
    .filter((e) => e && e.date >= fromISO && e.date <= toISO)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? -1) - (b.start ?? -1));
}
