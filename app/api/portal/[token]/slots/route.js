// /api/portal/[token]/slots — the client's dates.
//
//   GET    ?from&to   their own dates (every status) + everyone else's busy times
//   POST   { slots:[{date,start,end}], note }   ask for more dates
//   DELETE { id }     withdraw a request that is still waiting
//
// The token scopes everything to one booking. Busy times never carry a title.

import { hasServiceKey, portalByToken, publicEvent } from "@/lib/portalDb";
import { busyFor, slotsForEvent, publicSlot, checkSlots, insertRequested, cancelRequested } from "@/lib/bookingDb";
import { notifySlotRequest } from "@/lib/notify";
import { ISO, daysBetween } from "@/lib/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function load(params) {
  if (!hasServiceKey()) return { fail: Response.json({ error: "Portal is not configured yet." }, { status: 503 }) };
  const { token } = await params;
  try {
    const portal = await portalByToken(token);
    if (!portal) return { fail: Response.json({ error: "This link is not valid." }, { status: 404 }) };
    return { portal };
  } catch {
    return { fail: Response.json({ error: "The portal is temporarily unavailable." }, { status: 503 }) };
  }
}

export async function GET(req, { params }) {
  const { portal, fail } = await load(params);
  if (fail) return fail;
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  if (!ISO.test(from) || !ISO.test(to) || to < from || daysBetween(from, to) > 100) {
    return Response.json({ error: "Ask for up to 100 days at a time." }, { status: 400 });
  }
  try {
    const [mine, busy] = await Promise.all([slotsForEvent(portal.event_id), busyFor({ from, to, eventId: portal.event_id })]);
    return Response.json({
      mine: mine.filter((s) => s.status !== "cancelled").map(publicSlot),
      busy,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("portal slots GET:", e?.message || e);
    return Response.json({ error: "We couldn't load the calendar. Please try again in a minute." }, { status: 502 });
  }
}

// Same light flood guard idea as the other public forms.
const recent = new Map();

export async function POST(req, { params }) {
  const { portal, fail } = await load(params);
  if (fail) return fail;
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }

  const n = (recent.get(portal.id) || []).filter((t) => Date.now() - t < 3600_000);
  if (n.length >= 20) return Response.json({ error: "That's a lot of requests in an hour. We'll be in touch." }, { status: 429 });

  try {
    const { ok, rejected } = await checkSlots({ slots: body?.slots, eventId: portal.event_id });
    if (!ok.length) return Response.json({ error: rejected[0]?.reason || "Pick at least one open date.", rejected }, { status: 409 });
    const note = String(body?.note || "").slice(0, 1000);
    const created = await insertRequested({ eventId: portal.event_id, portalId: portal.id, slots: ok, note });
    recent.set(portal.id, [...n, Date.now()]);

    try {
      const event = await publicEvent(portal.event_id);
      await notifySlotRequest({
        eventName: portal.data?.event_name || event?.name,
        contactName: portal.data?.contact_name, contactEmail: portal.data?.contact_email,
        slots: created, note, origin: new URL(req.url).origin,
      });
    } catch (e) { console.error("portal slots — alert failed:", e?.message || e); }

    return Response.json({ created: created.map(publicSlot), rejected });
  } catch (e) {
    console.error("portal slots POST:", e?.message || e);
    return Response.json({ error: "We couldn't send that. Please try again." }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { portal, fail } = await load(params);
  if (fail) return fail;
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  try {
    const row = await cancelRequested(portal.event_id, String(body?.id || ""));
    if (!row) return Response.json({ error: "Only dates still waiting on us can be withdrawn here. Email us about confirmed dates." }, { status: 400 });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("portal slots DELETE:", e?.message || e);
    return Response.json({ error: "We couldn't withdraw that. Please try again." }, { status: 500 });
  }
}
