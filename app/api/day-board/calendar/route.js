// GET /api/day-board/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Max's calendar and the Sprout HQ Program Calendar for the Day Board. Signed-in staff
// only: the browser sends its Supabase session token and the route checks it before
// reading Google Calendar with hello@'s server credentials.

import { NextResponse } from "next/server";
import { svc, hasServiceKey } from "@/lib/portalDb";
import { fetchCalendarEvents } from "@/lib/googleCalendar";
import { daysBetween } from "@/lib/dayBoard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !hasServiceKey()) {
    return NextResponse.json({ error: "Sign in to see the calendar." }, { status: 401 });
  }
  const { data, error } = await svc().auth.getUser(token);
  if (error || !data?.user) {
    return NextResponse.json({ error: "Sign in to see the calendar." }, { status: 401 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  if (!ISO.test(from) || !ISO.test(to) || to < from || daysBetween(from, to) > 62) {
    return NextResponse.json({ error: "Ask for a range of up to 62 days." }, { status: 400 });
  }

  try {
    const events = await fetchCalendarEvents(from, to);
    return NextResponse.json({ events }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("day-board calendar:", e?.message || e);
    return NextResponse.json({ error: "Couldn't reach Google Calendar. Tasks still work." }, { status: 502 });
  }
}
