// /api/program/[token] — the participant program form.
//
//   GET   event name + date; with x-entry-id / x-entry-key headers, that participant's own answers
//   POST  send program info (creates one submission, returns its private edit key)
//   PUT   change a submission, proven by its edit key
//
// The token scopes everything to one event. Photos are uploaded by the browser to the
// public event-portal-files bucket first; this route only accepts URLs from that bucket.

import { sanitizeProgramData, hasProgramContent } from "@/lib/programForm";
import { hasServiceKey } from "@/lib/portalDb";
import {
  programFormByToken,
  programEvent,
  recentEntryCount,
  insertProgramEntry,
  programEntryForEdit,
  updateProgramEntry,
} from "@/lib/programDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (error, status = 400) => Response.json({ error }, { status });

async function load(params) {
  if (!hasServiceKey()) return { res: fail("This form is not set up yet.", 503) };
  const { token } = await params;
  let form;
  try {
    form = await programFormByToken(token);
  } catch {
    return { res: fail("The form is temporarily unavailable. Please try again in a few minutes.", 503) };
  }
  if (!form) return { res: fail("This link is not valid. Check with us for a fresh one.", 404) };
  return { form };
}

async function readBody(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function cleanData(raw) {
  const data = sanitizeProgramData(raw);
  const bucket = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-portal-files/`;
  if (data.photo_url && !data.photo_url.startsWith(bucket)) delete data.photo_url;
  return data;
}

export async function GET(req, { params }) {
  const { form, res } = await load(params);
  if (res) return res;
  const event = await programEvent(form.event_id);
  if (!event) return fail("This event could not be found.", 404);
  const entry = await programEntryForEdit(form.event_id, req.headers.get("x-entry-id"), req.headers.get("x-entry-key"));
  return Response.json({ event, entry });
}

export async function POST(req, { params }) {
  const { form, res } = await load(params);
  if (res) return res;
  const body = await readBody(req);
  if (!body) return fail("Invalid request.");

  // No honeypot here: Chrome autofill filled the hidden field and blocked a real
  // participant. The link is private to the lineup, and the hourly cap covers abuse.
  const data = cleanData(body.data);
  if (!hasProgramContent(data)) return fail("Fill in anything you want in the program first.");

  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  if ((await recentEntryCount(form.event_id, hourAgo)) >= 60) {
    return fail("A lot of info is coming in right now. Please try again in a little while.", 429);
  }

  const out = await insertProgramEntry(form.event_id, data);
  if (out.error) {
    console.error("program POST — insert failed:", out.error);
    return fail("We could not save that. Please try again.", 500);
  }
  return Response.json({ ok: true, entry_id: out.id, key: out.edit_key });
}

export async function PUT(req, { params }) {
  const { form, res } = await load(params);
  if (res) return res;
  const body = await readBody(req);
  if (!body) return fail("Invalid request.");

  const entry = await programEntryForEdit(form.event_id, body.entry_id, body.key);
  if (!entry) return fail("We could not find what you sent before. Send it again as new.", 404);

  const data = cleanData(body.data);
  if (!hasProgramContent(data)) return fail("Fill in anything you want in the program first.");

  const { error } = await updateProgramEntry(form.event_id, entry.id, data);
  if (error) {
    console.error("program PUT — update failed:", error);
    return fail("We could not save that. Please try again.", 500);
  }
  return Response.json({ ok: true });
}
