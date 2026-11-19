// GET /api/grant-metrics/donations
//
// Gifts from Givebutter for Grant Metrics (membership dues left out).
// Signed-in staff only: the browser sends its Supabase session token and the route
// checks it before reading Givebutter with the server's key.

import { NextResponse } from "next/server";
import { svc, hasServiceKey } from "@/lib/portalDb";
import { fetchDonations, hasGivebutterKey } from "@/lib/givebutterDonations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !hasServiceKey()) return NextResponse.json({ error: "Sign in to see donations." }, { status: 401 });
  const { data, error } = await svc().auth.getUser(token);
  if (error || !data?.user) return NextResponse.json({ error: "Sign in to see donations." }, { status: 401 });
  if (!hasGivebutterKey()) return NextResponse.json({ error: "GIVEBUTTER_API_KEY is not set on the server." }, { status: 503 });
  try {
    const donations = await fetchDonations();
    return NextResponse.json({ donations }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("grant-metrics donations:", e?.message || e);
    return NextResponse.json({ error: "Couldn't read Givebutter." }, { status: 502 });
  }
}
