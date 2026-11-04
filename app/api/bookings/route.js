// /api/bookings — staff only.
//   GET   every date request waiting on staff, grouped by booking, each checked against the calendar
//   POST  { approve:[ids], decline:[ids], reason }  decide them; approved dates go on the Program Calendar
//         and each client gets one email listing what changed.

import { requireStaff } from "@/lib/staffAuth";
import { pendingRequests, decideSlots } from "@/lib/bookingDb";
import { svc } from "@/lib/portalDb";
import { notifySlotDecision } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const denied = await requireStaff(req);
  if (denied) return denied;
  try {
    return Response.json({ groups: await pendingRequests() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("bookings GET:", e?.message || e);
    return Response.json({ error: "Couldn't load booking requests. Google Calendar may be unreachable." }, { status: 502 });
  }
}

export async function POST(req) {
  const denied = await requireStaff(req);
  if (denied) return denied;
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const approve = Array.isArray(body?.approve) ? body.approve : [];
  const decline = Array.isArray(body?.decline) ? body.decline : [];
  const reason = String(body?.reason || "");
  if (!approve.length && !decline.length) return Response.json({ error: "Pick at least one date." }, { status: 400 });

  let results;
  try {
    results = await decideSlots({ approve, decline, reason });
  } catch (e) {
    console.error("bookings POST:", e?.message || e);
    return Response.json({ error: `Couldn't save that: ${e?.message || "unknown error"}` }, { status: 500 });
  }

  // One email per booking. A failed email never undoes the decision.
  const origin = new URL(req.url).origin;
  for (const r of results) {
    if (!r.confirmed.length && !r.declined.length) continue;
    try {
      const { data: p } = await svc().from("sprout_event_portals").select("token,data").eq("event_id", r.event_id).maybeSingle();
      await notifySlotDecision({
        to: p?.data?.contact_email, name: p?.data?.contact_name,
        eventName: p?.data?.event_name || r.event_name,
        confirmed: r.confirmed, declined: r.declined, reason,
        portalUrl: p?.token ? `${origin}/portal/${p.token}` : "",
      });
      r.emailed = Boolean(p?.data?.contact_email);
    } catch (e) {
      console.error("bookings — client email failed:", e?.message || e);
      r.emailed = false;
    }
  }
  return Response.json({ results });
}
