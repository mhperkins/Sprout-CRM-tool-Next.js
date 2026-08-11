// lib/portalDb.js — SERVER ONLY. Never import this from a client component.
//
// The events portal is public: clients reach it with a secret token and no login.
// The CRM's tables are locked to `authenticated`, so every portal read/write goes
// through the API routes using the service-role key. The token is the only
// credential, and it scopes access to exactly one event's portal row.

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { validateEvent } from "./schemas";
import { portalToEventPatch } from "./eventPortal";

let _client = null;

/** Service-role client. Bypasses RLS — only ever reachable from a route handler. */
export function svc() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  _client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _client;
}

export const hasServiceKey = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/* ─── ids + tokens ───────────────────────────────────────────────────────────── */

const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

/** 128 bits of entropy, url-safe. This is the only thing protecting a portal. */
export const newToken = () => randomBytes(16).toString("base64url");

export const newPortalId = () =>
  `epl_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;

/** Human-readable event id, matching the CRM convention (evt_spring_gala_2026). */
export async function newEventId(name) {
  const base = slug(name) || "event";
  const sb = svc();
  for (let i = 0; i < 6; i++) {
    const id = i === 0 ? `evt_${base}` : `evt_${base}_${randomBytes(2).toString("hex")}`;
    const { data } = await sb.from("sprout_events").select("id").eq("id", id).maybeSingle();
    if (!data) return id;
  }
  return `evt_${base}_${Date.now().toString(36)}`;
}

/* ─── portal row shape ───────────────────────────────────────────────────────── */

export const mergePortal = (row) => ({
  id: row.id,
  event_id: row.event_id,
  token: row.token,
  status: row.status,
  submitted_at: row.submitted_at,
  data: row.data || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Look a portal up by its secret token. Returns null when the token is unknown. */
export async function portalByToken(token) {
  if (!token || typeof token !== "string" || token.length < 16) return null;
  const { data, error } = await svc()
    .from("sprout_event_portals")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  return mergePortal(data);
}

/** The slice of the event a client is allowed to see on their own portal page. */
export async function publicEvent(eventId) {
  const { data } = await svc()
    .from("sprout_events")
    .select("id,name,event_date,status,data")
    .eq("id", eventId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name || "",
    event_date: data.event_date || "",
    status: data.status || "pending",
    location: data.data?.location || "",
    start_time: data.data?.start_time || "",
    end_time: data.data?.end_time || "",
  };
}

/* ─── writes ─────────────────────────────────────────────────────────────────── */

/** Persist portal answers. Returns { error }. */
export async function savePortalData(portalId, data, patch = {}) {
  const { error } = await svc()
    .from("sprout_event_portals")
    .update({ data: data || {}, updated_at: new Date().toISOString(), ...patch })
    .eq("id", portalId);
  return { error: error?.message ?? null };
}

/**
 * Push the portal's own answers onto the linked CRM event (name/date/times/
 * description). Read-modify-write through the same Zod gate the app uses, so a
 * portal can never write a shape the CRM cannot read. Never clears an event field
 * the portal left blank.
 */
export async function syncEventFromPortal(eventId, data) {
  const sb = svc();
  const { data: row } = await sb
    .from("sprout_events")
    .select("id,data,name,event_date,status")
    .eq("id", eventId)
    .maybeSingle();
  if (!row) return { error: "event not found" };

  const current = { ...(row.data || {}), id: row.id, name: row.name, event_date: row.event_date, status: row.status };
  const merged = { ...current, ...portalToEventPatch(data) };
  const { data: valid, error } = validateEvent(merged);
  if (error) return { error: "event failed validation" };

  const { error: upErr } = await sb.from("sprout_events").upsert(
    {
      id: valid.id,
      name: valid.name,
      event_date: valid.event_date || null,
      status: valid.status,
      updated_at: new Date().toISOString(),
      data: { ...merged, ...valid },
    },
    { onConflict: "id" }
  );
  return { error: upErr?.message ?? null };
}
