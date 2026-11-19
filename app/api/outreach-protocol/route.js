// app/api/outreach-protocol/route.js — staff only. Serves the Instagram outreach playbook
// straight from the repo (docs/guides/ig-outreach-protocol.md) so the Protocol tab can never
// drift from the file Claude keeps up to date.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { requireStaff } from "@/lib/staffAuth";

export const runtime = "nodejs";

export async function GET(req) {
  const denied = await requireStaff(req);
  if (denied) return denied;
  try {
    const markdown = await readFile(join(process.cwd(), "docs", "guides", "ig-outreach-protocol.md"), "utf8");
    return Response.json({ markdown });
  } catch (e) {
    console.error("outreach protocol read failed:", e);
    return Response.json({ error: "Couldn't load the playbook file." }, { status: 500 });
  }
}
