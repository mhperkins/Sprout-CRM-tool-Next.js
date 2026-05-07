// lib/services.js — The Brain
// All Supabase queries live here. CRMManager.jsx calls these functions
// instead of talking to Supabase directly.

import { getSupabase } from "./supabase";
import { validateContact, validateOrg, validateEvent } from "./schemas";

/* ─── Default Profile ────────────────────────────────────────────────────────── */

export const DEFAULT_PROFILE = {
  legalName:"Sprout Society Inc.", ein:"83-1298420", address:"449 Troutman St, Brooklyn NY 11237",
  website:"sproutsociety.org", founded:"2019", annualBudget:"", numStaff:"", numVolunteers:"",
  mission:"Building community and peer connection for mental wellness; combating the loneliness epidemic.",
  programs:"Free community space; peer support resources; fundraising support; online portal for community builders.",
  population:"Adults experiencing loneliness/isolation/depression; young adults 19–35; Brooklyn/NYC residents.",
  serviceArea:"Brooklyn, NY / New York City",
  igHandle:"@sproutsocietyorg", igUrl:"https://www.instagram.com/sproutsocietyorg/",
  newsletterPlatform:"", newsletterAudience:"",
  contactName:"", contactTitle:"", contactEmail:"", contactPhone:"",
};

/* ─── Merge Helpers ──────────────────────────────────────────────────────────── */

const mergeContact = (row) => ({
  ...row.data,
  id:                  row.id,
  org_id:              row.org_id,
  record_type:         row.record_type,
  first_name:          row.first_name,
  last_name:           row.last_name,
  email:               row.email,
  relationship_status: row.relationship_status,
  next_action_date:    row.next_action_date || null,
  createdAt:           row.created_at,
});

const mergeOrg = (row) => ({
  ...row.data,
  id:                  row.id,
  name:                row.name,
  category:            row.category,
  relationship_status: row.relationship_status,
  next_action_date:    row.next_action_date || null,
  createdAt:           row.created_at,
});

/* ─── Read: Contacts ─────────────────────────────────────────────────────────── */

export async function fetchContacts() {
  const supabase = getSupabase();
const { data: rows, error } = await supabase
    .from("sprout_contacts")
    .select("id,data,org_id,record_type,first_name,last_name,email,relationship_status,next_action_date,created_at,updated_at");

  if (error && error.code !== "PGRST116") {
    return { data: [], error: error.message };
  }
  return { data: (rows ?? []).map(mergeContact), error: null };
}

/* ─── Read: Orgs ─────────────────────────────────────────────────────────────── */

export async function fetchOrgs() {
  const supabase = getSupabase();
  const { data: rows, error } = await supabase
    .from("sprout_orgs")
    .select("id,data,name,category,relationship_status,next_action_date,created_at,updated_at");

  if (error && error.code !== "PGRST116") {
    return { data: [], error: error.message };
  }
  return { data: (rows ?? []).map(mergeOrg), error: null };
}

/* ─── Read: Profile ──────────────────────────────────────────────────────────── */

/**
 * Fetch the single org profile row.
 * Uses .maybeSingle() — returns null (not 406) when no row exists.
 * Falls back to defaultProfile so the UI always has a safe initial state.
 */
export async function fetchProfile() {
  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from("sprout_profile")
    .select("id,data")
    .eq("id", "profile")
    .maybeSingle();

  if (error) {
    console.error("fetchProfile:", error);
    return { data: DEFAULT_PROFILE, error: error.message };
  }
  return { data: row?.data ?? DEFAULT_PROFILE, error: null };
}

/* ─── Write: Contacts ────────────────────────────────────────────────────────── */

/**
 * Upsert all contacts. Validates each record with Zod before writing.
 * Invalid records are logged and skipped — they do NOT block valid ones.
 * Returns { error: string | null }
 */
export async function saveContacts(contacts) {
  const rows = [];
  for (const c of contacts) {
    const normalized = (!c.id || c.id.startsWith("ind_")) ? c : { ...c, id: `ind_${c.id}` };
    const { data, error } = validateContact(normalized);
    if (error) { console.warn("saveContacts — invalid record skipped:", normalized.id, error); continue; }
rows.push({
      id:                  data.id,
      org_id:              data.org_id || null,
      record_type:         data.record_type,
      first_name:          data.first_name,
      last_name:           data.last_name,
      email:               data.email || null,
      relationship_status: data.relationship_status,
      next_action_date:    ((data.next_actions??[]).filter(a=>!a.completed&&a.date).sort((a,b)=>a.date.localeCompare(b.date))[0]?.date || data.next_action_date || null),
      updated_at:          new Date().toISOString(),
      data:                { ...c, ...data },
    });
  }
  if (!rows.length) return { error: null };
  const supabase = getSupabase();
  const { error } = await supabase
    .from("sprout_contacts")
    .upsert(rows, { onConflict: "id" });
  return { error: error?.message ?? null };
}

