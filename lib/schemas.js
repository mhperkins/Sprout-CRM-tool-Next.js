// lib/schemas.js — The Gatekeeper
// Validates all data before it enters the CRM.
// Import these in lib/services.js and anywhere data enters from outside (Import JSON).
// Requires: npm install zod

import { z } from "zod";

/* ─── Shared Sub-Schemas ─────────────────────────────────────────────────────── */

const TouchpointSchema = z.object({
  date:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  summary:          z.string().min(1),
  next_action:      z.string().optional().default(""),
  next_action_date: z.string().nullable().optional(),
});

const FinancialRelSchema = z.object({
  has_given:     z.boolean().default(false),
  total_given:   z.number().min(0).default(0),
  grant_history: z.array(z.any()).default([]),
});

/* ─── Contact (Individual) ───────────────────────────────────────────────────── */

export const ContactSchema = z.object({
  // SQL-promoted fields
  id:                  z.string().startsWith("ind_"),
  record_type:         z.literal("individual"),
  org_id:              z.string().nullable().optional(),
  first_name:          z.string().nullable().optional().transform(v => v ?? ""),
  last_name:           z.string().nullable().optional().transform(v => v ?? ""),
  email:               z.string().nullable().optional(),
  relationship_status: z.enum(["cold", "cool", "warm", "active"]).nullish().transform(v => v ?? "cold"),
  next_action_date:    z.string().nullable().optional(),

  // JSONB-only fields
  phone:                z.string().optional().default(""),
  website:              z.string().optional().default(""),
  instagram_handle:     z.string().optional().default(""),
  relationship_type:    z.enum([
    "music", "art", "event_host", "partner", "community_builder", "other",
  ]).nullish().optional(),
  other_description:    z.string().optional().default(""),
  notes:                z.string().optional().default(""),
  next_action:          z.string().optional().default(""),
  touchpoints:          z.array(TouchpointSchema).default([]),
  financial_relationship: FinancialRelSchema.optional(),
  createdAt:            z.string().optional(),
});

/* ─── Organization ───────────────────────────────────────────────────────────── */

export const OrgSchema = z.object({
  // SQL-promoted fields
  id:                  z.string().startsWith("org_"),
  record_type:         z.literal("organization"),
  name:                z.string().nullable().optional().transform(v => v ?? ""),
  category:            z.enum(["funder", "partner", "vendor", "media", "government"]).nullish().transform(v => v ?? "partner"),
  relationship_status: z.enum(["cold", "warm", "active", "lapsed"]).nullish().transform(v => v ?? "cold"),
  next_action_date:    z.string().nullable().optional(),

  // JSONB-only fields
  website:             z.string().optional().default(""),
  instagram_handle:    z.string().optional().default(""),
  phone:               z.string().optional().default(""),
  email:               z.string().optional().default(""),
  primary_contact_id:  z.string().startsWith("ind_").or(z.literal("")).nullable().optional(),
  notes:               z.string().optional().default(""),
  next_action:         z.string().optional().default(""),
  touchpoints:         z.array(TouchpointSchema).default([]),
  financial_relationship: FinancialRelSchema.optional(),
  createdAt:           z.string().optional(),
});

/* ─── Post ───────────────────────────────────────────────────────────────────── */

export const PostSchema = z.object({
  id:             z.string().min(1),
  platform:       z.enum(["ig", "nl"]),
  status:         z.enum(["draft", "scheduled", "published", "sent"]),
  scheduled_date: z.string().nullable().optional(),
  content:        z.string().optional().default(""),
  subject:        z.string().optional().default(""),
});

/* ─── Profile ────────────────────────────────────────────────────────────────── */

export const ProfileSchema = z.object({
  legalName:           z.string().optional().default(""),
  ein:                 z.string().optional().default(""),
  address:             z.string().optional().default(""),
  website:             z.string().optional().default(""),
  founded:             z.string().optional().default(""),
  annualBudget:        z.string().optional().default(""),
  numStaff:            z.string().optional().default(""),
  numVolunteers:       z.string().optional().default(""),
  mission:             z.string().optional().default(""),
  programs:            z.string().optional().default(""),
  population:          z.string().optional().default(""),
  serviceArea:         z.string().optional().default(""),
  igHandle:            z.string().optional().default(""),
  igUrl:               z.string().optional().default(""),
  newsletterPlatform:  z.string().optional().default(""),
  newsletterAudience:  z.string().optional().default(""),
  contactName:         z.string().optional().default(""),
  contactTitle:        z.string().optional().default(""),
  contactEmail:        z.string().optional().default(""),
  contactPhone:        z.string().optional().default(""),
});

/* ─── Event ──────────────────────────────────────────────────────────────────── */

export const EventSchema = z.object({
  // SQL-promoted fields
  id:         z.string().startsWith("evt_"),
  name:       z.string().nullable().optional().transform(v => v ?? ""),
  event_date: z.string().nullable().optional(),
  status:     z.enum(["upcoming", "completed", "cancelled"]).nullish().transform(v => v ?? "upcoming"),

  // JSONB-only fields
  location:    z.string().optional().default(""),
  description: z.string().optional().default(""),
  contact_ids: z.array(z.string()).default([]),
  tags:        z.array(z.string()).default([]),
  notes:       z.string().optional().default(""),
  createdAt:   z.string().optional(),
});

/* ─── Safe Parse Helpers ─────────────────────────────────────────────────────── */
// Use these instead of .parse() so errors don't crash the UI.
// Returns { data, error } — mirrors the Supabase response pattern.

export function validateContact(raw) {
  const result = ContactSchema.safeParse(raw);
  return result.success
    ? { data: result.data, error: null }
    : { data: null, error: result.error.flatten() };
}

export function validateOrg(raw) {
  const result = OrgSchema.safeParse(raw);
  return result.success
    ? { data: result.data, error: null }
    : { data: null, error: result.error.flatten() };
}

export function validateEvent(raw) {
  const result = EventSchema.safeParse(raw);
  return result.success
    ? { data: result.data, error: null }
    : { data: null, error: result.error.flatten() };
}