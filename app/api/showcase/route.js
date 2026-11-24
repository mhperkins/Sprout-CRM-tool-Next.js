// /api/showcase — the public submission form at /submit (/showcase redirects there).
//
//   POST { step:"start", data:{name,email,role} }   step 1: save a 'started' row, return its token
//   POST { step:"finish", token, data }              step 2: finish that row, alert Max
//   POST { data }                                    old one-shot form (cached /showcase pages)
//   GET  ?token=…                                    reopen your own row (from the reminder email)
//
// One standing link, no login. Safety: rows land in their own table and never touch
// sprout_contacts, an hourly cap covers a flood, file URLs are only accepted from our
// own public bucket, and a row can only be read or finished with its private token.
//
// No honeypot field. Chrome autofill filled the program form's hidden trap and
// blocked a real person; we are not repeating that here.

import {
  sanitizeShowcaseData, showcaseProblems, startProblems, workProblems, SHOWCASE_SCOPE,
} from "@/lib/showcaseForm";
import { hasServiceKey } from "@/lib/portalDb";
import {
  recentApplicationCount, duplicateRecently, insertApplication,
  startApplication, applicationByToken, finishApplication,
} from "@/lib/showcaseDb";
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

async function alertMax(req, data) {
  // Awaited because serverless kills the function once the response is sent, but
  // caught: a failed alert must never fail someone's submission.
  try {
    await notifyShowcaseApplication({ data, origin: new URL(req.url).origin });
  } catch (e) {
    console.error("showcase — notification email failed:", e?.message || e);
  }
}

const UNAVAILABLE = "The form is temporarily unavailable. Please try again in a few minutes.";

export async function GET(req) {
  if (!hasServiceKey()) return fail("This form is not set up yet.", 503);
  const token = new URL(req.url).searchParams.get("token");
  let row;
  try { row = await applicationByToken(token); }
  catch { return fail(UNAVAILABLE, 503); }
  if (!row) return fail("We couldn't find that submission. You can start a new one.", 404);
  const d = row.data || {};
  // Only what step 2 needs to greet them. Nothing else about the row leaves the server.
  return Response.json({ status: row.status, data: { name: d.name || "", role: d.role || "" } });
}

export async function POST(req) {
  if (!hasServiceKey()) return fail("This form is not set up yet.", 503);

  let body;
  try { body = await req.json(); }
  catch { return fail("Invalid request."); }

  const data = keepOurFiles(sanitizeShowcaseData(body?.data));
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();

  /* ── step 1 ─────────────────────────────────────────────────────────── */
  if (body?.step === "start") {
    const problems = startProblems(data);
    if (problems.length) return fail(problems[0]);
    try {
      if ((await recentApplicationCount(hourAgo)) >= HOURLY_CAP) {
        return fail("A lot is coming in right now. Please try again in a little while.", 429);
      }
    } catch {
      return fail(UNAVAILABLE, 503);
    }
    const out = await startApplication({ name: data.name, email: data.email, role: data.role });
    if (out.error) {
      console.error("showcase start — save failed:", out.error);
      return fail("We could not save that. Please try again.", 500);
    }
    return Response.json({ ok: true, token: out.token });
  }

  /* ── step 2 ─────────────────────────────────────────────────────────── */
  if (body?.step === "finish") {
    let row;
    try { row = await applicationByToken(body?.token); }
    catch { return fail(UNAVAILABLE, 503); }
    if (!row) return fail("We couldn't find your submission. Please start again.", 404);
    if (row.status !== "started") return Response.json({ ok: true, already: true });

    // Name, email and role come from step 1 as saved; step 2 cannot rewrite them.
    const saved = row.data || {};
    const full = { ...data, name: saved.name, email: saved.email, role: saved.role };
    const problems = workProblems(full);
    if (problems.length) return fail(problems[0]);

    const out = await finishApplication(row.id, full);
    if (out.error) {
      console.error("showcase finish — save failed:", out.error);
      return fail("We could not save that. Please try again.", 500);
    }
    if (out.finished) await alertMax(req, full);
    return Response.json({ ok: true });
  }

  /* ── old one-shot form ──────────────────────────────────────────────── */
  const problems = showcaseProblems(data);
  if (problems.length) return fail(problems[0]);
  try {
    if ((await recentApplicationCount(hourAgo)) >= HOURLY_CAP) {
      return fail("A lot is coming in right now. Please try again in a little while.", 429);
    }
    if (await duplicateRecently(data.email, hourAgo)) return Response.json({ ok: true, duplicate: true });
  } catch {
    return fail(UNAVAILABLE, 503);
  }
  const out = await insertApplication(data);
  if (out.error) {
    console.error("showcase POST — insert failed:", out.error);
    return fail("We could not save that. Please try again.", 500);
  }
  await alertMax(req, data);
  return Response.json({ ok: true, id: out.id });
}
