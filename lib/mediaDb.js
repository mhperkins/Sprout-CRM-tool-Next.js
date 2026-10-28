// lib/mediaDb.js — SERVER ONLY. Never import this from a client component.
//
// Guests reach the media upload link with a per-event secret token and no login.
// The CRM's tables are locked to `authenticated`, so the API route uses the
// service-role key. The token scopes every request to one event.

import { randomBytes } from "crypto";
import { svc } from "./portalDb";
import { createEventFolder, trashFolder } from "./googleDrive";

export const newUploadId = () => `mdu_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;

/**
 * Look a link up by its token. Returns null when the token is unknown.
 * THROWS when the database itself fails, so the route can say "unavailable"
 * instead of wrongly telling a guest their link is dead.
 */
export async function mediaFormByToken(token) {
  if (!token || typeof token !== "string" || token.length < 16) return null;
  const { data, error } = await svc()
    .from("sprout_media_forms")
    .select("id,event_id,drive_folder_id")
    .eq("token", token)
    .maybeSingle();
  if (error) {
    console.error("mediaFormByToken — lookup failed:", error.message);
    throw new Error("media form lookup failed");
  }
  return data || null;
}

/** The only event details a guest sees: name and date. */
export async function mediaEvent(eventId) {
  const { data } = await svc().from("sprout_events").select("id,name,event_date").eq("id", eventId).maybeSingle();
  return data ? { id: data.id, name: data.name || "", event_date: data.event_date || "" } : null;
}

/**
 * The event's Drive folder, made on the first upload. Two guests starting at once
 * could both make one; the database keeps the first and the loser trashes its own.
 */
export async function ensureFolder(form) {
  if (form.drive_folder_id) return form.drive_folder_id;
  const event = await mediaEvent(form.event_id);
  const made = await createEventFolder(event || { id: form.event_id });
  const { data } = await svc()
    .from("sprout_media_forms")
    .update({ drive_folder_id: made, updated_at: new Date().toISOString() })
    .eq("id", form.id)
    .is("drive_folder_id", null)
    .select("drive_folder_id")
    .maybeSingle();
  if (data?.drive_folder_id) return data.drive_folder_id;
  await trashFolder(made);
  const { data: again } = await svc().from("sprout_media_forms").select("drive_folder_id").eq("id", form.id).maybeSingle();
  return again?.drive_folder_id || made;
}

export async function recentStartCount(formId, sinceISO) {
  const { count } = await svc()
    .from("sprout_media_uploads")
    .select("id", { count: "exact", head: true })
    .eq("form_id", formId)
    .gte("created_at", sinceISO);
  return count ?? 0;
}

/** Returns { id } or { error }. */
export async function insertUpload(form, row) {
  const id = newUploadId();
  const now = new Date().toISOString();
  const { error } = await svc().from("sprout_media_uploads").insert({
    id, event_id: form.event_id, form_id: form.id, created_at: now, updated_at: now, ...row,
  });
  return error ? { error: error.message } : { id };
}

/** One upload row, only when it belongs to this link. */
export async function uploadForForm(form, id) {
  if (!id || typeof id !== "string") return null;
  const { data } = await svc()
    .from("sprout_media_uploads")
    .select("id,batch_id,kind,status,name,size")
    .eq("id", id)
    .eq("form_id", form.id)
    .maybeSingle();
  return data || null;
}

export async function markUploadDone(id, driveFileId, size) {
  const { error } = await svc()
    .from("sprout_media_uploads")
    .update({ status: "done", drive_file_id: driveFileId, size, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

/** Stamp the sender on every row of a send; returns the finished rows. */
export async function finishBatch(form, batchId, sender) {
  const { data, error } = await svc()
    .from("sprout_media_uploads")
    .update({ sender, updated_at: new Date().toISOString() })
    .eq("form_id", form.id)
    .eq("batch_id", batchId)
    .eq("status", "done")
    .select("id,kind,name,size,url,drive_file_id");
  return { rows: data || [], error: error?.message ?? null };
}
