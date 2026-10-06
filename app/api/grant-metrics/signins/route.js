// GET /api/grant-metrics/signins
//
// Unique sign-ins per event night across every sign-in sheet in the SPROUT N TELL
// Drive folder (kiosk + the older check-in form), for Grant Metrics attendance.
// Signed-in staff only: the browser sends its Supabase session token and the route
// checks it before reading the sign-in sheets with hello@'s server credentials.

import { NextResponse } from "next/server";
import { svc, hasServiceKey } from "@/lib/portalDb";
import { fetchSigninNights, SIGNIN_FOLDER_URL } from "@/lib/kioskSignins";

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
    const { nights, sheets } = await fetchSigninNights();
    return NextResponse.json({ nights, sheets, folderUrl: SIGNIN_FOLDER_URL }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("grant-metrics signins:", e?.message || e);
    return NextResponse.json({ error: "Couldn't read the sign-in sheets." }, { status: 502 });
  }
}
