// POST /api/portal/request — the public front door.
//
// Anyone can submit a booking request. It creates a PENDING event in the CRM plus
// its portal record, and hands back the secret link so the requester can keep
// filling in details. Nothing here confirms a booking; staff approve from the CRM.

import { validateEvent } from "@/lib/schemas";
import { REQUEST_KEYS, ALL_FIELDS, isBlank, portalToEventPatch } from "@/lib/eventPortal";
import { svc, hasServiceKey, newToken, newPortalId, newEventId } from "@/lib/portalDb";
import { notifyBookingRequest } from "@/lib/notify";
import { checkSlots, insertRequested } from "@/lib/bookingDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only the front-door fields are accepted here. Everything else is filled in later
// through the portal itself, so a crafted request cannot stuff arbitrary keys.
const ALLOWED = new Set(REQUEST_KEYS);
const REQUIRED = ALL_FIELDS.filter((f) => f.required && ALLOWED.has(f.key));

const clean = (v) => (typeof v === "string" ? v.trim().slice(0, 4000) : v);

export async function POST(req) {
  if (!hasServiceKey()) {
    return Response.json({ error: "Booking requests are not configured yet." }, { status: 503 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const answers = {};
  for (const [k, v] of Object.entries(body?.answers || {})) {
    if (ALLOWED.has(k) && !isBlank(v)) answers[k] = clean(v);
  }

  const missing = REQUIRED.filter((f) => isBlank(answers[f.key])).map((f) => f.label);
  if (missing.length) {
    return Response.json({ error: `Please fill in: ${missing.join(", ")}` }, { status: 400 });
  }

  const email = String(answers.contact_email || "").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "That email address does not look right." }, { status: 400 });
  }
  answers.contact_email = email;

  const sb = svc();

  // Light abuse / double-submit guard: same email, more than 5 requests in an hour.
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await sb
    .from("sprout_event_portals")
    .select("id", { count: "exact", head: true })
    .eq("data->>contact_email", email)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= 5) {
    return Response.json(
      { error: "You have submitted several requests already. We will be in touch shortly." },
      { status: 429 }
    );
  }

  // ── Dates picked on our calendar (optional) ──
  // Checked against the Program Calendar before anything is saved. If every date
  // is taken, nothing is created and the form says which ones.
  let wanted = [];
  let rejected = [];
  if (Array.isArray(body?.slots) && body.slots.length) {
    try {
      ({ ok: wanted, rejected } = await checkSlots({ slots: body.slots }));
    } catch (e) {
      // Google Calendar unreachable: keep the request anyway. Staff see the clash
      // check when they approve, so nothing double-books.
      console.error("portal/request — calendar check failed, saving unchecked:", e?.message);
      ({ ok: wanted, rejected } = await checkSlots({ slots: body.slots, skipCalendar: true }));
    }
    if (!wanted.length) {
      return Response.json({ error: rejected[0]?.reason || "Those dates are taken. Please pick others.", rejected }, { status: 409 });
    }
  }
  // The first date only gives the pending event a place on the CRM calendar. It is
  // NOT written into the portal answers, or every portal autosave would push it back
  // onto the event after staff decline it. Approval sets the real dates.
  const firstSlot = wanted.slice().sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  const regular = answers.booking_kind === "Regular booking";

  // ── Create the pending event ──
  // Event name is optional, so fall back to who is asking for the CRM record.
  const fallbackName = `Event request: ${answers.org_name || answers.contact_name}`;
  const eventId = await newEventId(answers.event_name || answers.org_name || answers.contact_name);
  const base = {
    id: eventId,
    name: fallbackName,
    event_date: null,
    status: "pending",
    location: "Sprout Society",
    start_time: "",
    end_time: "",
    recurrence: null,
    description: "",
    recap: "",
    contact_ids: [],
    confirmed_ids: [],
    tags: regular ? ["portal_request", "rental"] : ["portal_request"],
    outcomes: regular ? { hosted_by: "rental" } : null,
    links: [],
    checklist: [],
    next_actions: [],
    notes: `Booking request submitted through the events portal on ${new Date().toISOString().slice(0, 10)} by ${answers.contact_name} (${email}).`,
  };
  const merged = {
    ...base,
    ...portalToEventPatch(answers),
    ...(firstSlot ? { event_date: firstSlot.date, start_time: firstSlot.start, end_time: firstSlot.end } : {}),
  };
  const { data: valid, error: vErr } = validateEvent(merged);
  if (vErr) {
    console.warn("portal/request — event failed validation:", vErr);
    return Response.json({ error: "We could not save that request. Please check the dates and times." }, { status: 400 });
  }

  const { error: evErr } = await sb.from("sprout_events").insert({
    id: valid.id,
    name: valid.name,
    event_date: valid.event_date || null,
    status: valid.status,
    updated_at: new Date().toISOString(),
    data: { ...merged, ...valid },
  });
  if (evErr) {
    console.error("portal/request — event insert failed:", evErr.message);
    return Response.json({ error: "We could not save that request. Please try again." }, { status: 500 });
  }

  // ── Create the portal ──
  const token = newToken();
  const portalId = newPortalId();
  const { error: pErr } = await sb.from("sprout_event_portals").insert({
    id: portalId,
    event_id: valid.id,
    token,
    status: "draft",
    data: answers,
    updated_at: new Date().toISOString(),
  });
  if (pErr) {
    // The event exists but has no portal — roll it back so the CRM does not show
    // an orphaned request nobody can fill in.
    await sb.from("sprout_events").delete().eq("id", valid.id);
    console.error("portal/request — portal insert failed:", pErr.message);
    return Response.json({ error: "We could not save that request. Please try again." }, { status: 500 });
  }

  // ── Save the requested dates ──
  let slots = [];
  if (wanted.length) {
    try {
      slots = await insertRequested({ eventId: valid.id, portalId, slots: wanted, note: String(body?.note || "") });
    } catch (e) {
      await sb.from("sprout_event_portals").delete().eq("id", portalId);
      await sb.from("sprout_events").delete().eq("id", valid.id);
      console.error("portal/request — slot insert failed:", e?.message);
      return Response.json({ error: "We could not save those dates. Please try again." }, { status: 500 });
    }
  }

  // Tell staff a request came in. Awaited so serverless doesn't cut it off, but a
  // failed email never fails the request — it is already saved as a pending event.
  try {
    await notifyBookingRequest({ answers, eventId: valid.id, token, origin: new URL(req.url).origin, slots });
  } catch (e) {
    console.error("portal/request — notification email failed:", e?.message);
  }

  return Response.json({ token, event_id: valid.id, dates: slots.length, rejected });
}
