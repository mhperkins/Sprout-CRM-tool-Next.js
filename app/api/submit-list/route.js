// /api/submit-list — the call-for-submissions list (QR on the TV slide → /submit).
//
//   POST  { name, email, role, instagram }
//
// Same shape as /api/coming-soon: no token, its own table (sprout_submission_list),
// never sprout_contacts. Hourly cap, repeat email answered as success, no honeypot.

import { randomBytes } from "crypto";
import { svc, hasServiceKey } from "@/lib/portalDb";
import { notifySubmissionSignup, sendGalleryFormLink } from "@/lib/notify";
import { openCallForm } from "@/lib/galleryDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOURLY_CAP = 60;
const ROLES = ["music", "art", "other"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const fail = (error, status = 400) => Response.json({ error }, { status });

/** The open-call gallery link on this host, or "" if it can't be read. */
async function formUrl(req) {
  try {
    const form = await openCallForm();
    return form ? `${new URL(req.url).origin}/gallery/${form.token}` : "";
  } catch (e) {
    console.error("submit-list — open-call lookup failed:", e?.message || e);
    return "";
  }
}

export async function POST(req) {
  if (!hasServiceKey()) return fail("Sign-up is not set up yet.", 503);

  let body;
  try { body = await req.json(); }
  catch { return fail("Invalid request."); }

  const name = String(body?.name || "").trim().slice(0, 120);
  const email = String(body?.email || "").trim().toLowerCase().slice(0, 200);
  const role = ROLES.includes(body?.role) ? body.role : "";
  let instagram = String(body?.instagram || "").trim().slice(0, 80);
  if (instagram && !instagram.startsWith("@") && !instagram.includes("/")) instagram = "@" + instagram;
  if (!name) return fail("Please add your name.");
  if (!EMAIL_RE.test(email)) return fail("Please check your email address.");
  if (!role) return fail("Please pick music, art, or something else.");

  const db = svc();
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  try {
    const { count, error } = await db
      .from("sprout_submission_list")
      .select("id", { count: "exact", head: true })
      .gte("created_at", hourAgo);
    if (error) throw error;
    if ((count ?? 0) >= HOURLY_CAP) {
      return fail("A lot of people are signing up right now. Please try again in a little while.", 429);
    }
    const { data: existing, error: dupErr } = await db
      .from("sprout_submission_list").select("id").ilike("email", email).limit(1);
    if (dupErr) throw dupErr;
    // A repeat address is not emailed again (no spamming an inbox from this form),
    // but the thank-you screen still shows the link.
    if (existing?.length) return Response.json({ ok: true, already: true, form_url: await formUrl(req) });
  } catch (e) {
    console.error("submit-list POST — lookup failed:", e?.message || e);
    return fail("Sign-up is temporarily unavailable. Please try again in a few minutes.", 503);
  }

  const id = `sbl_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
  const { error } = await db.from("sprout_submission_list").insert({ id, name, email, role, instagram });
  if (error) {
    if (error.code === "23505") return Response.json({ ok: true, already: true });
    console.error("submit-list POST — insert failed:", error.message);
    return fail("We could not save that. Please try again.", 500);
  }

  // Email them the gallery form (the standing open-call link). Awaited but caught:
  // a failed send never fails the sign-up; the alert below tells Max to send it.
  const url = await formUrl(req);
  let formSent = false;
  if (url) {
    try {
      await sendGalleryFormLink({ name, email, url });
      formSent = true;
      await db.from("sprout_submission_list")
        .update({ sent_form_at: new Date().toISOString(), form_token: url.split("/").pop() })
        .eq("id", id);
    } catch (e) {
      console.error("submit-list POST — form email failed:", e?.message || e);
    }
  }

  // Awaited (serverless) but caught: a failed alert never fails a sign-up.
  try {
    const { count } = await db.from("sprout_submission_list").select("id", { count: "exact", head: true });
    await notifySubmissionSignup({ name, email, role, instagram, total: count, formSent });
  } catch (e) {
    console.error("submit-list POST — notification email failed:", e?.message || e);
  }

  return Response.json({ ok: true, form_sent: formSent, form_url: url });
}
