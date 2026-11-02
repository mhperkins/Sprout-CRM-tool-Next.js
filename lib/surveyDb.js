// lib/surveyDb.js — SERVER ONLY. Never import this from a client component.
//
// People reach their survey with a private per-person token and no login. The CRM's
// tables are locked to `authenticated`, so the API route uses the service-role key.
// The token is the only credential, and it scopes a request to exactly one invite.

import { randomBytes } from "crypto";
import { svc } from "./portalDb";
import { DEFAULT_SURVEYS, sanitizeSurvey } from "./surveyForm";

/**
 * Look an invite up by its token. Returns null when the token is unknown.
 * THROWS when the database itself fails, so the route can say "unavailable"
 * instead of wrongly telling someone their link is dead.
 */
export async function inviteByToken(token) {
  if (!token || typeof token !== "string" || token.length < 16) return null;
  const { data, error } = await svc()
    .from("sprout_survey_invites")
    .select("id,survey_id,name,email,event_ids,questions,answers,replied_at")
    .eq("token", token)
    .maybeSingle();
  if (error) {
    console.error("inviteByToken — lookup failed:", error.message);
    throw new Error("survey lookup failed");
  }
  return data || null;
}

/** The survey's current questions; the built-in defaults when it was never edited. */
export async function surveyById(id) {
  const { data, error } = await svc().from("sprout_surveys").select("id,audience,data").eq("id", id).maybeSingle();
  if (error) throw new Error("survey lookup failed");
  const audience = data?.audience || String(id).replace(/^svy_/, "");
  const def = data?.data ? sanitizeSurvey(data.data) : DEFAULT_SURVEYS[audience];
  if (!def) return null;
  return { id, audience, ...def };
}

/** The only event details a respondent sees: id, name, date. */
export async function inviteEvents(ids = []) {
  if (!ids.length) return [];
  const { data } = await svc().from("sprout_events").select("id,name,event_date,data").in("id", ids);
  return (data || [])
    .map((e) => ({ id: e.id, name: e.name, event_date: e.event_date, series: Boolean(e.data?.recurrence) }))
    .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)));
}

/** Replies made through one shared link in the last hour (a flood guard). */
export async function recentOpenReplies(open) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await svc().from("sprout_survey_invites")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", open.survey_id).not("replied_at", "is", null)
    .contains("event_ids", JSON.stringify(open.event_ids || [])) // event_ids is jsonb, so send JSON
    .gte("created_at", since);
  if (error) throw new Error("survey count failed");
  return count || 0;
}

/**
 * A submission through a shared link becomes its own replied invite with its own
 * token, so that person can reopen and change their answers. Returns { reply } or { error }.
 */
export async function createOpenReply(open, { name, email, answers, questions }) {
  const now = new Date().toISOString();
  const row = {
    id: `sinv_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`,
    survey_id: open.survey_id, token: randomBytes(16).toString("base64url"),
    contact_id: null, name, email, event_ids: open.event_ids || [],
    questions, answers, replied_at: now, created_at: now, updated_at: now,
  };
  const { error } = await svc().from("sprout_survey_invites").insert(row);
  return error ? { error: error.message } : { reply: row };
}

/** Returns { error }. */
export async function saveInviteAnswers(id, { answers, questions, firstReply }) {
  const now = new Date().toISOString();
  const patch = { answers, questions, updated_at: now };
  if (firstReply) patch.replied_at = now;
  const { error } = await svc().from("sprout_survey_invites").update(patch).eq("id", id);
  return { error: error?.message ?? null };
}
