// lib/services.js — The Brain
// All Supabase queries live here. CRMManager.jsx calls these functions
// instead of talking to Supabase directly.
// Step 3: fetchContacts only. Additional functions added in subsequent steps.

import { getSupabase } from "./supabase";

const supabase = getSupabase();

/* ─── Merge Helpers (lifted from CRMManager.jsx) ────────────────────────────── */

const mergeContact = (row) => ({
  ...row.data,
  id:                  row.id,
  org_id:              row.org_id,
  record_type:         row.record_type,
  first_name:          row.first_name,
  last_name:           row.last_name,
  email:               row.email,
  relationship_status: row.relationship_status,
  tier:                row.tier,
  next_action_date:    row.next_action_date,
  createdAt:           row.created_at,
});

/* ─── Contacts ───────────────────────────────────────────────────────────────── */

/**
 * Fetch all contacts from Supabase.
 * Returns { data: Contact[], error: string | null }
 */
export async function fetchContacts() {
  const { data: rows, error } = await supabase
    .from("sprout_contacts")
    .select("id,data,org_id,record_type,first_name,last_name,email,relationship_status,tier,next_action_date,created_at,updated_at");

  if (error && error.code !== "PGRST116") {
    return { data: [], error: error.message };
  }
  return { data: (rows ?? []).map(mergeContact), error: null };
}

/* ─── Orgs ───────────────────────────────────────────────────────────────────── */

const mergeOrg = (row) => ({
  ...row.data,
  id:                  row.id,
  name:                row.name,
  category:            row.category,
  relationship_status: row.relationship_status,
  tier:                row.tier,
  next_action_date:    row.next_action_date,
  createdAt:           row.created_at,
});

/**
 * Fetch all orgs from Supabase.
 * Returns { data: Org[], error: string | null }
 */
export async function fetchOrgs() {
  const { data: rows, error } = await supabase
    .from("sprout_orgs")
    .select("id,data,name,category,relationship_status,tier,next_action_date,created_at,updated_at");

  if (error && error.code !== "PGRST116") {
    return { data: [], error: error.message };
  }
  return { data: (rows ?? []).map(mergeOrg), error: null };
}