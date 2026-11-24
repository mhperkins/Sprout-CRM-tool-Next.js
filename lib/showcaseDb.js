// lib/showcaseDb.js — SERVER ONLY. Never import this from a client component.
//
// The /submit form is a standing public link with no login, so the API route writes
// with the service-role key. Nothing here reads or writes sprout_contacts: a
// submission is inert until staff accept it (or add a started one to the mailing
// list) in the CRM.
//
// Two steps: step 1 saves a 'started' row with a private token (that is how we keep
// the email even if they never finish); step 2 finishes it ('new'). The token is the
// only credential for reopening a row, so it is never listed or returned elsewhere.

import { randomBytes } from "crypto";
import { svc, newToken } from "./portalDb";
import { REMINDER_DAYS } from "./showcaseForm";

const T = "sprout_showcase_applications";

export const newApplicationId = () =>
  `shw_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;

/** How many rows arrived since `sinceISO`. Guards against a flood. */
export async function recentApplicationCount(sinceISO) {
  const { count, error } = await svc()
    .from(T)
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceISO);
  if (error) {
    console.error("recentApplicationCount failed:", error.message);
    throw new Error("showcase count failed");
  }
  return count ?? 0;
}

/** Same person sending the same thing twice in a row. Their second send is a no-op. */
export async function duplicateRecently(email, sinceISO) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean) return false;
  const { data } = await svc()
    .from(T)
    .select("id")
    .neq("status", "started")
    .ilike("email", clean)
    .gte("created_at", sinceISO)
    .limit(1);
  return Boolean(data?.length);
}

/** One-shot submit (old cached /showcase pages). Returns { id } or { error }. */
export async function insertApplication(data) {
  const id = newApplicationId();
  const now = new Date().toISOString();
  const { error } = await svc().from(T).insert({
    id, status: "new", name: data.name || "", email: data.email || "", role: data.role || "",
    data, created_at: now, updated_at: now,
  });
  if (error) return { error: error.message };
  return { id };
}

/**
 * Step 1. Saves a 'started' row and returns its token. If this email already has an
 * unfinished row from the last 30 days, that row is reused (fresh answers win), so
 * pressing Next twice or coming back later never makes a second row.
 * Returns { token } or { error }.
 */
export async function startApplication(data) {
  const email = String(data.email || "").trim().toLowerCase();
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
  const db = svc();
  const now = new Date().toISOString();

  const { data: open, error: findErr } = await db
    .from(T).select("id,token,data").eq("status", "started").ilike("email", email)
    .gte("created_at", monthAgo).order("created_at", { ascending: false }).limit(1);
  if (findErr) return { error: findErr.message };

  if (open?.length && open[0].token) {
    const row = open[0];
    const merged = { ...(row.data || {}), name: data.name, email: data.email, role: data.role };
    const { error } = await db.from(T)
      .update({ name: data.name, email: data.email, role: data.role, data: merged, updated_at: now })
      .eq("id", row.id);
    if (error) return { error: error.message };
    return { token: row.token, resumed: true };
  }

  const token = newToken();
  const { error } = await db.from(T).insert({
    id: newApplicationId(), status: "started", token,
    name: data.name, email: data.email, role: data.role,
    data: { name: data.name, email: data.email, role: data.role },
    created_at: now, updated_at: now,
  });
  if (error) return { error: error.message };
  return { token };
}

/** A row by its private token, or null. THROWS on a database failure. */
export async function applicationByToken(token) {
  if (!token || typeof token !== "string" || token.length < 16 || token.length > 64) return null;
  const { data, error } = await svc().from(T).select("id,status,data").eq("token", token).maybeSingle();
  if (error) {
    console.error("applicationByToken failed:", error.message);
    throw new Error("lookup failed");
  }
  return data || null;
}

/**
 * Step 2. Finishes a started row. The claim is the status filter: only a row still
 * 'started' moves to 'new', so a double-click cannot send Max two alerts. created_at
 * moves to the finish time so the New tab lists it as just arrived.
 * Returns { ok, finished } (finished=false when it was already sent) or { error }.
 */
export async function finishApplication(id, data) {
  const now = new Date().toISOString();
  const { data: rows, error } = await svc().from(T)
    .update({
      status: "new", name: data.name || "", email: data.email || "", role: data.role || "",
      data, created_at: now, updated_at: now,
    })
    .eq("id", id).eq("status", "started").select("id");
  if (error) return { error: error.message };
  return { ok: true, finished: Boolean(rows?.length) };
}

/**
 * Started rows owed a reminder. `due` = how many reminder days have passed; a row is
 * owed one when due > reminders_sent. Claiming jumps the count straight to `due`, so a
 * row that missed day 3 gets ONE email at day 14, never two back to back.
 */
export async function dueReminders(now = Date.now()) {
  const { data, error } = await svc().from(T)
    .select("id,token,name,email,reminders_sent,created_at")
    .eq("status", "started").not("token", "is", null).lt("reminders_sent", REMINDER_DAYS.length);
  if (error) throw new Error(error.message);
  return (data || [])
    .map((r) => {
      const days = (now - new Date(r.created_at).getTime()) / 86400_000;
      return { ...r, due: REMINDER_DAYS.filter((d) => days >= d).length };
    })
    .filter((r) => r.due > r.reminders_sent);
}

/** Claim a reminder (only if nobody else moved the count). True when this run owns it. */
export async function claimReminder(row) {
  const { data } = await svc().from(T)
    .update({ reminders_sent: row.due, last_reminded_at: new Date().toISOString() })
    .eq("id", row.id).eq("status", "started").eq("reminders_sent", row.reminders_sent).select("id");
  return Boolean(data?.length);
}

/** Give a claim back after a failed send, so the next run retries. */
export async function releaseReminder(row) {
  await svc().from(T)
    .update({ reminders_sent: row.reminders_sent })
    .eq("id", row.id).eq("reminders_sent", row.due);
}
