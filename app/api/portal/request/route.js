// POST /api/portal/request — the public front door.
//
// Anyone can submit a booking request. It creates a PENDING event in the CRM plus
// its portal record, and hands back the secret link so the requester can keep
// filling in details. Nothing here confirms a booking; staff approve from the CRM.

import { validateEvent } from "@/lib/schemas";
import { REQUEST_KEYS, ALL_FIELDS, isBlank, portalToEventPatch } from "@/lib/eventPortal";
import { svc, hasServiceKey, newToken, newPortalId, newEventId } from "@/lib/portalDb";

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

  // Honeypot: a hidden field real people never fill in.
  if (!isBlank(body?.company_website)) {
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 400 });
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

  // ── Create the pending event ──
  const eventId = await newEventId(answers.event_name);
  const base = {
    id: eventId,
    name: "",
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
    tags: ["portal_request"],
    links: [],
    checklist: [],
    next_actions: [],
    notes: `Booking request submitted through the events portal on ${new Date().toISOString().slice(0, 10)} by ${answers.contact_name} (${email}).`,
  };
  const merged = { ...base, ...portalToEventPatch(answers) };
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
  const { error: pErr } = await sb.from("sprout_event_portals").insert({
    id: newPortalId(),
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

  return Response.json({ token, event_id: valid.id });
}
