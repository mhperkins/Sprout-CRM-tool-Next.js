# Sprout CRM MCP Server

An MCP server that wraps the Sprout CRM's live Supabase database as tools Claude can call mid-conversation. Instead of copy-pasting CRM data into Claude, Claude queries the database itself.

## What it exposes

**Tools**

| Tool | What it does |
|---|---|
| `get_relationship_health` | Status counts, overdue contacts (cadence logic), upcoming next actions |
| `search_contacts` | Filter by name, status, relationship type |
| `get_contact_detail` | Full contact record with touchpoints and next actions |
| `list_upcoming_actions` | All pending next actions across contacts, orgs, and events |
| `list_events` | Upcoming events with contact and action counts |

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

## Connect to Claude Desktop

### 1. Get your Supabase service role key

Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Settings → API**.
Copy the `service_role` secret key (starts with `eyJ...`). Use this — not the anon key — so the server can bypass RLS.

### 2. Add to claude_desktop_config.json

> **Windows Store version note:** If you installed Claude Desktop via the Setup installer (which creates a Windows Store / MSIX package), the "Edit Config" button opens the wrong file. The app reads from a virtualized path instead. Edit this file directly:
> ```
> C:\Users\<you>\AppData\Local\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json
> ```
> That file already has a `"preferences"` key — add `"mcpServers"` alongside it at the root level.

Open Claude Desktop → **Settings → Developer → Edit Config**, and add:

```json
{
  "mcpServers": {
    "sprout-crm": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["C:/Users/maxwe/OneDrive/Desktop/Claude/Apps and Tools/sprout-crm-next/mcp/server.js"],
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "https://ixdnmjchvjzytyhmripc.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "YOUR_SERVICE_ROLE_KEY_HERE"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

The server connects on startup. You should see "sprout-crm" listed in the MCP tools panel.

---

## Local testing (optional)

Create `mcp/.env` with:

```
NEXT_PUBLIC_SUPABASE_URL=https://ixdnmjchvjzytyhmripc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key-here
```

Then run:

```bash
node server.js
```

If it starts without throwing, the credentials are valid.

---

## Demo conversation

Open Claude Desktop and ask:

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
Claude Desktop
  ↕ MCP protocol (stdio)
sprout-crm-next/mcp/server.js (Node.js)
  ↕ Supabase SDK (service role)
Live Supabase database
```

Transport is stdio — the server runs locally as a child process of Claude Desktop. No deployment needed.
