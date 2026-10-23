// lib/galleryDb.js — SERVER ONLY. Never import this from a client component.
//
// The gallery form is reached with a secret token and no login, so the API route uses
// the service-role key (same model as lib/programDb.js). Each submission gets its own
// edit key so an artist can fix what they sent without seeing anyone else's.

import { randomBytes, timingSafeEqual } from "crypto";
import { svc, newToken } from "./portalDb";

const newEntryId = () => `gle_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;

const sameKey = (a, b) => {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
};

/** A form by token, or null. THROWS on a database failure (route answers "unavailable"). */
export async function galleryFormByToken(token) {
  if (!token || typeof token !== "string" || token.length < 16) return null;
  const { data, error } = await svc()
    .from("sprout_gallery_forms")
    .select("id,kind,event_id,token")
    .eq("token", token)
    .maybeSingle();
  if (error) {
    console.error("galleryFormByToken — lookup failed:", error.message);
    throw new Error("gallery form lookup failed");
  }
  return data || null;
}

/** The standing open-call form (the link /submit sends). */
export async function openCallForm() {
  const { data, error } = await svc()
    .from("sprout_gallery_forms")
    .select("id,kind,event_id,token")
    .eq("kind", "open")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

/** The only event details an artist sees: name, date. */
export async function galleryEvent(eventId) {
  if (!eventId) return null;
  const { data } = await svc().from("sprout_events").select("id,name,event_date").eq("id", eventId).maybeSingle();
  return data ? { id: data.id, name: data.name || "", event_date: data.event_date || "" } : null;
}

export async function recentGalleryCount(formId, sinceISO) {
  const { count } = await svc()
    .from("sprout_gallery_entries")
    .select("id", { count: "exact", head: true })
    .eq("form_id", formId)
    .gte("created_at", sinceISO);
  return count ?? 0;
}

/** Returns { id, edit_key } or { error }. */
export async function insertGalleryEntry(form, data) {
  const id = newEntryId();
  const edit_key = newToken();
  const now = new Date().toISOString();
  const { error } = await svc().from("sprout_gallery_entries").insert({
    id, form_id: form.id, event_id: form.event_id || null, edit_key, data, created_at: now, updated_at: now,
  });
  if (error) return { error: error.message };
  return { id, edit_key };
}

/** An artist's own submission, only when the edit key matches. Otherwise null. */
export async function galleryEntryForEdit(formId, id, key) {
  if (!id || !key) return null;
  const { data, error } = await svc()
    .from("sprout_gallery_entries")
    .select("id,data,edit_key")
    .eq("id", id)
    .eq("form_id", formId)
    .maybeSingle();
  if (error || !data || !sameKey(data.edit_key, key)) return null;
  return { id: data.id, data: data.data || {} };
}

export async function updateGalleryEntry(formId, id, data) {
  const { error } = await svc()
    .from("sprout_gallery_entries")
    .update({ data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("form_id", formId);
  return { error: error?.message ?? null };
}
