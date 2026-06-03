# Connecting the Newsletter to Givebutter (via MCP)

> Setup guide, tool reference, and integration plan for wiring Givebutter into Sprout CRM.
> **Main goal:** Givebutter is where Sprout Society tracks email contacts, so the Newsletter connects to Givebutter as its **email audience**.
> Status: **not yet installed** — blocked on creating a Givebutter API key (Step 1 below).

---

## The goal, in one line

The CRM **builds** the newsletter. Givebutter **holds the email audience** (contacts + tags) and **sends** it (via Engage). The connection keeps those two contact lists in sync (two-way, matched by email) so the right people get the newsletter.

### Decisions locked in
- **Send path:** **Givebutter Engage** (replaces the old "Copy HTML → Mailchimp" step). The CRM produces the newsletter HTML; you paste it into Engage and send to a Givebutter segment/tag.
- **Sync direction:** **two-way**, contacts matched by **email address**. CRM ↔ Givebutter stay mirrored.

---

## ⚠️ Critical API constraint (shapes everything below)

I confirmed this against Givebutter's API spec:

| Capability | API support? | Consequence |
|------------|--------------|-------------|
| Create/update contacts | ✅ Full (POST/PATCH) | Two-way contact sync works |
| Contact **tags** | ✅ add / remove / **sync** | We can tag the newsletter audience programmatically |
| **Send an email** | ❌ **No endpoint** | Sending **stays manual in Engage UI** — paste the CRM's HTML |
| Messages (sent history) | ⚠️ Read-only (list/get) | We can *read* what went out, not send |
| **Segments** | ❌ No API | Segments are a Givebutter **UI** feature built on tags/filters. We drive the audience with **tags**, then build the segment once in the UI. |

**Bottom line:** the API does the **audience** half (sync contacts, set tags). The **send** half stays in Givebutter Engage by design. There is no way around this — Givebutter exposes no send API.

---

## How it fits the CRM

| Piece | Role | Lives in |
|-------|------|----------|
| Newsletter **content** | Template → fill-in-the-blanks → HTML | CRM (`NewsletterView`, `lib/newsletter.js`, `sprout_newsletters`) — **already built** |
| Newsletter **audience** | Email contacts + tags | **Givebutter** (source of truth for emails) |
| Newsletter **send** | Paste HTML into Engage, target a tag/segment | Givebutter Engage UI |
| **Contact sync** | Keep CRM `sprout_contacts` ↔ Givebutter contacts mirrored by email | Givebutter MCP (this) orchestrated with the `sprout-crm` MCP |

The current send path in the app is "Copy HTML → Mailchimp." **This becomes "Copy HTML → Givebutter Engage."** No newsletter-builder code has to change for the MCP-first phase — the HTML it already produces pastes straight into Engage.

---

## The server

