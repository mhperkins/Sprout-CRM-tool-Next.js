// POST /api/cron/summaries — called every 15 minutes by pg_cron (job
// sprout-day-board-summaries). Decides whether a Sprout calendar email is due in New York
// time, claims it so it sends once, sends it, and gives the claim back if the send fails so
// the next check retries.
//
// Monday overview: Monday from 8am. Tomorrow reminder: every day from 9am, skipped when the
// next day has nothing on the Sprout calendar.
//
// Auth: pg_cron sends the Vault secret as a Bearer token; the route compares its sha256
// with sprout_cron_keys. The plaintext never leaves the database.

import { NextResponse } from "next/server";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { svc, hasServiceKey } from "@/lib/portalDb";
import { sendEmail } from "@/lib/notify";
import { fetchSproutEvents } from "@/lib/googleCalendar";
import { buildMondayOverview, buildTomorrowReminder, DAY_BOARD_TO } from "@/lib/dayBoardSummary";
import { etParts, addDays, weekdayIndex } from "@/lib/dayBoard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function authorized(req) {
  const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!tok) return false;
  const { data } = await svc().from("sprout_cron_keys").select("key_hash").eq("name", "summaries").maybeSingle();
  if (!data?.key_hash) return false;
  const a = Buffer.from(createHash("sha256").update(tok).digest("hex"));
  const b = Buffer.from(data.key_hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

const STALE_CLAIM_MS = 10 * 60 * 1000;

/** Claim a send. Returns the claim token, or null when it already went (or is going) out. */
async function claimSend(kind, period) {
  const claim = randomBytes(12).toString("hex");
  const row = { kind, period, claim_token: claim };
  let { error } = await svc().from("sprout_summary_sends").insert(row);
  if (error?.code === "23505") {
    // A run the platform killed mid-send never gave its claim back. Take over a claim that
    // never recorded a send and is older than any run could last, instead of skipping forever.
    const cutoff = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
    const { data: stale } = await svc().from("sprout_summary_sends").delete()
      .eq("kind", kind).eq("period", period).is("sent_at", null).lt("created_at", cutoff).select("claim_token");
    if (!stale?.length) return null;
    ({ error } = await svc().from("sprout_summary_sends").insert(row));
    if (error?.code === "23505") return null;
  }
  if (error) throw new Error("claim: " + error.message);
  return claim;
}

const alreadySent = async (kind, period) => {
  const { data } = await svc().from("sprout_summary_sends").select("sent_at").eq("kind", kind).eq("period", period).maybeSingle();
  return Boolean(data?.sent_at);
};

async function sendOnce(kind, period, build) {
  const claim = await claimSend(kind, period);
  if (!claim) return "already sent";
  try {
    const { subject, html } = await build();
    await sendEmail({ to: DAY_BOARD_TO, subject, html });
    await svc().from("sprout_summary_sends").update({ sent_at: new Date().toISOString() })
      .eq("kind", kind).eq("period", period).eq("claim_token", claim);
    return "sent";
  } catch (e) {
    await svc().from("sprout_summary_sends").delete().eq("kind", kind).eq("period", period).eq("claim_token", claim);
    console.error(`calendar email ${kind} ${period} failed:`, e?.message || e);
    return "failed, will retry";
  }
}

export async function POST(req) {
  if (!hasServiceKey()) return NextResponse.json({ error: "not configured" }, { status: 503 });
  if (!(await authorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = etParts();
  const out = {};

  try {
    if (weekdayIndex(now.date) === 0 && now.minutes >= 8 * 60) {
      out.monday = await sendOnce("monday", now.date, async () =>
        buildMondayOverview(now.date, await fetchSproutEvents(now.date, addDays(now.date, 6))));
    } else {
      out.monday = "not due";
    }

    if (now.minutes >= 9 * 60) {
      const day = addDays(now.date, 1);
      if (await alreadySent("tomorrow", day)) {
        out.tomorrow = "already sent";
      } else {
        const events = await fetchSproutEvents(day, day);
        out.tomorrow = events.length ? await sendOnce("tomorrow", day, () => buildTomorrowReminder(day, events)) : "nothing tomorrow";
      }
    } else {
      out.tomorrow = "not due";
    }
  } catch (e) {
    console.error("calendar emails:", e?.message || e);
    return NextResponse.json({ error: "check failed" }, { status: 500 });
  }

  return NextResponse.json(out);
}
