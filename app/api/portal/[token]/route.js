// /api/portal/[token] — the client's own portal.
//
//   GET  load the portal + the slice of the event they are allowed to see
//   PUT  save answers (autosave); also pushes name/date/times onto the CRM event
//   POST mark the portal submitted ("everything you have is in")
//
// The token IS the credential. It scopes every operation to one portal row, so a
// client can never read or write another booking. An unknown token always 404s
// with the same message, so the endpoint cannot be used to probe for valid links.

import { sanitizePortalData, portalProgress } from "@/lib/eventPortal";
import { hasServiceKey, portalByToken, publicEvent, savePortalData, syncEventFromPortal } from "@/lib/portalDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = () =>
  Response.json({ error: "This link is not valid. Check with us for a fresh one." }, { status: 404 });

async function load(params) {
  if (!hasServiceKey()) return { fail: Response.json({ error: "Portal is not configured yet." }, { status: 503 }) };
  const { token } = await params;
  const portal = await portalByToken(token);
  if (!portal) return { fail: NOT_FOUND() };
  return { portal };
}

export async function GET(_req, { params }) {
  const { portal, fail } = await load(params);
  if (fail) return fail;
  const event = await publicEvent(portal.event_id);
  return Response.json({
    portal: { status: portal.status, submitted_at: portal.submitted_at, data: portal.data, updatedAt: portal.updatedAt },
    event,
    progress: portalProgress(portal.data),
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

  return Response.json({ ok: true, savedAt: new Date().toISOString(), progress: portalProgress(data) });
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

  return Response.json({ ok: true, status: "submitted", submitted_at: now, progress: portalProgress(data) });
}
