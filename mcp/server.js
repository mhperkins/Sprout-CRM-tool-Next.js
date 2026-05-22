// mcp/server.js — Sprout CRM MCP Server
// Exposes live Supabase data as tools Claude can call mid-conversation.
// Transport: stdio (runs locally, connects via claude_desktop_config.json)

import "dotenv/config";
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
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
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
