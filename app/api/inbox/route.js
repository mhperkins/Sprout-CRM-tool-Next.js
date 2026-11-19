// app/api/inbox/route.js — staff only. Inbox › Email: both Gmail inboxes (real people,
// waiting on you or on them) + logged Instagram outreach replies, with Pin / Completed /
// Ignore marks applied. Read-only on Gmail; marks are written by the client to
// sprout_inbox_triage.
import { requireStaff } from "@/lib/staffAuth";
import { fetchInbox } from "@/lib/inboxWatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req) {
  const denied = await requireStaff(req);
  if (denied) return denied;
  try {
    const items = await fetchInbox();
    return Response.json({ items, checkedAt: new Date().toISOString() });
  } catch (e) {
    console.error("inbox check failed:", e);
    return Response.json({ error: "Couldn't check the inboxes. Try ↻ again in a minute." }, { status: 502 });
  }
}
