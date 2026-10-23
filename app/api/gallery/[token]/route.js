// /api/gallery/[token] — the gallery submission form (replaces the Google Form).
//
//   GET   form kind + event name/date; with x-entry-id / x-entry-key, that artist's own answers
//   POST  send a submission (returns its private edit key)
//   PUT   change a submission, proven by its edit key
//
// The token is either one event's link or the standing open-call link (which /submit
// emails). Photos are uploaded by the browser to event-portal-files first; this route
// keeps only URLs from that bucket.

import { sanitizeGalleryData, galleryProblems } from "@/lib/galleryForm";
import { hasServiceKey } from "@/lib/portalDb";
import {
  galleryFormByToken, galleryEvent, recentGalleryCount,
  insertGalleryEntry, galleryEntryForEdit, updateGalleryEntry,
} from "@/lib/galleryDb";
import { notifyGallerySubmission } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (error, status = 400) => Response.json({ error }, { status });
const BUCKET = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-portal-files/`;

async function load(params) {
  if (!hasServiceKey()) return { res: fail("This form is not set up yet.", 503) };
  const { token } = await params;
  let form;
  try { form = await galleryFormByToken(token); }
  catch { return { res: fail("The form is temporarily unavailable. Please try again in a few minutes.", 503) }; }
  if (!form) return { res: fail("This link is not valid. Check with us for a fresh one.", 404) };
  return { form };
}

const readBody = async (req) => { try { return await req.json(); } catch { return null; } };

// Awaited (serverless) but caught: a failed alert never fails a submission.
async function alertStaff(req, form, data, updated) {
  try {
    const event = await galleryEvent(form.event_id);
    await notifyGallerySubmission({ data, event, origin: new URL(req.url).origin, updated });
  } catch (e) {
    console.error("gallery — notification email failed:", e?.message || e);
  }
}

export async function GET(req, { params }) {
  const { form, res } = await load(params);
  if (res) return res;
  const event = await galleryEvent(form.event_id);
  const entry = await galleryEntryForEdit(form.id, req.headers.get("x-entry-id"), req.headers.get("x-entry-key"));
  return Response.json({ kind: form.kind, event, scope: form.event_id || "open-call", entry });
}

export async function POST(req, { params }) {
  const { form, res } = await load(params);
  if (res) return res;
  const body = await readBody(req);
  if (!body) return fail("Invalid request.");
  const data = sanitizeGalleryData(body.data, BUCKET());
  const problems = galleryProblems(data);
  if (problems.length) return fail(problems.join(" "));

  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  if ((await recentGalleryCount(form.id, hourAgo)) >= 60) {
    return fail("A lot of submissions are coming in right now. Please try again in a little while.", 429);
  }
  const out = await insertGalleryEntry(form, data);
  if (out.error) {
    console.error("gallery POST — insert failed:", out.error);
    return fail("We could not save that. Please try again.", 500);
  }
  await alertStaff(req, form, data, false);
  return Response.json({ ok: true, entry_id: out.id, key: out.edit_key });
}

export async function PUT(req, { params }) {
  const { form, res } = await load(params);
  if (res) return res;
  const body = await readBody(req);
  if (!body) return fail("Invalid request.");
  const entry = await galleryEntryForEdit(form.id, body.entry_id, body.key);
  if (!entry) return fail("We could not find what you sent before. Send it again as new.", 404);
  const data = sanitizeGalleryData(body.data, BUCKET());
  const problems = galleryProblems(data);
  if (problems.length) return fail(problems.join(" "));
  const { error } = await updateGalleryEntry(form.id, entry.id, data);
  if (error) {
    console.error("gallery PUT — update failed:", error);
    return fail("We could not save that. Please try again.", 500);
  }
  await alertStaff(req, form, data, true);
  return Response.json({ ok: true });
}
