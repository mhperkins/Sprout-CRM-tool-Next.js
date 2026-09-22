// /api/showcase — the public showcase application form at /showcase.
//
//   POST  send an application
//
// One standing link, no token and no login, so this is the only public write path
// in the CRM that is not scoped by a secret. Three things keep it safe: the write
// lands in its own table and never touches sprout_contacts, an hourly cap covers a
// flood, and file URLs are only accepted from our own public bucket.
//
// No honeypot field. Chrome autofill filled the program form's hidden trap and
// blocked a real person; we are not repeating that here.

import { sanitizeShowcaseData, showcaseProblems, SHOWCASE_SCOPE } from "@/lib/showcaseForm";
import { hasServiceKey } from "@/lib/portalDb";
import { recentApplicationCount, duplicateRecently, insertApplication } from "@/lib/showcaseDb";
import { notifyShowcaseApplication } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOURLY_CAP = 40;
const fail = (error, status = 400) => Response.json({ error }, { status });

/** Only files the browser uploaded into our own public bucket, under showcase/. */
function keepOurFiles(data) {
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-portal-files/${SHOWCASE_SCOPE}/`;
  if (Array.isArray(data.files)) {
    const kept = data.files.filter((f) => f.url.startsWith(prefix));
    if (kept.length) data.files = kept;
    else delete data.files;
  }
  return data;
}

export async function POST(req) {
  if (!hasServiceKey()) return fail("This form is not set up yet.", 503);

  let body;
  try { body = await req.json(); }
  catch { return fail("Invalid request."); }

  const data = keepOurFiles(sanitizeShowcaseData(body?.data));
  const problems = showcaseProblems(data);
  if (problems.length) return fail(problems[0]);

  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  try {
    if ((await recentApplicationCount(hourAgo)) >= HOURLY_CAP) {
      return fail("A lot is coming in right now. Please try again in a little while.", 429);
    }
    // Two sends from one address within the hour is almost always a double-click or
    // a second thought. Treat it as delivered rather than filing a near-duplicate.
    if (await duplicateRecently(data.email, hourAgo)) {
      return Response.json({ ok: true, duplicate: true });
    }
  } catch {
    return fail("The form is temporarily unavailable. Please try again in a few minutes.", 503);
  }

  const out = await insertApplication(data);
  if (out.error) {
    console.error("showcase POST — insert failed:", out.error);
    return fail("We could not save that. Please try again.", 500);
  }

  // Awaited because serverless kills the function once the response is sent, but
  // caught: a failed alert must never fail someone's application.
  try {
    const origin = new URL(req.url).origin;
    await notifyShowcaseApplication({ data, origin });
  } catch (e) {
    console.error("showcase POST — notification email failed:", e?.message || e);
  }

  return Response.json({ ok: true, id: out.id });
}
