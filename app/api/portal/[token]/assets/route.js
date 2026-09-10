// POST /api/portal/[token]/assets — the host adds or removes links and files.
//
// These live on the event record itself (event.links / event.media), so they show
// up in the CRM's Links and Media tiles. Actions: add_link, remove_link, add_media,
// remove_media. Files are uploaded by the browser to the public event-portal-files
// bucket first; this route only records them, and only accepts URLs from that bucket.

import { randomBytes } from "crypto";
import { hasServiceKey, portalByToken, updateEventAssets } from "@/lib/portalDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LINKS = 40;
const MAX_MEDIA = 60;

const s = (v, n) => String(v ?? "").trim().slice(0, n);
const rid = () => randomBytes(6).toString("hex");
const fail = (error, status = 400) => Response.json({ error }, { status });

export async function POST(req, { params }) {
  if (!hasServiceKey()) return fail("Portal is not configured yet.", 503);

  const { token } = await params;
  let portal;
  try {
    portal = await portalByToken(token);
  } catch {
    return fail("The portal is temporarily unavailable. Please try again in a few minutes.", 503);
  }
  if (!portal) return fail("This link is not valid. Check with us for a fresh one.", 404);

  let body;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request.");
  }

  const bucketPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-portal-files/`;

  const result = await updateEventAssets(portal.event_id, (ev) => {
    let links = [...(ev.links || [])];
    let media = [...(ev.media || [])];

    switch (body?.action) {
      case "add_link": {
        let url = s(body.url, 1000);
        if (!url) return { error: "Add a link first." };
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        try { new URL(url); } catch { return { error: "That link does not look right." }; }
        if (links.length >= MAX_LINKS) return { error: "That is a lot of links. Put the rest in More details." };
        links.push({ id: rid(), label: s(body.label, 200) || url, url });
        break;
      }
      case "remove_link":
        links = links.filter((l) => l.id !== body.id);
        break;
      case "add_media": {
        const url = s(body.url, 1000);
        if (!url.startsWith(bucketPrefix)) return { error: "Upload the file first." };
        if (media.length >= MAX_MEDIA) return { error: "That is a lot of files. Share the rest as a Drive link." };
        const size = Number(body.size);
        media.push({
          id: rid(),
          kind: "file",
          url,
          name: s(body.name, 200) || "file",
          mime: s(body.mime, 100),
          size: Number.isFinite(size) ? size : null,
          note: "Added by the host through the portal",
          addedAt: new Date().toISOString(),
        });
        break;
      }
      case "remove_media":
        media = media.filter((m) => m.id !== body.id);
        break;
      default:
        return { error: "Unknown action." };
    }
    return { patch: { links, media } };
  });

  if (result.error) {
    if (result.status >= 500) console.error("portal assets — save failed:", result.error);
    return fail(result.error, result.status || 400);
  }
  return Response.json(result.data);
}
