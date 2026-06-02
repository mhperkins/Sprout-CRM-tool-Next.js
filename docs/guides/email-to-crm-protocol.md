# Email → CRM Protocol

> How Claude turns Gmail into CRM data on a **manual prompt trigger**, using the existing Gmail MCP for reading and the existing `sprout-crm` MCP for writing. No `mcp/server.js` change required.

---

## Why there is no server.js change (read this first)

The cleanest, most stable way to ship this is to **add zero code to the `sprout-crm` MCP server.** The capability is an *orchestration* between two already-connected MCP servers, driven by Claude in-session:

```
Gmail MCP (read)  →  Claude (parse + dedupe)  →  sprout-crm MCP (write)
```

- The `sprout-crm` MCP stays exactly as it is — same 14 tools, same Zod validation, same merge rules. Nothing in the working server is touched, so nothing in it can regress.
- All inbox access goes through the **Gmail MCP** (`mcp__claude_ai_Gmail__*`), which is read-only here (`search_threads`, `get_thread`, `list_labels`).
- All CRM writes go through the **existing** `sprout-crm` write tools, which already enforce the dedupe → merge → validate → upsert pattern and the next-action dual-field rule.

Building Gmail reading *into* `server.js` would mean adding OAuth, token storage, and a second auth surface to a stable server. That is strictly more risk for no functional gain. **Do not do it.** This protocol is the supported path.

---

## Prerequisites

- The **Gmail MCP** is connected and authenticated in this Claude Code session. (It authenticates interactively, so it may be absent in headless/cron runs — see *Known limits*.)
- The **`sprout-crm` MCP** is connected (repo-root `.mcp.json`).
- You are working in the Claude Code extension in VS Code (per project platform rule).

---

## Non-negotiable safety rules

These are what keep the workflow "bug-free and stable." Claude must follow all of them on every run.

1. **Preview before any write.** Always list what was found — who is new, who is an existing match, and the exact touchpoint/next-action text to be written — and **wait for explicit confirmation** before calling any `sprout-crm` write tool. Nothing reaches Supabase unprompted.
2. **Always dedupe first.** Before creating any record, call `check_existing` with the name and/or Instagram handle. If a match returns, **merge into that id** — never create a parallel record. (Omitting the id on a name collision is rejected by the MCP anyway, but checking first lets Claude choose merge vs. create deliberately.)
3. **Strip bulk mail at the query layer**, not after. Every search excludes automated/marketing noise: `-category:promotions -category:social -from:noreply -from:no-reply`. This is the single biggest noise reducer.
4. **Require human-to-human signal.** Prefer threads the user actually participated in (a sent reply) or named explicitly. Do not scaffold contacts from one-off inbound blasts.
5. **Write through the tools, never raw.** All writes use `create_or_update_contact` / `create_or_update_org` / `add_touchpoint` / `set_next_action` / `scaffold_from_research`. Never bypass them with `mcp__supabase__execute_sql` — that skips Zod validation and the dual-field rule.
6. **Dates in `YYYY-MM-DD`.** Touchpoint and next-action dates use the email's send date (or today if none), formatted `YYYY-MM-DD`.
7. **Do not guess identity.** If an email address can't be confidently tied to a person/org (shared alias, ambiguous display name), surface it for the user to decide rather than auto-creating.

---

## The four scopes

Each scope is a natural-language prompt from the user. Claude maps it to a Gmail query, reads, dedupes, previews, then writes on confirmation. The user does **not** need exact syntax — the example phrasings below all route correctly.

### Scope 1 — Replied-to (people you've engaged)

**Triggers:** "Pull people I've emailed back this month", "who have I been corresponding with", "catch up the CRM from my sent replies".

**Gmail query:**
```
from:me newer_than:30d -category:promotions -category:social
```
(adjust the window: `newer_than:14d`, `after:2026/05/01`, etc.)

**Procedure:**
1. `search_threads` with the query → collect the **counterparty** address(es) on each thread (the `to:` you replied to, not yourself).
2. For each distinct person: `check_existing` by name/handle.
3. `get_thread` (FULL_CONTENT) on threads where a touchpoint summary is warranted.
4. Preview: new people to create, existing people to log a touchpoint on.
5. On confirm:
   - New → `create_or_update_contact` (no `id`; include `email`, `first_name`, `last_name`, a `touchpoints` entry, and `tags: ["email_sourced"]`).
   - Existing → `add_touchpoint` on the returned `ind_`/`org_` id.

### Scope 2 — Named person or thread

**Triggers:** "Log my thread with Alexandra Galvis", "what's the latest from Barnun", "add my back-and-forth with Jane to the CRM".

**Gmail query:**
```
from:alexandra OR to:alexandra
```
(use the actual name/email; add `newer_than:` to bound it.)

