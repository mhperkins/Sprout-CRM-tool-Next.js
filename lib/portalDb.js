// lib/portalDb.js — SERVER ONLY. Never import this from a client component.
//
// The events portal is public: clients reach it with a secret token and no login.
// The CRM's tables are locked to `authenticated`, so every portal read/write goes
// through the API routes using the service-role key. The token is the only
// credential, and it scopes access to exactly one event's portal row.

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { validateEvent } from "./schemas";
import { portalToEventPatch, pickOrganizer, portalSeedFromCRM } from "./eventPortal";

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

/**
 * Look a portal up by its secret token. Returns null when the token is unknown.
 * THROWS when the database itself fails (bad service key, paused project), so the
 * route can say "unavailable" instead of wrongly telling a client their link is dead.
 */
export async function portalByToken(token) {
  if (!token || typeof token !== "string" || token.length < 16) return null;
  const { data, error } = await svc()
    .from("sprout_event_portals")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) {
    console.error("portalByToken — lookup failed:", error.message);
    throw new Error("portal lookup failed");
  }
  return data ? mergePortal(data) : null;
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
    // Shared with the host: links and files, both theirs and Sprout's.
    links: (data.data?.links || []).map((l) => ({ id: l.id, label: l.label || "", url: l.url })),
    media: (data.data?.media || []).map((m) => ({ id: m.id, kind: m.kind, url: m.url, name: m.name || "", mime: m.mime || "", size: m.size ?? null })),
  };
}

/**
 * Read-modify-write the event's links/media for a host action. `mutate(event)`
 * returns { patch } or { error }. Validates through the app's Zod gate so the host
 * can never write a shape the CRM cannot read.
 * Returns { data: { links, media } } or { error, status }.
 */
export async function updateEventAssets(eventId, mutate) {
  const sb = svc();
  const { data: row } = await sb
    .from("sprout_events")
    .select("id,data,name,event_date,status")
    .eq("id", eventId)
    .maybeSingle();
  if (!row) return { error: "This event could not be found.", status: 404 };

  const current = { ...(row.data || {}), id: row.id, name: row.name, event_date: row.event_date, status: row.status };
  const res = mutate(current);
  if (res?.error) return { error: res.error, status: 400 };

  const merged = { ...current, ...res.patch };
  const { data: valid, error } = validateEvent(merged);
  if (error) return { error: "That could not be saved.", status: 400 };

  const { error: upErr } = await sb
    .from("sprout_events")
    .update({ updated_at: new Date().toISOString(), data: { ...merged, ...valid } })
    .eq("id", eventId);
  if (upErr) return { error: "We could not save that. Please try again.", status: 500 };

  const pub = (list, pick) => (list || []).map(pick);
  return {
    data: {
      links: pub(valid.links, (l) => ({ id: l.id, label: l.label || "", url: l.url })),
      media: pub(valid.media, (m) => ({ id: m.id, kind: m.kind, url: m.url, name: m.name || "", mime: m.mime || "", size: m.size ?? null })),
    },
  };
}

/**
 * What the CRM already knows about an event, shaped as portal answers: the event
 * itself, its organizer (see pickOrganizer), and the organizer's organization.
 */
export async function crmSeedForEvent(eventId) {
  const sb = svc();
  const { data: ev } = await sb.from("sprout_events").select("id,name,event_date,data").eq("id", eventId).maybeSingle();
  if (!ev) return {};
  const event = { ...(ev.data || {}), id: ev.id, name: ev.name, event_date: ev.event_date };

  let organizer = null;
  const ids = event.contact_ids || [];
  if (ids.length) {
    const { data: rows } = await sb
      .from("sprout_contacts")
      .select("id,first_name,last_name,email,data")
      .in("id", ids);
    const contacts = (rows || []).map((r) => ({
      ...(r.data || {}), id: r.id, first_name: r.first_name, last_name: r.last_name, email: r.email,
    }));
    organizer = pickOrganizer(event, contacts);
  }

  let org = null;
  const orgId = organizer?.org_ids?.[0] || organizer?.org_id;
  if (orgId) {
    const { data: o } = await sb.from("sprout_orgs").select("id,name,data").eq("id", orgId).maybeSingle();
    if (o) org = { ...(o.data || {}), id: o.id, name: o.name };
  }

  return portalSeedFromCRM({ event, organizer, org });
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
