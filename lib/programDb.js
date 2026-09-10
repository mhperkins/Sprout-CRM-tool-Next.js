// lib/programDb.js — SERVER ONLY. Never import this from a client component.
//
// Participants reach the program form with a per-event secret token and no login. The
// CRM's tables are locked to `authenticated`, so the API route uses the service-role
// key. The form token scopes a request to one event; each submission gets its own
// edit key, so a participant can fix what they sent without seeing anyone else's.

import { randomBytes, timingSafeEqual } from "crypto";
import { svc, newToken } from "./portalDb";

export const newEntryId = () => `pge_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;

const sameKey = (a, b) => {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Look a form up by its token. Returns null when the token is unknown.
 * THROWS when the database itself fails, so the route can say "unavailable"
 * instead of wrongly telling a participant their link is dead.
 */
export async function programFormByToken(token) {
  if (!token || typeof token !== "string" || token.length < 16) return null;
  const { data, error } = await svc()
    .from("sprout_program_forms")
    .select("id,event_id")
    .eq("token", token)
    .maybeSingle();
  if (error) {
    console.error("programFormByToken — lookup failed:", error.message);
    throw new Error("program form lookup failed");
  }
  return data || null;
}

/** The only event details a participant sees: name, date, start time. */
export async function programEvent(eventId) {
  const { data } = await svc()
    .from("sprout_events")
    .select("id,name,event_date,data")
    .eq("id", eventId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name || "",
    event_date: data.event_date || "",
    start_time: data.data?.start_time || "",
  };
}

export async function recentEntryCount(eventId, sinceISO) {
  const { count } = await svc()
    .from("sprout_program_entries")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .gte("created_at", sinceISO);
  return count ?? 0;
}

/** Returns { id, edit_key } or { error }. */
export async function insertProgramEntry(eventId, data) {
  const id = newEntryId();
  const edit_key = newToken();
  const now = new Date().toISOString();
  const { error } = await svc()
    .from("sprout_program_entries")
    .insert({ id, event_id: eventId, edit_key, data, created_at: now, updated_at: now });
  if (error) return { error: error.message };
  return { id, edit_key };
}

/** A participant's own submission, only when the edit key matches. Otherwise null. */
export async function programEntryForEdit(eventId, id, key) {
  if (!id || !key) return null;
  const { data, error } = await svc()
    .from("sprout_program_entries")
    .select("id,data,edit_key")
    .eq("id", id)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error || !data || !sameKey(data.edit_key, key)) return null;
  return { id: data.id, data: data.data || {} };
}

/** Returns { error }. */
export async function updateProgramEntry(eventId, id, data) {
  const { error } = await svc()
    .from("sprout_program_entries")
    .update({ data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("event_id", eventId);
  return { error: error?.message ?? null };
}