Community MCP server: **[johnnylinsf/givebutter-mcp](https://github.com/johnnylinsf/givebutter-mcp)**

- 65 tools across the full Givebutter API (read + write), including all the contact + tag tools we need
- Bearer-token auth via the `GIVEBUTTER_API_KEY` env var
- stdio transport (matches our other servers)
- **Not on npm** — needs `git clone` + `npm run build`, then `.mcp.json` points `node` at the built `dist/index.js`. (Differs from our usual `npx -y` one-liners.)

---

## Setup instructions

### Step 1 — Create the Givebutter API key (do this first; keys show **once**)

1. Log into Givebutter → **Settings** (left menu)
2. **Developers** tab → **API** sub-menu
3. **New API key** → name it `claude-code-crm` → **Create**
4. **Copy the key immediately** — Givebutter hashes it and never shows it again

### Step 2 — Store the key as a Windows User env var

Matches the `DISCORD_TOKEN` / `SUPABASE_ACCESS_TOKEN` pattern (no secret in git):

```powershell
setx GIVEBUTTER_API_KEY "gb_live_xxxxxxxxxxxxxxxx"
```

> ⚠️ **`setx` only reaches NEW processes.** A window reload is **not enough** — the extension host keeps the old environment and `${GIVEBUTTER_API_KEY}` stays blank. **Fully quit and reopen VS Code.** (Same gotcha bit us with `DISCORD_TOKEN`.)

### Step 3 — Clone + build the server (Claude can do this)

Clone **outside** the repo so it isn't committed, then build:

```powershell
git clone https://github.com/johnnylinsf/givebutter-mcp.git C:\Users\maxwe\mcp-servers\givebutter-mcp
cd C:\Users\maxwe\mcp-servers\givebutter-mcp
npm install
npm run build
```

Produces the entry file at `…\givebutter-mcp\dist\index.js`.

### Step 4 — Register with Claude Code (`.mcp.json`)

Add a `givebutter` key alongside the existing servers. Command + args only, secret via `${...}` expansion:

```json
"givebutter": {
  "command": "node",
  "args": ["C:\\Users\\maxwe\\mcp-servers\\givebutter-mcp\\dist\\index.js"],
  "env": { "GIVEBUTTER_API_KEY": "${GIVEBUTTER_API_KEY}" }
}
```

### Step 5 — Enable + restart

1. Add `"givebutter"` to this project's `enabledMcpjsonServers` in `~/.claude.json` (the silent-drop lesson — servers omitted here never load).
2. **Fully quit and reopen VS Code** (not just reload — see the `setx` gotcha).
3. Verify in `/mcp`. If it doesn't appear, run `claude mcp list` to check for a load error.

---

## The newsletter workflow, end to end (once connected)

```
1. CRM  →  build newsletter (NewsletterView → fill-in-the-blanks → HTML)
2. SYNC →  reconcile audience: CRM sprout_contacts  ⇄  Givebutter contacts (by email)
           tag the recipients in Givebutter (e.g. "newsletter")
3. ENGAGE → in Givebutter UI: New Email → paste the CRM's HTML
           → target the "newsletter" tag / saved segment → send
4. READ  →  later, pull Messages (sent history) back to confirm what went out
```

Steps 1 (build) and 3 (send) already exist as manual moves. **The MCP adds Step 2** — the contact/tag sync that makes the Engage audience trustworthy — and Step 4 reporting.

### Two-way sync logic (matched by email)
- **CRM → Givebutter:** for each `sprout_contacts` record with an email, ensure a Givebutter contact exists (create/update), and `sync tags` to include `newsletter`. New CRM people show up in the Engage audience.
- **Givebutter → CRM:** pull Givebutter contacts; for any not in the CRM, `check_existing` (dedupe) then `create_or_update_contact`. Donors/subscribers who only exist in Givebutter become tracked CRM relationships.
- **Conflict rule:** email is the match key. When both sides differ, prefer the CRM for relationship fields (notes, next actions) and Givebutter for contactability (email status, tags). Preview before writing — never bulk-overwrite.

This mirrors the `/email-to-crm` orchestration: read from one MCP, dedupe, **preview, wait for confirm**, then write through the other MCP's tools. No raw SQL.

---

## Tools this MCP provides (65 total)

The ones that matter for the newsletter are **bold**.

| Category | Count | Capabilities |
|----------|-------|--------------|
| **Contacts** | 7 | **list, get, create, update, delete, restore, + tags & activities** |
| Campaigns | 5 | list, get, create, update, delete |
| Transactions | 3 | list, get, update (donations — useful for donor segments) |
| Campaign Members | 3 | list, get, delete |
| Campaign Teams | 3 | list, get, delete |
| Campaign Tickets | 3 | list, get, create |
| Discount Codes | 4 | list, get, create, update, delete |
| Households | 6 | CRUD + contact grouping |
| **Messages** | 2 | **list, get (read sent-email history)** |
| Webhooks | 6 | full CRUD + activities (future real-time sync) |
| Pledges / Tickets / Payouts / Plans / Funds | ~5 each | varying read/write |

API base: `https://api.givebutter.com/v1/` (contacts at `/v1/contacts`, tags at `/v1/contacts/{id}/tags`).

---

## What this unlocks (newsletter-focused)

**Audience management (the headline)**
- "Sync everyone in the CRM into Givebutter and tag them `newsletter`" → Engage audience is always current
- "Pull Givebutter contacts the CRM doesn't have yet" → new subscribers become tracked relationships
- "Tag all contacts who attended [event] as `event-attendee`" → Engage segment for a targeted send
- "Tag donors who gave to [campaign]" (uses Transactions) → donor-only newsletter segment

**Reporting**
- "What emails went out last month and to how many people?" (Messages, read-only)
- Cross-reference Givebutter send history with CRM touchpoints

**Cross-tool** (you already orchestrate Drive/Slack/Discord)
- New CRM contact → push to Givebutter → tag → ready for next send
- Newsletter recap → Slack `#sprout-links` or Discord after it goes out

---

## Layer 2 — app-code integration (deferred, decide later)

Everything above is **MCP orchestration, no app code**. If/when the manual paste-into-Engage and on-demand sync feel like too much, the optional next layer:

- **In-app "Sync audience to Givebutter" button** on `NewsletterView` — runs the two-way reconcile server-side, reusing `GIVEBUTTER_API_KEY` (server-only, never `NEXT_PUBLIC_`).
- **Store a `givebutter_contact_id` + email-status** on `sprout_contacts` so the CRM shows who's a current subscriber / unsubscribed.
- **Scheduled sync** (cron or Givebutter **webhooks**) to keep lists fresh without a manual run.
- Replace the "Copy HTML → Mailchimp" label/button with **"Copy HTML → Givebutter Engage"** + a deep link to the Engage compose screen.

Still **not** possible at any layer: triggering the actual send via API. Engage send stays a human action.

---

## Resume checklist (for tomorrow)

- [ ] **Step 1** — create the Givebutter API key (Settings → Developers → API → New API key)
- [ ] Paste the key to Claude, or `setx GIVEBUTTER_API_KEY "…"` yourself
- [ ] Let Claude clone + build the server and wire `.mcp.json` + `enabledMcpjsonServers`
- [ ] **Fully restart VS Code**, then verify in `/mcp`
- [ ] First tests: "list my Givebutter contacts" and "list recent Engage messages"
- [ ] Decide the `newsletter` tag name and create one saved **segment** in the Engage UI (one-time, API can't)
- [ ] Run a small two-way sync on a handful of contacts (preview first), then do a real Engage send from the CRM-built HTML

---

*Sources: [Givebutter API auth](https://docs.givebutter.com/api-reference/authentication) · [API index (llms.txt)](https://docs.givebutter.com/llms.txt) · [Engage outbound email](https://help.givebutter.com/en/articles/6523588-how-to-create-an-outbound-email) · [Contact segments](https://help.givebutter.com/en/articles/5489011-how-to-filter-contacts-and-save-segments) · [givebutter-mcp repo](https://github.com/johnnylinsf/givebutter-mcp)*
