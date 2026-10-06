// GET /api/members/stripe
//
// Membership invoices from Stripe, for the Members page and Grant Metrics dues.
// Signed-in staff only: the browser sends its Supabase session token and the route
// checks it before reading Stripe with the server's read-only key.

import { NextResponse } from "next/server";
import { svc, hasServiceKey } from "@/lib/portalDb";
import { fetchMembershipInvoices, hasStripeKey } from "@/lib/stripeMembers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !hasServiceKey()) {
    return NextResponse.json({ error: "Sign in to see Stripe invoices." }, { status: 401 });
  }
  const { data, error } = await svc().auth.getUser(token);
  if (error || !data?.user) {
    return NextResponse.json({ error: "Sign in to see Stripe invoices." }, { status: 401 });
  }
  if (!hasStripeKey()) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY is not set on the server." }, { status: 503 });
  }
  try {
    const invoices = await fetchMembershipInvoices();
    return NextResponse.json({ invoices }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("members stripe:", e?.message || e);
    return NextResponse.json({ error: "Couldn't read Stripe." }, { status: 502 });
  }
}
