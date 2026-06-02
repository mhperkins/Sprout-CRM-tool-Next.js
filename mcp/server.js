// mcp/server.js — Sprout CRM MCP Server
// Exposes live Supabase data as tools Claude can call mid-conversation.
// Transport: stdio (runs locally, connects via claude_desktop_config.json)

import { config } from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
// Reuse the app's Zod validators so the MCP and web app share one source of
// truth. schemas.js imports only `zod` (no browser Supabase client), so it is
// safe here. Do NOT import lib/services.js — it pulls in the anon client.
import { validateContact, validateOrg } from "../lib/schemas.js";

// Load env from this directory's .env regardless of the process CWD.
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, ".env") });

// ── Supabase client (service role — bypasses RLS) ────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Overdue logic — matches CRMManager.jsx exactly ──────────────────────────

const CADENCE = { active: 30, warm: 90, cool: 120, cold: 180 };
const daysSince = (d) =>
  d ? Math.floor((Date.now() - new Date(d)) / 86400000) : null;
const lastTouch = (c) =>
  (c.touchpoints || [])
    .map((t) => t.date)
    .sort()
    .reverse()[0] || null;
const isOverdue = (c) => {
  const limit = CADENCE[c.relationship_status];
  const since = daysSince(lastTouch(c) || c.created_at?.slice(0, 10));
  return limit && since !== null && since > limit;
};

// ── Supabase query helpers ───────────────────────────────────────────────────

async function getContacts() {
  const { data, error } = await supabase
    .from("sprout_contacts")
    .select(
      "id,data,first_name,last_name,email,relationship_status,next_action_date,created_at"
    );
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row.data,
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    relationship_status: row.relationship_status,
    next_action_date: row.next_action_date,
    created_at: row.created_at,
  }));
}

async function getOrgs() {
  const { data, error } = await supabase
    .from("sprout_orgs")
    .select(
      "id,data,name,category,relationship_status,next_action_date,created_at"
    );
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row.data,
    id: row.id,
    name: row.name,
    category: row.category,
    relationship_status: row.relationship_status,
    next_action_date: row.next_action_date,
    created_at: row.created_at,
  }));
}

async function getEvents() {
  const { data, error } = await supabase
    .from("sprout_events")
    .select("id,data,name,event_date,status,created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row.data,
    id: row.id,
    name: row.name,
    event_date: row.event_date,
    status: row.status,
    created_at: row.created_at,
  }));
}

async function getProfile() {
  const { data, error } = await supabase
    .from("sprout_profile")
    .select("id,data")
    .eq("id", "profile")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.data ?? {};
}

// ── Write helpers — mirror saveContacts/saveOrgs in lib/services.js ───────────
// Read → mutate in memory → Zod validate → upsert (SQL-promoted columns + full
// `data` blob). next_action_date for contacts is promoted from the earliest
// active dated next_actions[] entry, falling back to the flat field — exactly
// as saveContacts does, honoring the next-action dual-field rule.

const findContact = async (id) => (await getContacts()).find((c) => c.id === id);
const findOrg = async (id) => (await getOrgs()).find((o) => o.id === id);

