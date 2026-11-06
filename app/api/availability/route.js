// GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD — public.
//
// Busy times for the /book date picker: what is on the Program Calendar plus other
// requests waiting on staff. Only { date, start, end } in minutes ever leaves here;
// never a title or who it is.

import { hasServiceKey } from "@/lib/portalDb";
import { busyFor } from "@/lib/bookingDb";
import { ISO, daysBetween, todayNY, addDays, latestDate } from "@/lib/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!hasServiceKey()) return Response.json({ error: "Not configured." }, { status: 503 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  if (!ISO.test(from) || !ISO.test(to) || to < from || daysBetween(from, to) > 100) {
    return Response.json({ error: "Ask for up to 100 days at a time." }, { status: 400 });
  }
  // Nothing before last month or past the booking window is anyone's business.
  const today = todayNY();
  if (to < addDays(today, -40) || from > addDays(latestDate(today), 7)) return Response.json({ busy: [] });
  try {
    return Response.json({ busy: await busyFor({ from, to }) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("availability:", e?.message || e);
    return Response.json({ error: "We couldn't load the calendar. Please try again in a minute." }, { status: 502 });
  }
}
