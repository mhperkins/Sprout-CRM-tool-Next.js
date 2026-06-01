# Plan: Get the Sprout CRM MCP test-ready and extend it

## Context

The Sprout CRM MCP server (`mcp/server.js`) is currently **non-functional** for this workflow on two counts:

1. **Wrong host.** The MCP was only ever registered with **Claude Desktop**. Max works **exclusively in the Claude Code extension in VS Code** and never uses Claude Desktop, so the server is not wired into the tool he actually uses. Claude Code does not read `claude_desktop_config.json`.
2. **Dead key.** Even where it was wired, every Supabase query returns `Error: Legacy API keys are disabled`. Supabase disabled legacy `service_role` JWTs on project `ixdnmjchvjzytyhmripc`; the web app already migrated its anon key to `sb_publishable_...`, but the MCP key was a legacy JWT (verified: direct REST call returns HTTP 401). A new `sb_secret_...` key has since been generated.

This plan does three things, in order:
1. **Wire + unblock** — register the MCP with **Claude Code** and give it the new secret key, kept out of git.
2. **Verify + sync docs** — confirm all 5 existing tools work end-to-end and fix documentation drift (docs say 2 tools; there are 5 + 2 resources).
3. **Extend** — add write tools (and a few read tools), reusing the app's Zod validation layer so the MCP and web app share one source of truth.

Goal outcome: a working MCP **inside Claude Code** that can both read and safely mutate CRM data, ready to drive automations.

> **Platform rule:** Claude Code in VS Code only. Do not wire anything to, or rely on, Claude Desktop. The existing `sprout-crm` entry in the Claude Desktop config is dead and can be ignored/removed.

---

## Phase 1 — Wire the MCP into Claude Code + unblock the key (do first)

**Goal:** the `sprout-crm` MCP appears and works inside the Claude Code VS Code extension, with the secret key living only in a gitignored file.

