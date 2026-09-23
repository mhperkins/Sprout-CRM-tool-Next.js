// /api/portal/[token] — the client's own portal.
//
//   GET  load the portal + the slice of the event they are allowed to see
//   PUT  save answers (autosave); also pushes name/date/times onto the CRM event
//   POST mark the portal submitted ("everything you have is in")
//
// The token IS the credential. It scopes every operation to one portal row, so a
// client can never read or write another booking. An unknown token always 404s
// with the same message, so the endpoint cannot be used to probe for valid links.

import { sanitizePortalData, portalProgress, fillBlanks } from "@/lib/eventPortal";
import { hasServiceKey, portalByToken, publicEvent, savePortalData, syncEventFromPortal, crmSeedForEvent, markPortalAlerted } from "@/lib/portalDb";
import { notifyPortalActivity } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = () =>
  Response.json({ error: "This link is not valid. Check with us for a fresh one." }, { status: 404 });

async function load(params) {
  if (!hasServiceKey()) return { fail: Response.json({ error: "Portal is not configured yet." }, { status: 503 }) };
  const { token } = await params;
  let portal;
  try {
    portal = await portalByToken(token);
  } catch {
    return { fail: Response.json({ error: "The portal is temporarily unavailable. Please try again in a few minutes." }, { status: 503 }) };
  }
  if (!portal) return { fail: NOT_FOUND() };
  return { portal };
}

// The portal autosaves, so an alert per save would flood the inbox. Edits alert at
// most once every 12 hours per portal; a submit always alerts. Awaited because
// serverless stops the function once the response is sent, but caught: a failed
// email must never fail a host's save.
const ALERT_EVERY_MS = 12 * 3600_000;

const alertDue = (portal) => {
  const last = portal?.alerted_at ? Date.parse(portal.alerted_at) : 0;
  return !last || Date.now() - last >= ALERT_EVERY_MS;
};

async function alertStaff(req, portal, data, progress, submitted) {
  try {
    const event = await publicEvent(portal.event_id);
    await notifyPortalActivity({
      portal: { ...portal, data },
      event,
      progress,
      origin: new URL(req.url).origin,
      submitted,
    });
    await markPortalAlerted(portal.id);
  } catch (e) {
    console.error("portal — notification email failed:", e?.message || e);
  }
}

export async function GET(_req, { params }) {
  const { portal, fail } = await load(params);
  if (fail) return fail;

  // Prefill blank answers with what the CRM already knows (event, organizer, their
  // org). Blanks only, so nothing the host typed is ever overwritten. A failure here
  // never blocks the portal from loading.
  let data = portal.data;
  try {
    const filled = fillBlanks(data, sanitizePortalData(await crmSeedForEvent(portal.event_id)));
    if (filled.changed) {
      const { error } = await savePortalData(portal.id, filled.data);
      if (!error) data = filled.data;
    }
  } catch (e) {
    console.error("portal GET — prefill failed:", e?.message);
  }

  const event = await publicEvent(portal.event_id);
  return Response.json({
    portal: { status: portal.status, submitted_at: portal.submitted_at, data, updatedAt: portal.updatedAt },
    event,
    progress: portalProgress(data),
  });
}

export async function PUT(req, { params }) {
  const { portal, fail } = await load(params);
  if (fail) return fail;

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const data = sanitizePortalData(body?.data);
  const { error } = await savePortalData(portal.id, data);
  if (error) {
    console.error("portal PUT — save failed:", error);
    return Response.json({ error: "We could not save that. Please try again." }, { status: 500 });
  }

  // Keep the CRM event in step with the answers that define it.
  await syncEventFromPortal(portal.event_id, data);

  const progress = portalProgress(data);
  if (alertDue(portal)) await alertStaff(req, portal, data, progress, false);

  return Response.json({ ok: true, savedAt: new Date().toISOString(), progress });
}

export async function POST(req, { params }) {
  const { portal, fail } = await load(params);
  if (fail) return fail;

  let body = {};
  try {
    body = await req.json();
  } catch { /* submit with no body is fine */ }

  const data = body?.data ? sanitizePortalData(body.data) : portal.data;
  const now = new Date().toISOString();
  const { error } = await savePortalData(portal.id, data, { status: "submitted", submitted_at: now });
  if (error) {
    console.error("portal POST — submit failed:", error);
    return Response.json({ error: "We could not submit that. Please try again." }, { status: 500 });
  }
  await syncEventFromPortal(portal.event_id, data);

  const progress = portalProgress(data);
  await alertStaff(req, portal, data, progress, true);

  return Response.json({ ok: true, status: "submitted", submitted_at: now, progress });
}
