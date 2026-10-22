// /api/coming-soon — the launch-list sign-up on the public coming-soon page.
//
//   POST  { name, email }
//
// No token and no login. The write lands in its own table (sprout_site_signups) and
// never touches sprout_contacts; an hourly cap covers a flood, and a repeat email is
// answered as success without a second row. No honeypot (autofill trips them).

import { randomBytes } from "crypto";
import { svc, hasServiceKey } from "@/lib/portalDb";
import { notifySiteSignup } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOURLY_CAP = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const fail = (error, status = 400) => Response.json({ error }, { status });

export async function POST(req) {
  if (!hasServiceKey()) return fail("Sign-up is not set up yet.", 503);

  let body;
  try { body = await req.json(); }
  catch { return fail("Invalid request."); }

  const name = String(body?.name || "").trim().slice(0, 120);
  const email = String(body?.email || "").trim().toLowerCase().slice(0, 200);
  if (!name) return fail("Please add your name.");
  if (!EMAIL_RE.test(email)) return fail("Please check your email address.");

  const db = svc();
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  try {
    const { count, error } = await db
      .from("sprout_site_signups")
      .select("id", { count: "exact", head: true })
      .gte("created_at", hourAgo);
    if (error) throw error;
    if ((count ?? 0) >= HOURLY_CAP) {
      return fail("A lot of people are signing up right now. Please try again in a little while.", 429);
    }
    const { data: existing, error: dupErr } = await db
      .from("sprout_site_signups").select("id").ilike("email", email).limit(1);
    if (dupErr) throw dupErr;
    if (existing?.length) return Response.json({ ok: true, already: true });
  } catch (e) {
    console.error("coming-soon POST — lookup failed:", e?.message || e);
    return fail("Sign-up is temporarily unavailable. Please try again in a few minutes.", 503);
  }

  const id = `sgn_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
  const { error } = await db.from("sprout_site_signups").insert({ id, name, email });
  if (error) {
    // A same-moment double submit hits the unique email index: that is a success.
    if (error.code === "23505") return Response.json({ ok: true, already: true });
    console.error("coming-soon POST — insert failed:", error.message);
    return fail("We could not save that. Please try again.", 500);
  }

  // Awaited (serverless) but caught: a failed alert never fails a sign-up.
  try {
    const { count } = await db.from("sprout_site_signups").select("id", { count: "exact", head: true });
    await notifySiteSignup({ name, email, total: count });
  } catch (e) {
    console.error("coming-soon POST — notification email failed:", e?.message || e);
  }

  return Response.json({ ok: true });
}