/* ─── Write: Orgs ────────────────────────────────────────────────────────────── */

/**
 * Upsert all orgs. Validates each record with Zod before writing.
 * Returns { error: string | null }
 */
export async function saveOrgs(orgs) {
  const rows = [];
  for (const o of orgs) {
    const normalized = (!o.id || o.id.startsWith("org_")) ? o : { ...o, id: `org_${o.id}` };
    const { data, error } = validateOrg(normalized);
    if (error) { console.warn("saveOrgs — invalid record skipped:", normalized.id, error); continue; }
    rows.push({
      id:                  data.id,
      name:                data.name,
      category:            data.category,
      relationship_status: data.relationship_status,
      next_action_date:    data.next_action_date || null,
      updated_at:          new Date().toISOString(),
      data:                { ...o, ...data },
    });
  }
  if (!rows.length) return { error: null };
  const supabase = getSupabase();
  const { error } = await supabase
    .from("sprout_orgs")
    .upsert(rows, { onConflict: "id" });
  return { error: error?.message ?? null };
}

/* ─── Write: Profile ─────────────────────────────────────────────────────────── */

/**
 * Upsert the single profile row.
 * Returns { error: string | null }
 */
export async function saveProfile(profile) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("sprout_profile")
    .upsert({ id: "profile", data: profile, updated_at: new Date().toISOString() }, { onConflict: "id" });
  return { error: error?.message ?? null };
}

/* ─── Delete: Contact ────────────────────────────────────────────────────────── */

/**
 * Hard-delete a single contact by ID.
 * Returns { error: string | null }
 */
export async function deleteContactById(id) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("sprout_contacts")
    .delete()
    .eq("id", id);
  return { error: error?.message ?? null };
}

/* ─── Delete: Org ────────────────────────────────────────────────────────────── */

/**
 * Hard-delete a single org by ID.
 * Returns { error: string | null }
 */
export async function deleteOrgById(id) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("sprout_orgs")
    .delete()
    .eq("id", id);
  return { error: error?.message ?? null };
}

/* ─── Merge Helper: Events ───────────────────────────────────────────────────── */

const mergeEvent = (row) => ({
  ...row.data,
  id:         row.id,
  name:       row.name,
  event_date: row.event_date,
  status:     row.status,
  createdAt:  row.created_at,
});

/* ─── Read: Events ───────────────────────────────────────────────────────────── */

export async function fetchEvents() {
  const supabase = getSupabase();
  const { data: rows, error } = await supabase
    .from("sprout_events")
    .select("id,data,name,event_date,status,created_at,updated_at");

  if (error && error.code !== "PGRST116") {
    return { data: [], error: error.message };
  }
  return { data: (rows ?? []).map(mergeEvent), error: null };
}

/* ─── Write: Events ──────────────────────────────────────────────────────────── */

/**
 * Upsert all events. Validates each record with Zod before writing.
 * Invalid records are logged and skipped.
 * Returns { error: string | null }
 */
export async function saveEvents(events) {
  const rows = [];
  for (const e of events) {
    const normalized = (!e.id || e.id.startsWith("evt_")) ? e : { ...e, id: `evt_${e.id}` };
    const { data, error } = validateEvent(normalized);
    if (error) { console.warn("saveEvents — invalid record skipped:", normalized.id, error); continue; }
    rows.push({
      id:         data.id,
      name:       data.name,
      event_date: data.event_date || null,
      status:     data.status,
      updated_at: new Date().toISOString(),
      data:       { ...e, ...data },
    });
  }
  if (!rows.length) return { error: null };
  const supabase = getSupabase();
  const { error } = await supabase
    .from("sprout_events")
    .upsert(rows, { onConflict: "id" });
  return { error: error?.message ?? null };
}

/* ─── Delete: Event ──────────────────────────────────────────────────────────── */

/**
 * Hard-delete a single event by ID.
 * Returns { error: string | null }
 */
export async function deleteEventById(id) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("sprout_events")
    .delete()
    .eq("id", id);
  return { error: error?.message ?? null };
}