**Procedure:**
1. `check_existing` for that person/org → get the target id.
2. `search_threads` → `get_thread` (FULL_CONTENT) on the relevant thread.
3. Summarize the exchange into one touchpoint `summary` (1–3 sentences: what was discussed, any commitment).
4. Preview the summary + any follow-up.
5. On confirm: `add_touchpoint` with `id`, `date`, `summary`, and — if the email implies a follow-up — `next_action` + `next_action_date` (the tool writes the dual-field entry for contacts automatically).

### Scope 3 — Event-anchored

**Triggers:** "Find RSVPs for Show n Tell in my inbox", "who emailed me about the event", "pull attendees for the 5/19 show".

**Gmail query:**
```
subject:("Show n Tell") OR "Show n Tell" newer_than:60d -category:promotions
```

**Procedure:**
1. `list_events` (status `upcoming` or `completed`) → resolve the event name to its `evt_` id and date.
2. `search_threads` on the event name/subject → identify senders who are RSVPing/attending.
3. For each sender: `check_existing` → merge or create the contact.
4. Preview the attendee list mapped to the event.
5. On confirm: create/merge each contact via `create_or_update_contact`, and log an `add_touchpoint` noting the RSVP. *(Event↔contact RSVP linkage lives in the Events view; if a write tool for attendee linkage doesn't exist yet, log the RSVP as a touchpoint and flag the linkage for manual entry — do not invent a field.)*

### Scope 4 — Label or date window you control

**Triggers:** "Scan my `crm` label", "process the last two weeks", "import everything I tagged for follow-up".

**Gmail query:**
```
label:<LABEL_ID> -category:promotions
```
**Important:** `label:` needs the label **ID**, not its display name. Resolve it first with `list_labels` and match the user's spoken name (e.g. "crm") to its `id`. For date windows use `newer_than:14d` or `after:YYYY/MM/DD before:YYYY/MM/DD`.

**Procedure:** same as Scope 1, but the query is the label/date filter. Optionally add "threads with a back-and-forth" by preferring threads with 2+ messages where one is `from:me`.

---

## Standard run sequence (applies to every scope)

1. **Interpret** the prompt → pick scope → build the Gmail query (always with the bulk-exclusion suffix).
2. **Read** — `search_threads`, then `get_thread` only where a body is needed.
3. **Dedupe** — `check_existing` per candidate; decide merge (pass id) vs. create (omit id).
4. **Preview** — present a compact table: *name · email · new-or-existing · action to take*. Stop and wait.
5. **Write** — on confirmation, call the `sprout-crm` write tools. Per-record failures are non-fatal (especially via `scaffold_from_research`); report them.
6. **Report** — summarize what was written, with the affected ids, so the user can spot-check in the app.

---

## Field-mapping cheat sheet

| Email signal | CRM write | Key fields |
|--------------|-----------|------------|
| New human you replied to | `create_or_update_contact` (no id) | `first_name`, `last_name`, `email`, `relationship_status: "cool"`, `tags: ["email_sourced"]`, one `touchpoints[]` entry |
| New org / company | `create_or_update_org` (no id) | `name`, `email`, `category`, `tags: ["email_sourced"]` |
| Existing person, new exchange | `add_touchpoint` | `id`, `date`, `summary` (+ optional `next_action`/`next_action_date`) |
| A commitment you made in the reply | `set_next_action` or the `next_action` arg on `add_touchpoint` | `id`, `text`, `date` |
| A full multi-person brief | `scaffold_from_research` | `org` + `contacts[]` (org_id auto-linked) |

Default new-contact status is `cool` (you've had contact but it's early) unless the thread clearly shows an active relationship.

---

## Known limits

- **Pull-on-request only.** This is a manual trigger by design. Unattended scanning would need a scheduled agent (`/schedule`) running this sequence — and the Gmail MCP's interactive auth may not survive a headless run.
- **No de-dupe on email address alone.** `check_existing` matches on name fragment / IG handle. If a known contact emails from an unrecognized address, match by name and merge — don't create a duplicate.
- **Event RSVP linkage** is managed in the Events view; until/unless a dedicated MCP write tool exists, RSVPs are logged as touchpoints and the attendee linkage is flagged for manual entry.
- **Shared Supabase project** caveat (`ixdnmjchvjzytyhmripc`) is unchanged by this protocol — it only uses the `sprout_`-prefixed write tools.

---

## Slash command

Built as the `/email-to-crm` skill at [.claude/skills/email-to-crm/SKILL.md](../../.claude/skills/email-to-crm/SKILL.md). It takes the scope as an argument (e.g. `/email-to-crm replied-to last 30 days`) and is a condensed runbook of this file. **This doc remains the source of truth** — keep the skill in sync when the protocol changes.
