// lib/bookingDb.js — SERVER ONLY. Booking slots + the Program Calendar.
//
// Busy times come from the Sprout HQ Program Calendar (what is actually booked),
// plus other clients' requests that are waiting on staff. Clients only ever get
// { date, start, end } for those: never a title or who it is.
// Approving a slot writes it onto the Program Calendar as hello@.

import { randomBytes } from "crypto";
import { svc } from "./portalDb";
import { accessToken } from "./notify";
import { fetchSproutEvents, PROGRAM_CALENDAR_ID } from "./googleCalendar";
import { slotProblem, clashesFor, toMin, todayNY, MAX_SLOTS, ISO } from "./booking";

const TABLE = "sprout_booking_slots";
export const newSlotId = () => `bks_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;

export const publicSlot = (r) => ({
  id: r.id, date: r.date, start_time: r.start_time, end_time: r.end_time,
  status: r.status, note: r.note || "", decline_reason: r.decline_reason || "",
});

/* ─── calendar ────────────────────────────────────────────────────────────── */

// Short cache: a portal page asks for a month at a time and people click around.
const cache = new Map();
const TTL = 60_000;

// "sprout:<google id>" or "sprout:<google id>:<date>" (multi-day split) -> google id
const gid = (id) => String(id || "").replace(/^sprout:/, "").split(":")[0];

/** Program Calendar busy blocks in minutes: [{ date, start, end, gid }]. */
export async function calendarBusy(from, to) {
  const key = `${from}|${to}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.rows;
  const events = await fetchSproutEvents(from, to);
  const rows = events.map((e) => ({
    date: e.date,
    start: e.allDay ? 0 : e.start,
    end: e.allDay ? 24 * 60 : e.end,
    gid: gid(e.id),
  }));
  cache.set(key, { at: Date.now(), rows });
  return rows;
}
export const clearCalendarCache = () => cache.clear();

/** Slots for one event, oldest date first. */
export async function slotsForEvent(eventId) {
  const { data, error } = await svc().from(TABLE).select("*").eq("event_id", eventId).order("date").order("start_time");
  if (error) throw new Error(error.message);
  return data || [];
}

