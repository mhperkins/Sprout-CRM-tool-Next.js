// GET /api/grant-metrics/signins
//
// Unique front-door kiosk sign-ins per event night, for Grant Metrics attendance.
// Signed-in staff only: the browser sends its Supabase session token and the route
// checks it before reading the sign-in sheet with hello@'s server credentials.

import { NextResponse } from "next/server";
import { svc, hasServiceKey } from "@/lib/portalDb";
import { fetchKioskNights, KIOSK_SHEET_URL } from "@/lib/kioskSignins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !hasServiceKey()) {
    return NextResponse.json({ error: "Sign in to see sign-ins." }, { status: 401 });
  }
  const { data, error } = await svc().auth.getUser(token);
  if (error || !data?.user) {
    return NextResponse.json({ error: "Sign in to see sign-ins." }, { status: 401 });
  }
  try {
    const nights = await fetchKioskNights();
    return NextResponse.json({ nights, sheetUrl: KIOSK_SHEET_URL }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("grant-metrics signins:", e?.message || e);
    return NextResponse.json({ error: "Couldn't read the sign-in sheet." }, { status: 502 });
  }
}
