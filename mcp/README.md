# Sprout CRM MCP Server

An MCP server that wraps the Sprout CRM's live Supabase database as tools Claude can call mid-conversation. Instead of copy-pasting CRM data into Claude, Claude queries the database itself.

## What it exposes

**Read tools**

| Tool | What it does |
|---|---|
| `get_relationship_health` | Status counts, overdue contacts (cadence logic), upcoming next actions |
| `search_contacts` | Filter by name, status, relationship type |
| `get_contact_detail` | Full contact record with touchpoints and next actions |
| `list_upcoming_actions` | All pending next actions across contacts, orgs, and events |
| `list_events` | Upcoming events with contact and action counts |

**Write tools**

These reuse the web app's Zod validators (`lib/schemas.js`) and the same read→merge→validate→upsert pattern as `lib/services.js`, so the MCP and app share one source of truth. Invalid writes are rejected with the Zod error, not silently dropped.

| Tool | What it does |
|---|---|
| `add_touchpoint` | Append a touchpoint to a contact or org; optional follow-up next action |
| `set_next_action` | Set a contact's/org's next action (dual-field rule for contacts) |
| `complete_action` | Mark a contact's `next_actions[]` entry completed by id |
| `update_relationship_status` | Change relationship status on a contact or org |

**Creation + merge tools**

Generate human-readable ids from the name on create (`ind_first_last` / `org_name`), or merge research into an existing record when an explicit `id` is given. Merge fills empty scalars only (unless `overwrite:true`), appends touchpoints (deduped), and unions `relationship_types` — verified data is never clobbered. A name collision without an id is rejected to prevent duplicates.

| Tool | What it does |
|---|---|
| `create_or_update_contact` | Create a contact, or merge fields/touchpoints/types into an existing `ind_` record |
| `create_or_update_org` | Create an org, or merge into an existing `org_` record |

**Research + newsletter tools**

| Tool | What it does |
|---|---|
| `check_existing` | Dedupe check: search contacts AND orgs by name fragment or Instagram handle |
| `scaffold_from_research` | Land a full Research Brief (org first, then individuals with `org_id` auto-linked); per-record errors are non-fatal |
| `assemble_newsletter` | Fill the monthly-roundup HTML from CRM data (recaps from completed events with a `recap` blurb, upcoming events, profile footer, optional spotlight); returns a summary + HTML, leaving subjective copy bracketed |

**Resources**

| Resource | Content |
|---|---|
| `sprout://profile` | Live org profile from `sprout_profile` table |
| `sprout://crm-protocol` | The 7-phase research protocol and Claude prompt templates |

---

## Install

```bash
cd sprout-crm-next/mcp
npm install
```

---

## Connect to Claude Code (VS Code)

This server is wired into the **Claude Code extension in VS Code** — not Claude Desktop. Wiring travels with the repo via the root `.mcp.json`; the secret key lives only in a gitignored `mcp/.env`.

### 1. Put the secret key in `mcp/.env`

Create `mcp/.env` (gitignored — `.env*` is already excluded):

```
NEXT_PUBLIC_SUPABASE_URL=https://ixdnmjchvjzytyhmripc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your sb_secret_... key>
```

Get the key from [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Settings → API keys**. Use a `sb_secret_...` key (not the publishable/anon key) so the server can bypass RLS. Legacy `eyJ...` JWT service-role keys are **disabled** on this project and will return `Legacy API keys are disabled`.

`server.js` loads this file by explicit path (`config({ path: join(__dirname, ".env") })`), so it works regardless of the process working directory.

### 2. Root `.mcp.json` registers the server (already committed)

The repo root holds a `.mcp.json` that Claude Code auto-discovers when the project is opened — command + args only, no secret:

```json
{
  "mcpServers": {
    "sprout-crm": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["mcp/server.js"]
    }
  }
}
```

### 3. Reload the VS Code window

Claude Code picks up `.mcp.json` on window reload. Approve the server if prompted; `sprout-crm` then appears in the MCP server list.

---

## Local testing (optional)

With `mcp/.env` in place (step 1 above), run a JSON-RPC smoke test over stdio:

```bash
node server.js
```

If it starts without throwing, the credentials are valid. To confirm live data, pipe an `initialize` + `tools/call get_relationship_health` sequence into it and check for real counts rather than `Legacy API keys are disabled`.

---

## Demo conversation

In Claude Code, ask:

> "What should I focus on this week for relationships?"

Claude should:
1. Call `get_relationship_health` for the dashboard overview
2. Call `search_contacts` or `list_upcoming_actions` for specifics
3. Read `sprout://profile` for org context
4. Return a prioritized answer grounded in live data

That sequence is the portfolio demo.

---

## Architecture

```
Claude Code (VS Code extension)
  ↕ MCP protocol (stdio)
sprout-crm-next/mcp/server.js (Node.js)
  ↕ Supabase SDK (service role)
Live Supabase database
```

Transport is stdio — the server runs locally as a child process of Claude Code. No deployment needed.