/** Other clients' requests waiting on staff, as busy blocks. */
async function othersRequested(from, to, eventId) {
  let q = svc().from(TABLE).select("event_id,date,start_time,end_time").eq("status", "requested").gte("date", from).lte("date", to);
  if (eventId) q = q.neq("event_id", eventId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map((r) => ({ date: r.date, start: toMin(r.start_time), end: toMin(r.end_time) }));
}

/**
 * Everything that is NOT this client's between two dates, as { date, start, end }.
 * eventId = the viewer's own booking (its confirmed dates are shown as theirs, not busy).
 */
export async function busyFor({ from, to, eventId = null }) {
  const own = eventId ? await slotsForEvent(eventId) : [];
  const ownGids = new Set(own.map((s) => s.gcal_event_id).filter(Boolean));
  const [cal, req] = await Promise.all([calendarBusy(from, to), othersRequested(from, to, eventId)]);
  return [
    ...cal.filter((b) => !ownGids.has(b.gid)).map(({ date, start, end }) => ({ date, start, end })),
    ...req,
  ].sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
}

/* ─── requests ────────────────────────────────────────────────────────────── */

/**
 * Check a list of wanted slots without saving. Returns { ok:[slot], rejected:[{date,reason}] }.
 * Every check the browser makes is repeated here, because the browser can lie.
 */
export async function checkSlots({ slots, eventId = null }) {
  const today = todayNY();
  const list = (Array.isArray(slots) ? slots : []).slice(0, MAX_SLOTS).map((s) => ({
    date: String(s?.date || ""), start: String(s?.start || ""), end: String(s?.end || ""),
  }));
  const ok = [], rejected = [];
  const shaped = list.filter((s) => {
    const p = slotProblem(s, today);
    if (p) rejected.push({ date: s.date, reason: p });
    return !p;
  });
  if (!shaped.length) return { ok, rejected };

  const dates = shaped.map((s) => s.date).sort();
  const busy = await busyFor({ from: dates[0], to: dates[dates.length - 1], eventId });
  const mine = eventId
    ? (await slotsForEvent(eventId)).filter((s) => s.status === "requested" || s.status === "confirmed")
        .map((s) => ({ date: s.date, start: toMin(s.start_time), end: toMin(s.end_time) }))
    : [];

  for (const s of shaped) {
    if (clashesFor(s, busy).length) { rejected.push({ date: s.date, reason: "That time is already taken." }); continue; }
    if (clashesFor(s, mine).length) { rejected.push({ date: s.date, reason: "You already have this time." }); continue; }
    if (clashesFor(s, ok).length) { rejected.push({ date: s.date, reason: "Listed twice." }); continue; }
    ok.push(s);
  }
  return { ok, rejected };
}

/** Save already-checked slots as requests. */
export async function insertRequested({ eventId, portalId, slots, note = "" }) {
  if (!slots.length) return [];
  const rows = slots.map((s) => ({
    id: newSlotId(), event_id: eventId, portal_id: portalId || null,
    date: s.date, start_time: s.start, end_time: s.end,
    status: "requested", note: String(note || "").slice(0, 1000),
  }));
  const { data, error } = await svc().from(TABLE).insert(rows).select("*");
  if (error) throw new Error(error.message);
  return data || [];
}

/** A client withdraws one of their own waiting requests. */
export async function cancelRequested(eventId, slotId) {
  const { data, error } = await svc().from(TABLE)
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", slotId).eq("event_id", eventId).eq("status", "requested")
    .select("*");
  if (error) throw new Error(error.message);
  return (data || [])[0] || null;
}

/* ─── staff ───────────────────────────────────────────────────────────────── */

/** Every waiting request, grouped by booking, each date checked against the calendar. */
export async function pendingRequests() {
  const sb = svc();
  const { data: rows, error } = await sb.from(TABLE).select("*").eq("status", "requested").order("date");
  if (error) throw new Error(error.message);
  if (!rows?.length) return [];

  const ids = [...new Set(rows.map((r) => r.event_id))];
  const [{ data: evs }, { data: portals }] = await Promise.all([
    sb.from("sprout_events").select("id,name,status").in("id", ids),
    sb.from("sprout_event_portals").select("id,event_id,token,data").in("event_id", ids),
  ]);
  const evById = new Map((evs || []).map((e) => [e.id, e]));
  const portalByEvent = new Map((portals || []).map((p) => [p.event_id, p]));

  const dates = rows.map((r) => r.date).sort();
  const cal = await calendarBusy(dates[0], dates[dates.length - 1]);

  const groups = new Map();
  for (const r of rows) {
    const s = toMin(r.start_time), e = toMin(r.end_time);
    const calClash = cal.filter((b) => b.date === r.date && b.start < e && s < b.end);
    const otherReq = rows.filter((o) => o.event_id !== r.event_id && o.date === r.date && toMin(o.start_time) < e && s < toMin(o.end_time));
    const g = groups.get(r.event_id) || {
      event_id: r.event_id,
      event_name: evById.get(r.event_id)?.name || "(event)",
      event_status: evById.get(r.event_id)?.status || "",
      contact_name: portalByEvent.get(r.event_id)?.data?.contact_name || "",
      contact_email: portalByEvent.get(r.event_id)?.data?.contact_email || "",
      org_name: portalByEvent.get(r.event_id)?.data?.org_name || "",
      token: portalByEvent.get(r.event_id)?.token || "",
      slots: [],
    };
    g.slots.push({
      ...publicSlot(r),
      requested_at: r.requested_at,
      clash: calClash.length ? `Calendar already has ${calClash.map((b) => `${fmtMin(b.start)} to ${fmtMin(b.end)}`).join(", ")}` : "",
      also_requested: otherReq.length ? "Another client asked for this time too." : "",
    });
    groups.set(r.event_id, g);
  }
  return [...groups.values()];
}

const fmtMin = (m) => { const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""}${h < 12 || h === 24 ? "am" : "pm"}`; };

async function insertCalendarEvent(token, { summary, description, date, start, end }) {
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(PROGRAM_CALENDAR_ID)}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary, description,
      start: { dateTime: `${date}T${start}:00`, timeZone: "America/New_York" },
      end: { dateTime: `${date}T${end}:00`, timeZone: "America/New_York" },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || `Google Calendar ${r.status}`);
  return j.id;
}

/**
 * Approve and/or decline waiting slots. Approving re-checks the calendar first and
 * writes the date onto the Program Calendar. Returns, per booking, what changed and
 * every date that booking now has confirmed (so the CRM can update the event).
 */
export async function decideSlots({ approve = [], decline = [], reason = "" }) {
  const sb = svc();
  const ids = [...new Set([...approve, ...decline])].filter((x) => typeof x === "string");
  if (!ids.length) return [];
  const { data: rows, error } = await sb.from(TABLE).select("*").in("id", ids).eq("status", "requested");
  if (error) throw new Error(error.message);

  const evIds = [...new Set((rows || []).map((r) => r.event_id))];
  const { data: evs } = await sb.from("sprout_events").select("id,name").in("id", evIds);
  const nameOf = new Map((evs || []).map((e) => [e.id, e.name]));

  const out = new Map();
  const bucket = (eid) => {
    if (!out.has(eid)) out.set(eid, { event_id: eid, event_name: nameOf.get(eid) || "", confirmed: [], declined: [], failed: [] });
    return out.get(eid);
  };

  const toApprove = (rows || []).filter((r) => approve.includes(r.id));
  const toDecline = (rows || []).filter((r) => decline.includes(r.id) && !approve.includes(r.id));
  const now = new Date().toISOString();

  if (toApprove.length) {
    clearCalendarCache();
    const dates = toApprove.map((r) => r.date).sort();
    const cal = await calendarBusy(dates[0], dates[dates.length - 1]);
    const token = await accessToken();
    for (const r of toApprove) {
      const b = bucket(r.event_id);
      const s = toMin(r.start_time), e = toMin(r.end_time);
      if (cal.some((c) => c.date === r.date && c.start < e && s < c.end)) {
        b.failed.push({ ...publicSlot(r), reason: "The calendar already has something at this time." });
        continue;
      }
      try {
        const gcal = await insertCalendarEvent(token, {
          summary: nameOf.get(r.event_id) || "Booking",
          description: `Booked through the Sprout portal. CRM event ${r.event_id}.${r.note ? `\n\nClient note: ${r.note}` : ""}`,
          date: r.date, start: r.start_time, end: r.end_time,
        });
        const { error: uErr } = await sb.from(TABLE)
          .update({ status: "confirmed", gcal_event_id: gcal, decided_at: now, updated_at: now })
          .eq("id", r.id);
        if (uErr) throw new Error(uErr.message);
        b.confirmed.push(publicSlot({ ...r, status: "confirmed" }));
        cal.push({ date: r.date, start: s, end: e, gid: gcal });
      } catch (err) {
        b.failed.push({ ...publicSlot(r), reason: `Could not add it to Google Calendar: ${err.message}` });
      }
    }
    clearCalendarCache();
  }

  if (toDecline.length) {
    const why = String(reason || "").slice(0, 1000);
    const { error: dErr } = await sb.from(TABLE)
      .update({ status: "declined", decline_reason: why, decided_at: now, updated_at: now })
      .in("id", toDecline.map((r) => r.id));
    if (dErr) throw new Error(dErr.message);
    for (const r of toDecline) bucket(r.event_id).declined.push(publicSlot({ ...r, status: "declined", decline_reason: why }));
  }

  for (const b of out.values()) {
    b.all_confirmed = (await slotsForEvent(b.event_id)).filter((s) => s.status === "confirmed").map(publicSlot);
  }
  return [...out.values()];
}

export { ISO };