// Stable-ish unique id for a next_actions[] entry (no crypto dependency).
const newActionId = () =>
  `na_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

async function upsertContact(contact) {
  // Defensive: the SQL record_type column is not selected by getContacts, so a
  // contact whose data blob lacks it would fail the z.literal("individual")
  // check. Backfill it before validating.
  if (!contact.record_type) contact.record_type = "individual";
  const { data, error } = validateContact(contact);
  if (error) return { error };
  const promotedDate =
    (data.next_actions ?? [])
      .filter((a) => !a.completed && a.date)
      .sort((a, b) => a.date.localeCompare(b.date))[0]?.date ||
    data.next_action_date ||
    null;
  const row = {
    id: data.id,
    org_id: data.org_id || null,
    record_type: data.record_type,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email || null,
    relationship_status: data.relationship_status,
    next_action_date: promotedDate,
    updated_at: new Date().toISOString(),
    data: { ...contact, ...data },
  };
  const { error: upErr } = await supabase
    .from("sprout_contacts")
    .upsert(row, { onConflict: "id" });
  return { error: upErr?.message ?? null };
}

async function upsertOrg(org) {
  const { data, error } = validateOrg(org);
  if (error) return { error };
  const row = {
    id: data.id,
    name: data.name,
    category: data.category,
    relationship_status: data.relationship_status,
    next_action_date: data.next_action_date || null,
    updated_at: new Date().toISOString(),
    data: { ...org, ...data },
  };
  const { error: upErr } = await supabase
    .from("sprout_orgs")
    .upsert(row, { onConflict: "id" });
  return { error: upErr?.message ?? null };
}

// ── Creation + merge helpers ─────────────────────────────────────────────────
// Used by create_or_update_contact / create_or_update_org. New records get a
// human-readable id (ind_/org_) generated from the name, never a raw UUID
// (project rule). When an explicit id targets an existing record, the incoming
// research is MERGED in — touchpoints append, relationship_types union, and
// scalar fields fill empties only (unless overwrite) so verified data is never
// clobbered by a later, thinner pass.

const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

// Fill a scalar: take incoming only if it's a real value AND (overwrite OR the
// existing value is empty). Keeps existing verified data on a fill-only merge.
const fillScalar = (existing, incoming, overwrite) =>
  incoming !== undefined && incoming !== null && incoming !== ""
    ? overwrite || existing === undefined || existing === null || existing === ""
      ? incoming
      : existing
    : existing;

// Append incoming touchpoints not already present (dedupe by date|summary).
const mergeTouchpoints = (existing = [], incoming = []) => {
  const seen = new Set(existing.map((t) => `${t.date}|${t.summary}`));
  return [...existing, ...incoming.filter((t) => !seen.has(`${t.date}|${t.summary}`))];
};

// Union two arrays of primitives, preserving order and dropping falsy/dupes.
const unionArr = (a = [], b = []) => [...new Set([...a, ...b].filter(Boolean))];

// Standard JSON response for a write tool. On a Zod failure, `error` is the
// flattened validator object; serialize it so the caller sees what failed.
function writeResult(name, error, payload) {
  if (error) {
    return {
      content: [
        {
          type: "text",
          text: `${name} failed validation/write: ${
            typeof error === "string" ? error : JSON.stringify(error, null, 2)
          }`,
        },
      ],
      isError: true,
    };
  }
  return {
    content: [
      { type: "text", text: JSON.stringify({ ok: true, ...payload }, null, 2) },
    ],
  };
}

// ── create/merge core (shared by the tools + scaffold_from_research) ──────────
// Returns { errorText } for a user-facing failure (missing name, duplicate,
// id-not-found), or { id, created, merged, action_id, validationError } where
// validationError is the flattened Zod object if the upsert was rejected.

async function applyContactInput(args) {
  const overwrite = !!args.overwrite;
  const explicitId = args.id;
  const existing = explicitId ? await findContact(explicitId) : null;

  let id = explicitId;
  if (!id) {
    const slug = slugify(`${args.first_name ?? ""} ${args.last_name ?? ""}`);
    if (!slug) {
      return {
        errorText:
          "Cannot create a contact without a name (first_name/last_name) or an explicit id.",
      };
    }
    id = `ind_${slug}`;
    const collision = await findContact(id);
    if (collision) {
      return {
        errorText: `A contact with id ${id} already exists (${collision.first_name} ${collision.last_name}). To merge into it, call again with id: "${id}". To create a distinct record, pass a different name or an explicit id.`,
      };
    }
  }
  if (explicitId && !existing) {
    return { errorText: `No contact found with id: ${explicitId}` };
  }

  // Skeleton for a new record carries only id/type and empty collections.
  // Scalar defaults (relationship_status="cold") are left to Zod so a non-empty
  // default doesn't block an incoming value via fillScalar.
  const base = existing ?? {
    id,
    record_type: "individual",
    relationship_types: [],
    touchpoints: [],
    next_actions: [],
  };

  const merged = {
    ...base,
    id,
    record_type: "individual",
    first_name: fillScalar(base.first_name, args.first_name, overwrite),
    last_name: fillScalar(base.last_name, args.last_name, overwrite),
    email: fillScalar(base.email, args.email, overwrite),
    phone: fillScalar(base.phone, args.phone, overwrite),
    website: fillScalar(base.website, args.website, overwrite),
    instagram_handle: fillScalar(
      base.instagram_handle,
      args.instagram_handle,
      overwrite
    ),
    org_id: fillScalar(base.org_id, args.org_id, overwrite),
    relationship_status: fillScalar(
      base.relationship_status,
      args.relationship_status,
      overwrite
    ),
    other_description: fillScalar(
      base.other_description,
      args.other_description,
      overwrite
    ),
    notes: fillScalar(base.notes, args.notes, overwrite),
    relationship_types: unionArr(
      base.relationship_types,
      args.relationship_types
    ),
    touchpoints: mergeTouchpoints(base.touchpoints, args.touchpoints),
    tags: unionArr(base.tags, args.tags),
    confidence: fillScalar(base.confidence, args.confidence, overwrite),
    tier: fillScalar(base.tier, args.tier, overwrite),
  };

  // Next-action dual-field rule: a new next action writes the flat fields AND
  // appends a matching next_actions[] entry.
  let action_id = null;
  if (args.next_action) {
    merged.next_action = args.next_action;
    merged.next_action_date = args.next_action_date || null;
    action_id = newActionId();
    merged.next_actions = [
      ...(merged.next_actions ?? []),
      {
        id: action_id,
        text: args.next_action,
        date: args.next_action_date || null,
        completed: false,
      },
    ];
  }

  const { error } = await upsertContact(merged);
  return { id, created: !existing, merged: !!existing, action_id, validationError: error };
}

async function applyOrgInput(args) {
  const overwrite = !!args.overwrite;
  const explicitId = args.id;
  const existing = explicitId ? await findOrg(explicitId) : null;

  let id = explicitId;
  if (!id) {
    const slug = slugify(args.name ?? "");
    if (!slug) {
      return { errorText: "Cannot create an org without a name or an explicit id." };
    }
    id = `org_${slug}`;
    const collision = await findOrg(id);
    if (collision) {
      return {
        errorText: `An org with id ${id} already exists (${collision.name}). To merge into it, call again with id: "${id}". To create a distinct record, pass a different name or an explicit id.`,
      };
    }
  }
  if (explicitId && !existing) {
    return { errorText: `No org found with id: ${explicitId}` };
  }

  // Scalar defaults (category, relationship_status) left to Zod — see note on
  // the contact skeleton above.
  const base = existing ?? { id, record_type: "organization", touchpoints: [] };

  const merged = {
    ...base,
    id,
    record_type: "organization",
    name: fillScalar(base.name, args.name, overwrite),
    category: fillScalar(base.category, args.category, overwrite),
    relationship_status: fillScalar(
      base.relationship_status,
      args.relationship_status,
      overwrite
    ),
    website: fillScalar(base.website, args.website, overwrite),
    instagram_handle: fillScalar(
      base.instagram_handle,
      args.instagram_handle,
      overwrite
    ),
    phone: fillScalar(base.phone, args.phone, overwrite),
    email: fillScalar(base.email, args.email, overwrite),
    primary_contact_id: fillScalar(
      base.primary_contact_id,
      args.primary_contact_id,
      overwrite
    ),
    notes: fillScalar(base.notes, args.notes, overwrite),
    touchpoints: mergeTouchpoints(base.touchpoints, args.touchpoints),
    tags: unionArr(base.tags, args.tags),
    confidence: fillScalar(base.confidence, args.confidence, overwrite),
    tier: fillScalar(base.tier, args.tier, overwrite),
  };

  if (args.next_action) {
    merged.next_action = args.next_action;
    merged.next_action_date = args.next_action_date || null;
  }

  const { error } = await upsertOrg(merged);
  return { id, created: !existing, merged: !!existing, validationError: error };
}

// ── MCP Server ───────────────────────────────────────────────────────────────

const server = new Server(
  { name: "sprout-crm", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// ── Tool definitions ─────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_relationship_health",
      description:
        "Returns a CRM health dashboard: contact counts by status, contacts overdue on their cadence, and the next 20 upcoming actions across all contacts.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "search_contacts",
      description:
        "Search contacts by name, relationship status, and/or relationship type. Returns a summary list.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Partial name match (first or last name)",
          },
          status: {
            type: "string",
            enum: ["cold", "cool", "warm", "active"],
            description: "Filter by relationship status",
          },
          relationship_type: {
            type: "string",
            enum: [
              "music",
              "art",
              "event_host",
              "partner",
              "community_builder",
              "attendee",
              "sprout_society",
              "other",
            ],
            description: "Filter by relationship type",
          },
        },
      },
    },
    {
      name: "get_contact_detail",
      description:
        "Get the full record for a specific contact including all touchpoints and next actions.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Contact ID (e.g. ind_abc123)",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "list_upcoming_actions",
      description:
        "List all pending next actions across contacts, orgs, and events, sorted by date. Includes overdue items.",
      inputSchema: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description:
              "Limit to actions due within this many days from today (omit for all pending actions)",
          },
        },
      },
    },
    {
      name: "list_events",
      description:
        "List events with contact counts and open action counts. Defaults to upcoming events.",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["upcoming", "completed", "cancelled"],
            description: "Filter by status (default: upcoming)",
          },
        },
      },
    },
    {
      name: "add_touchpoint",
      description:
        "Append a touchpoint (an interaction record) to a contact or org. Optionally set a follow-up next action in the same call. For contacts, a next action is written to BOTH the flat fields and the next_actions[] array (dual-field rule).",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Contact (ind_...) or org (org_...) ID",
          },
          date: {
            type: "string",
            description: "Touchpoint date, YYYY-MM-DD (defaults to today)",
          },
          summary: {
            type: "string",
            description: "What happened in this interaction",
          },
          next_action: {
            type: "string",
            description: "Optional follow-up action text",
          },
          next_action_date: {
            type: "string",
            description: "Optional follow-up due date, YYYY-MM-DD",
          },
        },
        required: ["id", "summary"],
      },
    },
    {
      name: "set_next_action",
      description:
        "Set a contact's or org's next action. For contacts this writes the flat next_action/next_action_date fields AND appends a matching next_actions[] entry so the dashboard sees it (dual-field rule). For orgs it sets the flat fields only.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Contact (ind_...) or org (org_...) ID",
          },
          text: { type: "string", description: "Next action text" },
          date: {
            type: "string",
            description: "Due date, YYYY-MM-DD (optional)",
          },
        },
        required: ["id", "text"],
      },
    },
    {
      name: "complete_action",
      description:
        "Mark a contact's next_actions[] entry completed by its action id. The contact's promoted next_action_date automatically advances to the next active dated action.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Contact ID (ind_...)" },
          action_id: {
            type: "string",
            description: "The id of the next_actions[] entry to complete",
          },
        },
        required: ["id", "action_id"],
      },
    },
    {
      name: "update_relationship_status",
      description:
        "Change the relationship_status (cold/cool/warm/active) of a contact or org.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Contact (ind_...) or org (org_...) ID",
          },
          status: {
            type: "string",
            enum: ["cold", "cool", "warm", "active"],
            description: "New relationship status",
          },
        },
        required: ["id", "status"],
      },
    },
    {
      name: "create_or_update_contact",
      description:
        "Create a new contact (individual), or merge research into an existing one. Omit `id` to create — the id is generated from the name (ind_first_last); if that id already exists the call is rejected so you don't accidentally duplicate (pass the explicit id to merge instead). Provide `id` to target an existing record: incoming fields fill empties only (unless overwrite=true), touchpoints append, and relationship_types union — verified data is never clobbered. Honors the next-action dual-field rule. Validated against the same Zod schema as the web app.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "Existing contact id (ind_...) to merge into. Omit to create a new record (id generated from name).",
          },
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          website: { type: "string" },
          instagram_handle: { type: "string" },
          org_id: {
            type: "string",
            description: "Link to an organization record (org_...)",
          },
          relationship_status: {
            type: "string",
            enum: ["cold", "cool", "warm", "active"],
          },
          relationship_types: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "music",
                "art",
                "event_host",
                "partner",
                "community_builder",
                "attendee",
                "sprout_society",
                "other",
              ],
            },
            description: "Unioned with any existing types on a merge",
          },
          other_description: { type: "string" },
          notes: { type: "string" },
          next_action: { type: "string" },
          next_action_date: { type: "string", description: "YYYY-MM-DD" },
          touchpoints: {
            type: "array",
            description:
              "Prior interactions to log (e.g. from research Phase C). Appended; deduped by date+summary.",
            items: {
              type: "object",
              properties: {
                date: { type: "string", description: "YYYY-MM-DD" },
                summary: { type: "string" },
                next_action: { type: "string" },
                next_action_date: { type: "string" },
              },
              required: ["date", "summary"],
            },
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description:
              "Research/discovery tags (e.g. instagram_sourced, brooklyn). Stored in the data blob.",
          },
          confidence: {
            type: "string",
            description:
              "Research confidence on this record (HIGH/MEDIUM). Stored in the data blob.",
          },
          tier: {
            type: "string",
            description:
              "Cultivation tier from the protocol (A/B/C). Stored in the data blob.",
          },
          overwrite: {
            type: "boolean",
            description:
              "If true, incoming scalar fields overwrite existing non-empty values. Default false (fill empties only).",
          },
        },
      },
    },
    {
      name: "create_or_update_org",
      description:
        "Create a new organization, or merge research into an existing one. Omit `id` to create — generated from the name (org_name); if it already exists the call is rejected (pass the explicit id to merge). Provide `id` to merge: scalars fill empties only (unless overwrite=true), touchpoints append. Validated against the web app's Zod schema.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "Existing org id (org_...) to merge into. Omit to create a new record (id generated from name).",
          },
          name: { type: "string" },
          category: {
            type: "string",
            enum: ["funder", "partner", "vendor", "media", "government"],
          },
          relationship_status: {
            type: "string",
            enum: ["cold", "cool", "warm", "active"],
          },
          website: { type: "string" },
          instagram_handle: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          primary_contact_id: {
            type: "string",
            description: "Primary contact (ind_...) at this org",
          },
          notes: { type: "string" },
          next_action: { type: "string" },
          next_action_date: { type: "string", description: "YYYY-MM-DD" },
          touchpoints: {
            type: "array",
            description: "Prior interactions to log. Appended; deduped.",
            items: {
              type: "object",
              properties: {
                date: { type: "string", description: "YYYY-MM-DD" },
                summary: { type: "string" },
                next_action: { type: "string" },
                next_action_date: { type: "string" },
              },
              required: ["date", "summary"],
            },
          },
          tags: { type: "array", items: { type: "string" } },
          confidence: { type: "string" },
          tier: { type: "string" },
          overwrite: { type: "boolean" },
        },
      },
    },
    {
      name: "check_existing",
      description:
        "Phase C dedupe check: search existing contacts AND orgs by a name fragment or Instagram handle before creating a new record. Use this before scaffold_from_research so research never duplicates a record already in the CRM. Returns matching contacts and orgs (with ids to merge into).",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Name fragment or Instagram handle (with or without @) to look for",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "scaffold_from_research",
      description:
        "Land a completed Research Brief (CRM Research Protocol Phase G) into the CRM in one call. Creates/merges the org first, then each individual with org_id auto-linked to that org. Each sub-record uses the same id-generation, merge, and Zod-validation rules as create_or_update_contact/org. Run check_existing first to decide whether to pass explicit ids (merge) or omit them (create). Failures are reported per-record, not fatal to the batch.",
      inputSchema: {
        type: "object",
        properties: {
          org: {
            type: "object",
            description:
              "Organization profile — same fields as create_or_update_org. Omit if this is an individual-only brief. Pass `id` to merge into an existing org.",
          },
          contacts: {
            type: "array",
            description:
              "Individual profiles — each takes the same fields as create_or_update_contact. org_id is auto-set to the org above unless the contact specifies its own.",
            items: { type: "object" },
          },
        },
      },
    },
    {
      name: "assemble_newsletter",
      description:
        "Assemble a review-ready monthly-roundup newsletter from the CRM. Fills the HTML template with recap blocks from completed events that have a `recap` blurb, upcoming-event blocks from future events, and footer/site details from the org profile. Returns a JSON summary (what was pulled + which [BRACKETS] still need a human) followed by the assembled HTML. Subjective copy (intro, spotlight blurb) is left bracketed.",
      inputSchema: {
        type: "object",
        properties: {
          month: {
            type: "string",
            description:
              'Override the masthead month label, e.g. "June 2026". Defaults to the current month and year.',
          },
          recap_limit: {
            type: "number",
            description: "Max completed-event recaps to include (default 4)",
          },
          upcoming_limit: {
            type: "number",
            description: "Max upcoming events to include (default 4)",
          },
          spotlight_contact_id: {
            type: "string",
            description:
              "Contact (ind_...) to feature in the Member Spotlight. Fills the name; role/blurb stay bracketed for you to write.",
          },
        },
      },
    },
  ],
}));

// ── Tool implementations ─────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const today = new Date().toISOString().slice(0, 10);

  try {
    // ── get_relationship_health ──────────────────────────────────────────────
    if (name === "get_relationship_health") {
      const contacts = await getContacts();

      const statusCounts = { cold: 0, cool: 0, warm: 0, active: 0 };
      const overdue = [];
      const upcoming = [];

      for (const c of contacts) {
        const status = c.relationship_status;
        if (status in statusCounts) statusCounts[status]++;

        if (isOverdue(c)) {
          overdue.push({
            id: c.id,
            name: `${c.first_name} ${c.last_name}`.trim(),
            status,
            last_touchpoint: lastTouch(c),
          });
        }

        for (const a of c.next_actions ?? []) {
          if (!a.completed && a.date && a.date >= today) {
            upcoming.push({
              contact: `${c.first_name} ${c.last_name}`.trim(),
              contact_id: c.id,
              action: a.text,
              date: a.date,
            });
          }
        }
      }

      overdue.sort((a, b) => a.name.localeCompare(b.name));
      upcoming.sort((a, b) => a.date.localeCompare(b.date));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                totalContacts: contacts.length,
                statusCounts,
                overdueCount: overdue.length,
                overdue,
                upcomingActions: upcoming.slice(0, 20),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ── search_contacts ──────────────────────────────────────────────────────
    if (name === "search_contacts") {
      let results = await getContacts();

      if (args.query) {
        const q = args.query.toLowerCase();
        results = results.filter(
          (c) =>
            c.first_name?.toLowerCase().includes(q) ||
            c.last_name?.toLowerCase().includes(q)
        );
      }
      if (args.status) {
        results = results.filter((c) => c.relationship_status === args.status);
      }
      if (args.relationship_type) {
        results = results.filter((c) =>
          (c.relationship_types ?? []).includes(args.relationship_type)
        );
      }

      const summary = results.map((c) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`.trim(),
        status: c.relationship_status,
        relationship_types: c.relationship_types ?? [],
        next_action_date: c.next_action_date,
        last_touchpoint: lastTouch(c),
        overdue: isOverdue(c),
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    }

    // ── get_contact_detail ───────────────────────────────────────────────────
    if (name === "get_contact_detail") {
      const contacts = await getContacts();
      const contact = contacts.find((c) => c.id === args.id);

      if (!contact) {
        return {
          content: [
            { type: "text", text: `No contact found with id: ${args.id}` },
          ],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(contact, null, 2) }],
      };
    }

    // ── list_upcoming_actions ────────────────────────────────────────────────
    if (name === "list_upcoming_actions") {
      let cutoff = null;
      if (args.days) {
        const d = new Date();
        d.setDate(d.getDate() + args.days);
        cutoff = d.toISOString().slice(0, 10);
      }

      const [contacts, orgs, events] = await Promise.all([
        getContacts(),
        getOrgs(),
        getEvents(),
      ]);

      const actions = [];

      // Contacts: pull from next_actions array
      for (const c of contacts) {
        for (const a of c.next_actions ?? []) {
          if (a.completed) continue;
          if (cutoff && a.date && a.date > cutoff) continue;
          actions.push({
            source: "contact",
            source_name: `${c.first_name} ${c.last_name}`.trim(),
            source_id: c.id,
            action: a.text,
            date: a.date ?? null,
            overdue: a.date ? a.date < today : false,
          });
        }
      }

      // Orgs: use SQL-promoted next_action_date + next_action string
      for (const o of orgs) {
        if (!o.next_action || !o.next_action_date) continue;
        if (cutoff && o.next_action_date > cutoff) continue;
        actions.push({
          source: "org",
          source_name: o.name,
          source_id: o.id,
          action: o.next_action,
          date: o.next_action_date,
          overdue: o.next_action_date < today,
        });
      }

      // Events: pull from next_actions array on upcoming events
      for (const e of events) {
        if (e.status !== "upcoming") continue;
        for (const a of e.next_actions ?? []) {
          if (a.completed) continue;
          if (cutoff && a.date && a.date > cutoff) continue;
          actions.push({
            source: "event",
            source_name: e.name,
            source_id: e.id,
            action: a.text,
            date: a.date ?? null,
            overdue: a.date ? a.date < today : false,
          });
        }
      }

      // Sort: overdue first (by date asc), then upcoming (by date asc), undated last
      actions.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });

      return {
        content: [{ type: "text", text: JSON.stringify(actions, null, 2) }],
      };
    }

    // ── list_events ──────────────────────────────────────────────────────────
    if (name === "list_events") {
      const statusFilter = args.status ?? "upcoming";
      const events = await getEvents();
      const filtered = events
        .filter((e) => e.status === statusFilter)
        .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));

      const result = filtered.map((e) => ({
        id: e.id,
        name: e.name,
        event_date: e.event_date,
        status: e.status,
        location: e.location ?? "",
        description: e.description ?? "",
        contact_count: (e.contact_ids ?? []).length,
        confirmed_count: (e.confirmed_ids ?? []).length,
        open_actions: (e.next_actions ?? []).filter((a) => !a.completed).length,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    // ── add_touchpoint ───────────────────────────────────────────────────────
    if (name === "add_touchpoint") {
      const date = args.date || today;
      const isOrg = args.id.startsWith("org_");
      const record = isOrg
        ? await findOrg(args.id)
        : await findContact(args.id);
      if (!record) {
        return {
          content: [{ type: "text", text: `No record found with id: ${args.id}` }],
          isError: true,
        };
      }

      const touchpoint = {
        date,
        summary: args.summary,
        next_action: args.next_action || "",
        next_action_date: args.next_action_date || null,
      };
      record.touchpoints = [...(record.touchpoints ?? []), touchpoint];

      // A follow-up action set here also updates the record's next action.
      if (args.next_action) {
        record.next_action = args.next_action;
        record.next_action_date = args.next_action_date || null;
        if (!isOrg) {
          // Dual-field rule: contacts also need a next_actions[] entry.
          record.next_actions = [
            ...(record.next_actions ?? []),
            {
              id: newActionId(),
              text: args.next_action,
              date: args.next_action_date || null,
              completed: false,
            },
          ];
        }
      }

      const { error } = isOrg
        ? await upsertOrg(record)
        : await upsertContact(record);
      return writeResult("add_touchpoint", error, {
        id: args.id,
        touchpoint,
        touchpoint_count: record.touchpoints.length,
      });
    }

    // ── set_next_action ──────────────────────────────────────────────────────
    if (name === "set_next_action") {
      const isOrg = args.id.startsWith("org_");
      const record = isOrg
        ? await findOrg(args.id)
        : await findContact(args.id);
      if (!record) {
        return {
          content: [{ type: "text", text: `No record found with id: ${args.id}` }],
          isError: true,
        };
      }

      record.next_action = args.text;
      record.next_action_date = args.date || null;
      let action_id = null;
      if (!isOrg) {
        // Dual-field rule: append a matching next_actions[] entry.
        action_id = newActionId();
        record.next_actions = [
          ...(record.next_actions ?? []),
          {
            id: action_id,
            text: args.text,
            date: args.date || null,
            completed: false,
          },
        ];
      }

      const { error } = isOrg
        ? await upsertOrg(record)
        : await upsertContact(record);
      return writeResult("set_next_action", error, {
        id: args.id,
        next_action: args.text,
        next_action_date: args.date || null,
        action_id,
      });
    }

    // ── complete_action ──────────────────────────────────────────────────────
    if (name === "complete_action") {
      const contact = await findContact(args.id);
      if (!contact) {
        return {
          content: [{ type: "text", text: `No contact found with id: ${args.id}` }],
          isError: true,
        };
      }
      const entry = (contact.next_actions ?? []).find(
        (a) => a.id === args.action_id
      );
      if (!entry) {
        return {
          content: [
            {
              type: "text",
              text: `No next_actions entry with id ${args.action_id} on ${args.id}`,
            },
          ],
          isError: true,
        };
      }
      entry.completed = true;

      const { error } = await upsertContact(contact);
      return writeResult("complete_action", error, {
        id: args.id,
        action_id: args.action_id,
      });
    }

    // ── update_relationship_status ───────────────────────────────────────────
    if (name === "update_relationship_status") {
      const isOrg = args.id.startsWith("org_");
      const record = isOrg
        ? await findOrg(args.id)
        : await findContact(args.id);
      if (!record) {
        return {
          content: [{ type: "text", text: `No record found with id: ${args.id}` }],
          isError: true,
        };
      }
      record.relationship_status = args.status;

      const { error } = isOrg
        ? await upsertOrg(record)
        : await upsertContact(record);
      return writeResult("update_relationship_status", error, {
        id: args.id,
        relationship_status: args.status,
      });
    }

    // ── create_or_update_contact ─────────────────────────────────────────────
    if (name === "create_or_update_contact") {
      const r = await applyContactInput(args);
      if (r.errorText) {
        return { content: [{ type: "text", text: r.errorText }], isError: true };
      }
      return writeResult("create_or_update_contact", r.validationError, {
        id: r.id,
        created: r.created,
        merged: r.merged,
        action_id: r.action_id,
      });
    }

    // ── create_or_update_org ─────────────────────────────────────────────────
    if (name === "create_or_update_org") {
      const r = await applyOrgInput(args);
      if (r.errorText) {
        return { content: [{ type: "text", text: r.errorText }], isError: true };
      }
      return writeResult("create_or_update_org", r.validationError, {
        id: r.id,
        created: r.created,
        merged: r.merged,
      });
    }

    // ── check_existing ───────────────────────────────────────────────────────
    // Phase C dedupe: find contacts/orgs matching a name fragment or Instagram
    // handle before scaffolding a new record, so research doesn't duplicate.
    if (name === "check_existing") {
      const q = (args.query || "").toLowerCase().replace(/^@/, "");
      if (!q) {
        return {
          content: [{ type: "text", text: "Provide a `query` (name or @handle) to check." }],
          isError: true,
        };
      }
      const match = (s) => (s || "").toLowerCase().replace(/^@/, "").includes(q);
      const [contacts, orgs] = await Promise.all([getContacts(), getOrgs()]);

      const contactHits = contacts
        .filter(
          (c) =>
            match(c.first_name) ||
            match(c.last_name) ||
            match(`${c.first_name} ${c.last_name}`) ||
            match(c.instagram_handle)
        )
        .map((c) => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`.trim(),
          instagram_handle: c.instagram_handle || "",
          relationship_status: c.relationship_status,
          org_id: c.org_id || null,
        }));

      const orgHits = orgs
        .filter((o) => match(o.name) || match(o.instagram_handle))
        .map((o) => ({
          id: o.id,
          name: o.name,
          instagram_handle: o.instagram_handle || "",
          category: o.category,
          relationship_status: o.relationship_status,
        }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                query: args.query,
                contactMatches: contactHits,
                orgMatches: orgHits,
                anyMatch: contactHits.length + orgHits.length > 0,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ── scaffold_from_research ───────────────────────────────────────────────
    // Land a completed Research Brief (Phase G) into the CRM in one call: the
    // org is created/merged first, then each individual is created/merged with
    // org_id auto-linked to it. Each sub-record reuses the same validate+merge
    // path as the standalone tools; failures are reported per-record, not fatal.
    if (name === "scaffold_from_research") {
      const results = { org: null, contacts: [] };

      let orgId = null;
      if (args.org) {
        const r = await applyOrgInput(args.org);
        if (r.errorText) {
          results.org = { ok: false, error: r.errorText };
        } else if (r.validationError) {
          results.org = { ok: false, id: r.id, validationError: r.validationError };
        } else {
          orgId = r.id;
          results.org = { ok: true, id: r.id, created: r.created, merged: r.merged };
        }
      }

      for (const c of args.contacts ?? []) {
        // Auto-link to the org just created, unless the contact names its own.
        const input = { ...c, org_id: c.org_id || orgId || undefined };
        const r = await applyContactInput(input);
        if (r.errorText) {
          results.contacts.push({ ok: false, error: r.errorText, input_name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() });
        } else if (r.validationError) {
          results.contacts.push({ ok: false, id: r.id, validationError: r.validationError });
        } else {
          results.contacts.push({ ok: true, id: r.id, created: r.created, merged: r.merged, org_id: input.org_id || null });
        }
      }

      const anyFail =
        (results.org && results.org.ok === false) ||
        results.contacts.some((c) => c.ok === false);
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        isError: anyFail,
      };
    }

    // ── assemble_newsletter ──────────────────────────────────────────────────
    // Fill the monthly-roundup HTML template from live CRM data: recap blocks
    // from completed events that have a recap blurb, upcoming-event blocks from
    // future events, footer/site from the org profile, and (optionally) the
    // spotlight name from a chosen contact. Subjective copy (intro, spotlight
    // blurb, preview) is left bracketed and reported so the user finishes it.
    if (name === "assemble_newsletter") {
      const MONTHS_LONG = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const MONTHS_SHORT = [
        "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
        "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
      ];
      const now = new Date();
      const monthYear = args.month || `${MONTHS_LONG[now.getMonth()]} ${now.getFullYear()}`;
      const monthName = monthYear.split(/\s+/)[0];
      const recapLimit = args.recap_limit ?? 4;
      const upcomingLimit = args.upcoming_limit ?? 4;

      const esc = (s) =>
        (s || "")
          .toString()
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      const pill = (dstr) => {
        const [, m, d] = (dstr || "").split("-").map((x) => x);
        return { mon: MONTHS_SHORT[(+m || 1) - 1] || "", day: String(+d || "") };
      };

      const [events, profile] = await Promise.all([getEvents(), getProfile()]);

      const recaps = events
        .filter((e) => e.status === "completed" && (e.recap || "").trim())
        .sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? ""))
        .slice(0, recapLimit);

      const upcoming = events
        .filter((e) => e.status === "upcoming" && e.event_date && e.event_date >= today)
        .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""))
        .slice(0, upcomingLimit);

      // Brand accents rotate for visual rhythm (cyan, fuchsia, acid, banana).
      const RECAP_BARS = ["#73C4D6", "#E10098", "#C6C902", "#FAD100"];
      const EVT_PILLS = [
        { bg: "#C6C902", fg: "#3a3d00" },
        { bg: "#73C4D6", fg: "#0d3d49" },
      ];

      const recapBlock = (e, i) =>
        `              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px; border-left:4px solid ${
          RECAP_BARS[i % RECAP_BARS.length]
        }; background-color:#F7F7F6; border-radius:0 8px 8px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 4px 0; font-size:17px; font-weight:900; color:#030000;">${esc(e.name)}</p>
                    <p style="margin:0; font-size:14px; line-height:1.55; color:#4B5563;">${esc(e.recap)}</p>
                  </td>
                </tr>
              </table>`;

      const eventBlock = (e, i) => {
        const { mon, day } = pill(e.event_date);
        const p = EVT_PILLS[i % EVT_PILLS.length];
        const meta = [e.location, e.description].filter(Boolean).join(" · ") || "[Time · Location · one-line description]";
        return `              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                <tr>
                  <td width="64" valign="top" style="padding-right:14px;">
                    <table role="presentation" width="56" cellpadding="0" cellspacing="0" style="background-color:${p.bg}; border-radius:10px;">
                      <tr><td align="center" style="padding:8px 0 0 0; font-size:11px; font-weight:900; text-transform:uppercase; color:${p.fg};">${mon}</td></tr>
                      <tr><td align="center" style="padding:0 0 8px 0; font-size:24px; font-weight:900; line-height:1; color:#030000;">${day}</td></tr>
                    </table>
                  </td>
                  <td valign="top">
                    <p style="margin:0 0 2px 0; font-size:16px; font-weight:900; color:#030000;">${esc(e.name)}</p>
                    <p style="margin:0; font-size:13px; line-height:1.5; color:#4B5563;">${esc(meta)}</p>
                  </td>
                </tr>
              </table>`;
      };

      const recapBlocks = recaps.length
        ? recaps.map(recapBlock).join("\n\n")
        : `              <!-- No completed events with a recap blurb were found. Add a recap on the event record, or fill this in manually. -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px; border-left:4px solid #73C4D6; background-color:#F7F7F6; border-radius:0 8px 8px 0;">
                <tr><td style="padding:16px 18px;">
                  <p style="margin:0 0 4px 0; font-size:17px; font-weight:900; color:#030000;">[EVENT NAME]</p>
                  <p style="margin:0; font-size:14px; line-height:1.55; color:#4B5563;">[2–3 sentence recap]</p>
                </td></tr>
              </table>`;

      const eventBlocks = upcoming.length
        ? upcoming.map(eventBlock).join("\n\n")
        : `              <!-- No upcoming events found in the CRM. -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                <tr><td valign="top"><p style="margin:0; font-size:13px; color:#4B5563;">[No upcoming events — add some, or remove this section]</p></td></tr>
              </table>`;

      const templatePath = join(__dirname, "..", "docs", "newsletter", "01-monthly-roundup.html");
      let html = readFileSync(templatePath, "utf8");

      html = html
        .replace(/<!-- RECAP BLOCK[\s\S]*\/RECAP BLOCK -->/, recapBlocks)
        .replace(/<!-- EVENT BLOCK[\s\S]*\/EVENT BLOCK -->/, eventBlocks)
        .replace(/\[MONTH YEAR\]/g, esc(monthYear))
        .replace(/\[MONTH\]/g, esc(monthName));

      // Footer + RSVP link from the org profile, if present.
      if (profile.website) {
        html = html
          .replace(/\[WEBSITE\]/g, esc(profile.website))
          .replace(/\[RSVP \/ EVENTS PAGE LINK\]/g, esc(profile.website));
      }
      if (profile.igHandle) {
        const handle = profile.igHandle.startsWith("@") ? profile.igHandle : `@${profile.igHandle}`;
        html = html.replace(/\[INSTAGRAM @handle\]/g, esc(handle));
      }

      // Spotlight name from a chosen contact; role/blurb stay bracketed.
      let spotlightName = null;
      if (args.spotlight_contact_id) {
        const c = await findContact(args.spotlight_contact_id);
        if (c) {
          spotlightName = `${c.first_name} ${c.last_name}`.trim();
          html = html
            .replace(/\[NAME — e\.g\. Pat\]/g, esc(spotlightName))
            .replace(/\[NAME\]/g, esc(spotlightName));
          // No photo on file → drop the optional photo cell so there's no broken img.
          html = html.replace(/<!-- Optional photo[\s\S]*?<\/td>\s*/, "");
        }
      }

      // Match a single placeholder (newlines allowed within one; [^\]] stops at
      // the first closing bracket so it never spans two), collapse whitespace.
      const remaining = [
        ...new Set(
          (html.match(/\[[^\]]+\]/g) || []).map((s) => s.replace(/\s+/g, " ").trim())
        ),
      ];

      const summary = {
        month: monthYear,
        recapsUsed: recaps.map((e) => ({ id: e.id, name: e.name, date: e.event_date })),
        upcomingUsed: upcoming.map((e) => ({ id: e.id, name: e.name, date: e.event_date })),
        spotlight: spotlightName,
        remainingPlaceholders: remaining,
        note:
          "HTML follows in the next block. CRM-derived content is filled; bracketed items still need a human. Save the HTML and paste into Mailchimp (Code your own) or a Gmail draft.",
      };

      return {
        content: [
          { type: "text", text: JSON.stringify(summary, null, 2) },
          { type: "text", text: html },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// ── Resources ────────────────────────────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "sprout://profile",
      name: "Org Profile",
      description: "Live org profile from the sprout_profile table",
      mimeType: "application/json",
    },
    {
      uri: "sprout://crm-protocol",
      name: "CRM Research Protocol",
      description:
        "The 7-phase research protocol and Claude prompt templates from CRM Research Protocol.md",
      mimeType: "text/markdown",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "sprout://profile") {
    const profile = await getProfile();
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(profile, null, 2),
        },
      ],
    };
  }

  if (uri === "sprout://crm-protocol") {
    // The protocol file sits one level above mcp/
    const protocolPath = join(__dirname, "..", "CRM Research Protocol.md");
    const text = readFileSync(protocolPath, "utf8");
    return {
      contents: [{ uri, mimeType: "text/markdown", text }],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// ── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