**Secret-handling approach (key never committed, never pasted in chat):**
- The real `sb_secret_...` key lives **only** in a gitignored `mcp/.env` file (the repo `.gitignore` already excludes `.env*`).
- `mcp/server.js` is changed to load that exact file explicitly rather than relying on cwd:
  - replace `import "dotenv/config";` with an explicit path load:
    ```js
    import { config } from "dotenv";
    import { fileURLToPath } from "url";
    import { dirname, join } from "path";
    const __dirname = dirname(fileURLToPath(import.meta.url));
    config({ path: join(__dirname, ".env") });
    ```
    (the `fileURLToPath`/`dirname`/`join` imports already exist lower in the file — consolidate, don't duplicate).
- A committable **`.mcp.json`** at the repo root defines only command + args (no secret), so Claude Code auto-discovers the server when the project is opened:
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
  Alternative if a non-repo-relative path is needed: register with `claude mcp add` instead. `.mcp.json` is preferred so the wiring travels with the repo.

**Steps:**
1. Create `mcp/.env` with `NEXT_PUBLIC_SUPABASE_URL=...` and `SUPABASE_SERVICE_ROLE_KEY=<new sb_secret_ key>`. **User pastes the key into this file directly; it is never sent through chat.** Confirm `.env*` covers it (it does).
2. Edit `mcp/server.js` to load `mcp/.env` by explicit path (snippet above).
3. Add root `.mcp.json` (command + args only).
4. Reload the VS Code window so Claude Code picks up `.mcp.json`; approve the server if prompted.
5. (Optional cleanup) Remove the dead `sprout-crm` block from the Claude Desktop config so it can't mislead future sessions.

**Note:** env var name `SUPABASE_SERVICE_ROLE_KEY` stays as-is (read at `mcp/server.js:22`). `start.cmd` / `npm start` now also work standalone since the key loads from `mcp/.env`.

---

## Phase 2 — Verify existing tools + fix doc drift

1. **End-to-end test** all 5 tools, two ways:
   - via JSON-RPC over stdio (the audit harness, now reading `mcp/.env`), confirming live data instead of the 401;
   - and from **within Claude Code** once `.mcp.json` is loaded — call a tool and confirm a real payload returns.
   - Tools: `get_relationship_health`, `search_contacts`, `get_contact_detail`, `list_upcoming_actions`, `list_events`; resources: `sprout://profile`, `sprout://crm-protocol`.
2. **Fix documentation drift:**
   - `CLAUDE.md` (MCP Server section) — list all 5 tools + 2 resources (not 2), and state the server is registered with Claude Code via `.mcp.json`, not Claude Desktop.
   - `MEMORY.md` pointer line for the MCP.
   - `mcp/README.md` — confirm tool set, and replace any Claude Desktop setup instructions with the Claude Code `.mcp.json` wiring.

---

## Phase 3 — Extend the MCP

### 3a. Shared validation (foundation for all write tools)

- Reuse `lib/schemas.js` rather than re-implementing validation. It imports **only** `zod` (verified — no browser Supabase client), so it is safe to import from the MCP.
- **Version caveat:** root pins `zod@^3.23.8`; `mcp/node_modules` currently resolves zod v4. Align them — add `"zod": "^3.23.8"` to `mcp/package.json` and reinstall so the MCP validates with the exact same zod the app uses. (Otherwise subtle v3/v4 behavior differences could let bad data through or reject good data.)
- MCP imports `validateContact`, `validateOrg`, `validateEvent` from `../lib/schemas.js`. **Do not** import `lib/services.js` — it pulls in the browser anon client (`lib/supabase.js`); the MCP must use its own service-role client already created at `mcp/server.js:30`.

### 3b. New write tools (highest priority)

Add a `CallToolRequestSchema` branch + a `ListToolsRequestSchema` entry for each. All writes follow the existing read→merge→validate→upsert pattern and respect the project's two hard invariants:

- **Next-action dual-field rule:** any tool that sets a next action must write BOTH the flat `next_action`/`next_action_date` fields AND a matching entry in the `next_actions[]` array (id, text, date, completed). Mirror the promotion logic in `saveContacts` at `lib/services.js:118`.
- **Validation-before-write:** run the full UI object through the matching Zod validator; skip + report on failure.

Proposed tools:
| Tool | Action |
|------|--------|
| `add_touchpoint` | Append a touchpoint `{date, summary, next_action?, next_action_date?}` to a contact/org; re-validate; upsert. |
| `set_next_action` | Set/replace a contact's next action — write flat fields + `next_actions[]` entry together. |
| `complete_action` | Mark a `next_actions[]` entry `completed: true` by id. |
| `update_relationship_status` | Change `relationship_status` (cold/cool/warm/active) on a contact or org. |

Each tool: fetch the current row via the existing `getContacts()`/`getOrgs()` helpers (`mcp/server.js:50-100`), mutate the in-memory object, validate, then upsert the merged row (SQL-promoted columns + full `data` blob) exactly as `lib/services.js` does.

### 3c. Optional reads (lower priority, add as useful)

`search_orgs`, `get_org_detail`, `stale_relationships` (overdue beyond cadence, grouped). These reuse `getOrgs()` and the existing `isOverdue`/`lastTouch` helpers (`mcp/server.js:32-46`).

### 3d. Event/org creation + research-protocol scaffolding

Deferred to a later pass once write tools are proven. Research-protocol tools would read `CRM Research Protocol.md` (already exposed as the `sprout://crm-protocol` resource) and scaffold new `ind_`/`org_` records.

---

## Critical files

| File | Change |
|------|--------|
| `.mcp.json` (repo root, **new**) | Register `sprout-crm` with Claude Code (command + args, no secret) |
| `mcp/.env` (**new, gitignored**) | Holds the new `sb_secret_` key + Supabase URL. User pastes the key here directly. |
| `mcp/server.js` | Load `mcp/.env` by explicit path; add write-tool definitions + handlers; import validators from `../lib/schemas.js` |
| `mcp/package.json` | Add `zod@^3.23.8` to align with root |
| `lib/schemas.js` | Reused as-is (no change expected) |
| `CLAUDE.md`, `MEMORY.md`, `mcp/README.md` | Sync tool list (5 tools + 2 resources) and switch setup docs from Claude Desktop to Claude Code `.mcp.json` |
| `claude_desktop_config.json` (Desktop) | Optional: remove the dead `sprout-crm` block. Not used by Claude Code. |

## Verification

1. **Wiring:** reload the VS Code window; confirm `sprout-crm` appears as an available MCP server in Claude Code.
2. **Key fix:** re-run the audit JSON-RPC harness (now reading `mcp/.env`) for `get_relationship_health` — expect live counts, not `Legacy API keys are disabled`.
3. **Reads:** call each of the 5 existing tools + both resources from within Claude Code; confirm non-error payloads.
4. **Writes (round-trip):** call `add_touchpoint` / `set_next_action` on a known test contact (an `ind_` id), then `get_contact_detail` and confirm the touchpoint/action persisted, and that BOTH `next_action_date` and a `next_actions[]` entry were written. Cross-check in the web app dashboard (reads `next_actions[]` first).
5. **Validation:** send a deliberately invalid write (e.g. bad status enum) and confirm it is rejected/skipped, not silently corrupting the row.

## Out of scope (this pass)

- Event RSVP write tools, org/event creation, research-protocol scaffolding (Phase 3d — later).
- No changes to the Next.js app UI or `lib/services.js`.
