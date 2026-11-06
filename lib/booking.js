// lib/booking.js — shared rules for booking dates (client + server, no imports).
//
// A slot is one date with a start and end time in New York time:
//   { date:"YYYY-MM-DD", start:"HH:MM", end:"HH:MM" }
// Busy blocks from the calendar use minutes after midnight:
//   { date, start:Number, end:Number }

export const NOTICE_DAYS = 3;      // earliest a client can ask for: today + 3
export const AHEAD_DAYS = 92;      // latest: about three months out
export const MAX_SLOTS = 60;       // per request
export const LATEST_END = 22 * 60; // nothing can be booked past 10pm
export const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WD_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const noon = (iso) => new Date(`${iso}T12:00:00Z`);
export const addDays = (iso, n) => { const d = noon(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const weekday = (iso) => noon(iso).getUTCDay();          // 0 = Sunday
export const daysBetween = (a, b) => Math.round((noon(b) - noon(a)) / 864e5);

/** Today's date in New York. */
export function todayNY(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const g = (t) => p.find((x) => x.type === t)?.value;
  return `${g("year")}-${g("month")}-${g("day")}`;
}

export const earliestDate = (today = todayNY()) => addDays(today, NOTICE_DAYS);
export const latestDate = (today = todayNY()) => addDays(today, AHEAD_DAYS);

export const toMin = (hhmm) => { const m = HHMM.exec(hhmm || ""); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
/** End times: "00:00" means midnight at the end of the day. */
export const endMin = (hhmm) => { const m = toMin(hhmm); return m === 0 ? 24 * 60 : m; };
export const fromMin = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** 18:30 -> "6:30pm", 18:00 -> "6pm". Accepts "HH:MM" or minutes. */
export function clock(v) {
  const min = typeof v === "number" ? v : toMin(v);
  if (min === 0 && typeof v !== "number") return "midnight";
  if (min == null) return "";
  if (min >= 24 * 60) return "midnight";
  const h = Math.floor(min / 60), m = min % 60;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}
export const timeRange = (s, e) => `${clock(s)} to ${clock(e)}`;
export const shortDate = (iso) => `${WD[weekday(iso)]}, ${MON[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
export const longDate = (iso) => `${WD_LONG[weekday(iso)]}, ${MON[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
export const monthTitle = (ym) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
export const WEEKDAYS = WD;

/** Do two minute ranges overlap? Touching ends (6pm end, 6pm start) do not. */
export const overlaps = (aS, aE, bS, bE) => aS < bE && bS < aE;

/** Check one slot's shape. Returns an error string or "". */
export function slotProblem(slot, today = todayNY()) {
  if (!slot || !ISO.test(slot.date || "")) return "Pick a date.";
  const s = toMin(slot.start), e = endMin(slot.end);
  if (s == null || e == null) return "Pick a start and end time.";
  if (e <= s) return "The end time has to be after the start time.";
  if (e > LATEST_END) return "Bookings have to end by 10pm.";
  if (slot.date < earliestDate(today)) return `Dates need at least ${NOTICE_DAYS} days' notice.`;
  if (slot.date > latestDate(today)) return "We book up to about three months ahead.";
  return "";
}

/** Busy blocks that clash with a slot. */
export function clashesFor(slot, busy) {
  const s = toMin(slot.start), e = endMin(slot.end);
  return (busy || []).filter((b) => b.date === slot.date && overlaps(s, e, b.start, b.end));
}

/**
 * Turn a repeat rule into real dates.
 * { first, until, weekdays:[0..6] | null, start, end } -> [{date,start,end}]
 * weekdays null/empty = just the first date.
 */
export function expandRepeat({ first, until, weekdays, start, end }) {
  if (!ISO.test(first || "")) return [];
  if (!weekdays?.length || !ISO.test(until || "") || until < first) return [{ date: first, start, end }];
  const out = [];
  for (let d = first; d <= until && out.length < MAX_SLOTS; d = addDays(d, 1)) {
    if (weekdays.includes(weekday(d))) out.push({ date: d, start, end });
  }
  return out;
}

/** "6:30pm to 9:30pm" style label for a stored slot row. */
export const slotLabel = (s) => `${shortDate(s.date)} · ${timeRange(s.start_time || s.start, s.end_time || s.end)}`;

/**
 * What the CRM event should look like once these dates are confirmed. One date:
 * a one-time event on that date. Several: "On specific dates". Keeps dates already
 * listed under "On specific dates", but never treats a bare event_date as confirmed
 * (on a /book request that is just the first date asked for, which may be declined).
 */
export function eventPatchForConfirmed(event, confirmed) {
  const ev = event || {};
  const have = ev.recurrence?.frequency === "dates" ? ev.recurrence.dates || [] : [];
  const dates = [...new Set([...have, ...(confirmed || []).map((s) => s.date)])].filter((d) => ISO.test(d)).sort();
  if (!dates.length) return {};
  const first = (confirmed || []).slice().sort((a, b) => a.date.localeCompare(b.date))[0];
  const times = first ? { start_time: ev.start_time || first.start_time, end_time: ev.end_time || first.end_time } : {};
  if (dates.length === 1 && !ev.recurrence) return { event_date: dates[0], ...times };
  return { event_date: dates[0], recurrence: { frequency: "dates", dates, until: null }, ...times };
}
