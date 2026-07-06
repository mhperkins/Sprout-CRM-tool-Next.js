// app/api/outreach/route.js — serves the Outreach Manager virtual-employee's
// artifacts (research briefs, sprints, deliverables ledger) to the in-app
// Outreach workspace. Read-only; reads the markdown files straight from the repo.
// The files are bundled into this function on Vercel via `outputFileTracingIncludes`
// in next.config.mjs — without that, non-imported files aren't traced and the
// fs reads fail in production.

import { readFile, readdir } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = join(process.cwd(), "virtual-agency", "employees", "Outreach");

function firstHeading(md) {
  const m = String(md || "").match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

async function readFolder(sub) {
  try {
    const dir = join(ROOT, sub);
    const files = (await readdir(dir))
      .filter((f) => f.toLowerCase().endsWith(".md"))
      .sort();
    const docs = [];
    for (const f of files) {
      const md = await readFile(join(dir, f), "utf8");
      docs.push({ file: f, title: firstHeading(md) || f.replace(/\.md$/i, ""), md });
    }
    return docs;
  } catch {
    return [];
  }
}

async function readOne(rel) {
  try {
    return await readFile(join(ROOT, rel), "utf8");
  } catch {
    return "";
  }
}

export async function GET() {
  const [briefs, sprints] = await Promise.all([
    readFolder("briefs"),
    readFolder("sprints"),
  ]);
  const workLog = await readOne("work-log.md");
  const jobDesc = await readOne("outreach-manager-jobDescription.md");

  return Response.json({ briefs, sprints, workLog, jobDesc });
}
