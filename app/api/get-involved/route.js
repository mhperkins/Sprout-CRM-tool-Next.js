// /api/get-involved — the public "Get involved" interest form (/get-involved).
//
//   POST  { name, email, interests[], message, instagram, how_heard }
//
// Same shape as /api/submit-list: no token, its own table (sprout_interest),
// never sprout_contacts. Hourly cap; a repeat send from the same email within the
// hour is answered as success without a second row. No honeypot.

import { randomBytes } from "crypto";
import { svc, hasServiceKey } from "@/lib/portalDb";
import { notifyInterest } from "@/lib/notify";
import { cleanInterest } from "@/lib/interestForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOURLY_CAP = 60;
const fail = (error, status = 400, problems) => Response.json({ error, problems }, { status });

export async function POST(req) {
  if (!hasServiceKey()) return fail("This form is not set up yet.", 503);

  let body;
  try { body = await req.json(); }
  catch { return fail("Invalid request."); }

  const { data, problems } = cleanInterest(body);
  if (Object.keys(problems).length) return fail(Object.values(problems)[0], 400, problems);

  const db = svc();
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  try {
    const { count, error } = await db
      .from("sprout_interest")
      .select("id", { count: "exact", head: true })
      .gte("created_at", hourAgo);
    if (error) throw error;
    if ((count ?? 0) >= HOURLY_CAP) {
      return fail("A lot of people are writing in right now. Please try again in a little while.", 429);
    }
    const { data: recent, error: dupErr } = await db
      .from("sprout_interest").select("id").ilike("email", data.email).gte("created_at", hourAgo).limit(1);
    if (dupErr) throw dupErr;
    if (recent?.length) return Response.json({ ok: true, already: true });
  } catch (e) {
    console.error("get-involved POST — lookup failed:", e?.message || e);
    return fail("The form is temporarily unavailable. Please try again in a few minutes.", 503);
  }

  const id = `gin_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
  const { error } = await db.from("sprout_interest").insert({ id, ...data });
  if (error) {
    console.error("get-involved POST — insert failed:", error.message);
    return fail("We could not save that. Please try again.", 500);
  }

  // Awaited (serverless) but caught: a failed alert never fails a send.
  try {
    await notifyInterest({ ...data, origin: new URL(req.url).origin });
  } catch (e) {
    console.error("get-involved POST — notification email failed:", e?.message || e);
  }

  return Response.json({ ok: true });
}
