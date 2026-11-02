// /api/media/[token] — the guest media upload link.
//
//   GET   event name + date
//   POST  { action: "start", batch, name, mime, size }  open a Drive upload for one file
//         { action: "done", id, file_id }                confirm the file reached Drive
//         { action: "link", batch, url }                 add a pasted link (checked for sharing)
//         { action: "finish", batch, sender }            stamp who sent it, email staff
//
// The token scopes everything to one event. File bytes never pass through here: the
// guest's browser PUTs them to the Drive session URL that "start" returns.

import { hasServiceKey, svc } from "@/lib/portalDb";
import {
  mediaFormByToken, mediaEvent, ensureFolder, recentStartCount,
  insertUpload, uploadForForm, markUploadDone, finishBatch,
} from "@/lib/mediaDb";
import { startUpload, driveFile, linkAccess } from "@/lib/googleDrive";
import {
  MAX_FILE_BYTES, MAX_STARTS_PER_HOUR, MAX_LINKS, LIMITS, BATCH_RE,
  isMediaFile, sanitizeSender, cleanUrl,
} from "@/lib/mediaForm";
import { notifyGuestMedia } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status });

async function load(params) {
  if (!hasServiceKey()) return { res: fail("This link is not set up yet.", 503) };
  if (!process.env.GMAIL_REFRESH_TOKEN) return { res: fail("Uploads are not set up yet.", 503) };
  const { token } = await params;
  let form;
  try {
    form = await mediaFormByToken(token);
  } catch {
    return { res: fail("Uploads are temporarily unavailable. Please try again in a few minutes.", 503) };
  }
  if (!form) return { res: fail("This link is not valid. Check with us for a fresh one.", 404) };
  return { form };
}

export async function GET(req, { params }) {
  const { form, res } = await load(params);
  if (res) return res;
  const event = await mediaEvent(form.event_id);
  if (!event) return fail("This event could not be found.", 404);
  return Response.json({ event });
}

export async function POST(req, { params }) {
  const { form, res } = await load(params);
  if (res) return res;
  let body;
  try { body = await req.json(); } catch { return fail("Invalid request."); }
  const action = body?.action;
  try {
    if (action === "start") return await start(req, form, body);
    if (action === "done") return await done(form, body);
    if (action === "link") return await addLink(form, body);
    if (action === "finish") return await finish(req, form, body);
  } catch (e) {
    console.error(`media ${action} failed:`, e?.message || e);
    return fail("Something went wrong on our side. Please try again.", 500);
  }
  return fail("Invalid request.");
}

async function start(req, form, body) {
  const batch = String(body.batch || "");
  if (!BATCH_RE.test(batch)) return fail("Invalid request.");
  const name = String(body.name || "").trim().slice(0, LIMITS.filename) || "upload";
  const mime = String(body.mime || "").slice(0, 100);
  const size = Number(body.size);
  if (!isMediaFile(name, mime)) return fail(`"${name}" is not a photo or video.`);
  if (!Number.isFinite(size) || size <= 0) return fail(`"${name}" looks empty.`);
  if (size > MAX_FILE_BYTES) return fail(`"${name}" is over 10 GB. Paste a link to it instead.`);

  // Google only allows the browser's upload from the origin that opened the session,
  // and that must be this site.
  const origin = req.headers.get("origin") || "";
  if (origin !== new URL(req.url).origin) return fail("Invalid request.", 403);

  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  if ((await recentStartCount(form.id, hourAgo)) >= MAX_STARTS_PER_HOUR) {
    return fail("A lot is coming in right now. Please try again in a little while.", 429);
  }

  const folderId = await ensureFolder(form);
  const uploadUrl = await startUpload({ folderId, name, mime, size, origin });
  const out = await insertUpload(form, { batch_id: batch, kind: "file", status: "pending", name, mime, size });
  if (out.error) throw new Error(out.error);
  return Response.json({ id: out.id, upload_url: uploadUrl });
}

async function done(form, body) {
  const row = await uploadForForm(form, body.id);
  if (!row || row.kind !== "file") return fail("We could not find that upload.", 404);
  if (row.status === "done") return Response.json({ ok: true });
  const file = await driveFile(String(body.file_id || ""));
  const { data: f } = await svc().from("sprout_media_forms").select("drive_folder_id").eq("id", form.id).maybeSingle();
  if (!file || file.trashed || !(file.parents || []).includes(f?.drive_folder_id)) {
    return fail("That file did not arrive. Please try it again.", 409);
  }
  const { error } = await markUploadDone(row.id, file.id, Number(file.size) || row.size);
  if (error) throw new Error(error);
  return Response.json({ ok: true });
}

async function addLink(form, body) {
  const batch = String(body.batch || "");
  if (!BATCH_RE.test(batch)) return fail("Invalid request.");
  const url = cleanUrl(body.url);
  if (!url) return fail("That does not look like a link.");
  const { count } = await svc().from("sprout_media_uploads")
    .select("id", { count: "exact", head: true }).eq("batch_id", batch).eq("kind", "link");
  if ((count ?? 0) >= MAX_LINKS) return fail(`You can add up to ${MAX_LINKS} links at a time.`);

  const access = await linkAccess(url);
  if (access === "private") {
    return fail("This link is private, so we can't open it. Change its sharing to \"Anyone with the link\", then add it again.", 422, { private: true });
  }
  const out = await insertUpload(form, { batch_id: batch, kind: "link", status: "done", url });
  if (out.error) throw new Error(out.error);
  return Response.json({ id: out.id, url, checked: access === "open" });
}

async function finish(req, form, body) {
  const batch = String(body.batch || "");
  if (!BATCH_RE.test(batch)) return fail("Invalid request.");
  const sender = sanitizeSender(body.sender);
  const { rows, error } = await finishBatch(form, batch, sender);
  if (error) throw new Error(error);
  if (!rows.length) return fail("Add a photo, video or link first.");

  // Awaited (serverless stops once we answer) but caught: a failed alert must never
  // fail a guest's send.
  try {
    const { data: f } = await svc().from("sprout_media_forms").select("drive_folder_id").eq("id", form.id).maybeSingle();
    await notifyGuestMedia({
      sender, rows, event: await mediaEvent(form.event_id),
      folderId: f?.drive_folder_id, origin: new URL(req.url).origin,
    });
  } catch (e) {
    console.error("media — notification email failed:", e?.message || e);
  }
  return Response.json({ ok: true, count: rows.length });
}
