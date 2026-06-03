# Sprout CRM Next — Changelog

---

## 2026-06-02 — Discord MCP re-established + verified live

Restored the **`discord`** MCP and verified it end to end. At session start `.mcp.json` had **no `discord` entry** (only sprout-crm/supabase/google-workspace) and it was missing from `enabledMcpjsonServers` — despite an earlier same-day changelog entry. Re-added both, re-set `DISCORD_TOKEN`, and walked the full Developer Portal bot setup again. **No app/data change** — config only.

- **Re-added** `discord` to `.mcp.json` (`cmd /c npx -y mcp-discord`, token via `${DISCORD_TOKEN}`) and to the project's `enabledMcpjsonServers` in `~/.claude.json`.
- **Bot/server already existed** from earlier today: app "Russel Sprout" (#2412), guild "Sprout Society" `1511441473512669244`, #general `1511441476561801410`. Re-confirmed the 3 privileged intents + minimal-perm invite.
- **Confirmed the `setx` → full-restart flow works:** after fully quitting and reopening VS Code, the server auto-logged-in at startup and `discord_get_server_info` returned the live guild (5 members). A window *reload* alone left `${DISCORD_TOKEN}` blank (extension host reuses the old env) — and manual `discord_login` re-runs timed out / fought the auth-once-at-startup lifecycle.
- **⚠️ Token re-pasted in chat → still needs a Reset Token** + re-`setx` + full restart.

---

## 2026-06-02 — Discord MCP connected (real bot)

Registered a **`discord`** MCP server with Claude Code so Claude can read+write Discord. Created a Discord server + bot from scratch and verified live end to end (read #general, send, delete). **No app/data change** — config only.

- **Server:** barryyip0625 `mcp-discord` (npm) over stdio, launched `cmd /c npx -y mcp-discord` (same pattern as supabase/slack). 22 tools: read/send/edit/delete messages, threads, reactions, webhooks, roles, members, channels.
- **Registered in** project `.mcp.json` as **`discord`**, token via `${DISCORD_TOKEN}` expansion (no secret in git). Added `discord` to the project's `enabledMcpjsonServers` in `~/.claude.json`. Not a reserved name — loaded normally.
- **Auth — real Discord bot** (contrast with Slack's browser token): app "Russel Sprout" in the Discord Developer Portal, all 3 privileged gateway intents enabled (Message Content, Server Members, Presence), invited with minimal perms (no Administrator). Bot token stored as Windows User env var `DISCORD_TOKEN` via `setx`.
- **New server, not the Slack community:** the Sprout Society channels live in **Slack**; this Discord "Sprout Society" guild (`1511441473512669244`) was created fresh just to host the bot.
- **⚠️ `setx` only reaches new processes** — a window reload is NOT enough to pick up `DISCORD_TOKEN`; **fully quit and reopen VS Code**, then the bot auto-logs-in. Verified live after restart: `get_server_info` + `read_messages` + `send` + `delete_message`.
- **⚠️ Token was pasted in chat → should be reset** (Reset Token, re-`setx`, full restart).

---

## 2026-06-02 — Slack MCP connected (browser-token / stealth mode)

Registered a **`slack`** MCP server with Claude Code so Claude can read+write Slack. Verified live (`channels_list` returned the workspace). All 5 project MCP servers green. **No app/data change** — config only.

- **Server:** korotovsky `slack-mcp-server@latest` over `--transport stdio`, launched `cmd /c npx -y …` (same pattern as supabase/discord). 15 tools incl. search, channels, DMs, history. Posting enabled via `SLACK_MCP_ADD_MESSAGE_TOOL=true` (all channels; can be scoped to channel IDs or dropped for read-only).
- **Registered in** project `.mcp.json` as **`slack`**, env via `${SLACK_MCP_XOXC_TOKEN}` + `${SLACK_MCP_XOXD_TOKEN}` expansion (no secrets in git). Added `slack` to the project's `enabledMcpjsonServers` in `~/.claude.json`.
- **Auth — stealth/browser token (no Slack admin needed):** `xoxc` pulled from `localStorage.localConfig_v2` token (Console), `xoxd` from the `d` cookie (Application → Cookies, URL-encoded, stored verbatim). Both stored as **Windows User env vars** via `setx` (same mechanism as `SUPABASE_ACCESS_TOKEN`).
- **⚠️ Browser tokens expire** as Slack rotates the session — when Slack tools start failing auth, re-pull both and re-`setx`, then reload the window. The tradeoff for skipping an admin-approved Slack app.
- **⚠️ stdio binds no port** — `SLACK_MCP_PORT` is SSE/HTTP-only. "Connecting…" in `/mcp` after a reload is just npx cold-start, not a port conflict.
- Also noted: a `discord` MCP entry (`mcp-discord`, `${DISCORD_TOKEN}`) is present in `.mcp.json`.

---

## 2026-06-02 — Multi-account Google Workspace MCP (Gmail/Drive/Calendar/Docs/Sheets)

Stood up a new MCP server that holds **multiple @sproutsociety.org accounts at once**, read+write. Two accounts connected and verified live (maxperkins@, hello@).

- **Server:** Taylor Wilsdon's `workspace-mcp` (PyPI), installed persistently via `uv tool install --python 3.12 workspace-mcp` → fixed launcher at `C:\Users\maxwe\.local\bin\workspace-mcp.exe`. Persistent install chosen over `uvx`-at-spawn to remove the editor-launch cold-start/PATH fragility.
- **Registered in** project `.mcp.json` as **`google-workspace`**, args `--tools gmail drive calendar docs sheets`, env points at gitignored OAuth creds + `OAUTHLIB_INSECURE_TRANSPORT=1` + `WORKSPACE_MCP_PORT=8000`. Also added to the project's `enabledMcpjsonServers`.
- **OAuth:** Google Cloud project "Sprout Workspace MCP", **Web application** client, redirect `http://localhost:8000/oauth2callback`, consent screen **Internal**. Client secret stored gitignored at `C:\Users\maxwe\.google-workspace-mcp\client_secret.json` (outside repo).
- **Account model:** per-user OAuth (each teammate runs `start_google_auth` once, token caches per email). Not service-account/domain-wide delegation — Max is not a Workspace super-admin.
- **⚠️ The gotcha that cost an hour:** the server name **`workspace` is RESERVED** in Claude Code — an entry named `workspace` in `.mcp.json` is **silently dropped** on every load (the `/mcp` panel just omits it). Surfaced only via `claude mcp list` ("reserved MCP server name and was not loaded"). Renaming the key to `google-workspace` fixed it instantly. **Lesson:** when a server won't appear in `/mcp`, run `claude mcp list` first to see config-level warnings.
- Validated: Gmail search + Drive list both return live data for each account.

---

## 2026-06-02 — Picture tutorial: de-em-dashed, reworded MCP cards, trimmed Part 2 + glossary

Edited `docs/guides/getting-started-tutorial.html` only. **No code/data change** — docs only, not committed.

- **Removed every em-dash in the file** (title, CSS comments, all display copy, and the JS-generated `Card X of N` hint). Each was restructured into a colon, period, or comma per the no-em-dash rule — not swapped for a comma.
- **Reworded five "Ask Claude" / "From your inbox" carousel cards** to match new prompt/response copy:
  - **Inbox / Catch up:** "Give me a list of everyone who I've responded and not responded to in the last two weeks." → "I have created folders for both categories and placed the appropriate email chains in each one. Let me know if you'd like me to draft responses for any or all."
  - **Add a person:** "Add Alina from barnun happy hour. She's an artist interested in SnT." → "New contact created and suggested next action. Let me know if you'd like to add or change anything."
  - **Orgs / log a win:** "Barnun agreed to host a spring event. Create an event for this on 6/30. Suggest a checklist and add anyone associated with Barnun to the contact list." → "Event page created, and here is the link. I also added the Google Sheets associated with this event to the links section. Let me know if you'd like anything else."
  - **File an email thread (now newsletter):** "Draft a newsletter advertisement for the Barnun spring event." → "A draft is saved in Newsletter drafts on the app. Feel free to edit and send. Or ask me to send it at a scheduled time." (Card title still reads "File an email thread onto the right group" — flagged to user, retitle pending.)
  - **Events:** "Create a repeated Sprout n Tell event the fourth Friday of every month for the next 3 months." → "Done. Let me know if you want to add any specific checklist or contacts. Or I can create suggested checklists to start from."
  - Fixed typos along the way (Srpout→Sprout, youd→you'd, save→saved, lowercase i→I).
- **Deleted the entire "Part 2: Daily basics" section** (The 4 things you'll actually do, ① morning check, ② find a person, ③ log a conversation w/ Log Touchpoint screenshot, ④ follow-up reminder).
- **Deleted the "Reference / Word list, in plain English" glossary section** (incl. the "That's the whole app." closing note and Back-to-top link).

---

## 2026-06-01 — Tutorial decks: Gmail MCP woven into both guides

Documented how the newly-connected **Gmail MCP** interacts with the CRM tools, across the two HTML guides. **No code/data change** — docs only.

- **Getting-started picture tutorial** (`docs/guides/getting-started-tutorial.html`): added a 3rd carousel card — **"📧 From your inbox"** — to the 5 email-relevant screens (Dashboard, Contacts, Orgs, Events, Outreach). Each card's "behind the scenes" box shows the two-MCP handoff: **① Gmail reads** (`search_threads`/`get_thread`) → **② Sprout CRM writes** (`check_existing` + `add_touchpoint`/`create_or_update_contact`), with preview-before-save called out. Newsletter left at 2 cards (send-side, not an inbox read). Added cyan email-badge + `.stage` styles, a third nav dot per updated carousel, a dynamic `Card X of N` hint (replacing the hardcoded "of 2"), and an intro note explaining the three cards.
- **MCP tools & workflows deck** (`docs/guides/mcp-tools-and-workflows.html`): also updated earlier in the session before the picture tutorial was identified as the intended target — added Gmail tie-in lines to the 4 tool-family slides, a new "Gmail MCP — your inbox as a source" concept slide, a new "Email → CRM in one pass" workflow slide (Five → Six workflows), and an `/email-to-crm` cheat-sheet row.
- Not committed to git.

---

## 2026-06-01 — Drive sheets → contact enrichment pass (28 contacts)

Scanned the two Sprout Society Drive spreadsheets and merged new detail into existing CRM contacts. **No code change** — data-only, all writes through the `sprout-crm` MCP merge tool (`create_or_update_contact`).

- **Sheets read (read-only, not modified):** `Sprout Society - Check-In (Responses)` (pronouns, neighborhood/zip, how-heard, what-they-want, accessibility) and `Show N Tell - Interest Form (Responses)` (showcase details, guests, contact info).
- **Process:** pulled all 52 contacts, fetched full detail on the 36 matched records to read existing notes, then merged with `overwrite:true` on notes only (existing notes preserved, new lines appended — other scalars untouched). Matched on name/email.
- **28 contacts updated.** Beyond notes: filled **Greg Smith**'s empty email (`info@gregsmithgroup.com`) + phone, added **Alexandra Galvis**'s website (`alexandragalvis.com`), fixed **Michael Ne Jame**'s first-name spelling (`Micahel` → `Michael`).
- The 6/1 check-in cluster (`ind_mpvhkubv*`) had only stub notes — these gained the full check-in detail. Showcasers gained medium/format specifics (Aidan, Bob, Tim, Franklin, Rachel, Michael).
- **8 skipped** (Javey, Robert DePippo, Julia Rudy, Jim Wang, Caroline, Sefriyel, George Curran, Leah Ward Rankin) — sheet rows only confirmed data already present.
- Not committed to git.

---

## 2026-06-01 — `/email-to-crm` skill + first live email→CRM pass + new `sprout_society` type

First execution of the Email → CRM protocol end to end, plus the skill that wraps it and a schema change the run required.

- **Built the `/email-to-crm` skill** (`.claude/skills/email-to-crm/SKILL.md`) — condensed runbook of the protocol doc, scope as `$ARGUMENTS`. Updated `docs/guides/email-to-crm-protocol.md`'s closing section from "not built yet" to point at the skill (doc remains source of truth).
- **Live replied-to pass (last 14 days):** Gmail MCP now authenticated to `maxperkins@sproutsociety.org`. Two real human counterparties found (rest were automated weekly briefings to self). Previewed, then on confirmation: **created Danielle Kastenbaum** (`ind_danielle_kastenbaum`, co-founder Sprout Society, both emails, website, warm, `email_sourced`, 6/1 newsletter touchpoint) and **enriched existing Morgan Kuriloff** (`ind_mpvhkubvn2if` — added SB Nation title, 6/1 touchpoint). Net 52 → 53 contacts (Morgan already existed).
- **New relationship type `sprout_society`** (label "Sprout Society"), added in all four required places: Zod enum `lib/schemas.js`, `REL_TYPES` in `CRMManager.jsx`, the two tool input-schema enums in `mcp/server.js`, and `docs/CRM-db-schema.md` (also backfilled the previously-missing `attendee`). Required two window reloads (Zod + server.js are loaded once at MCP start).
- Not committed to git.

---

## 2026-06-01 — Standing convention: visual commit slide on every delivery

No code change. Established a workflow preference: after every commit+push, also deliver a single self-contained HTML slide that visually details what was committed/pushed (cards/badges/icons + commit hash/branch, not plain bullets). Each slide is **built fresh to adapt to the specific commit** — no reusable template. Saved to memory as `commit-slide-on-delivery.md`. Trigger is an actual commit+push, not every chat turn; slides go in `docs/deliveries/` or `docs/guides/` with the path called out in the reply.

---

## 2026-06-01 — Email → CRM protocol doc (Gmail MCP + sprout-crm MCP orchestration)

Wrote a manual-trigger workflow for pulling CRM data out of Gmail. Documentation only — **no code change** (no `server.js`, no app, no data layer).

- **New file:** `docs/guides/email-to-crm-protocol.md`.
- **Design decision (leads the doc):** the capability is orchestration between two already-connected MCPs — Gmail MCP reads (`search_threads`/`get_thread`/`list_labels`), Claude parses + dedupes, the existing `sprout-crm` MCP writes. Deliberately **no Gmail reading built into `server.js`** — that would add OAuth + a second auth surface to a stable 14-tool server for no functional gain. Doc states this so a future session won't "fix" it by adding server code.
- **Four manual scopes**, each prompt → Gmail query → `check_existing` dedupe → preview → write: replied-to (`from:me newer_than:30d`), named person/thread, event-anchored (resolve `evt_` via `list_events`), label/date window (`label:` needs the ID from `list_labels`).
- **Seven safety rules:** preview-before-write + wait for confirm, dedupe first, bulk-exclusion at the query layer, write-through-tools-never-raw-SQL, `YYYY-MM-DD` dates. Field-mapping cheat sheet built from the live tool schemas. Honest gap: no dedicated event↔contact RSVP write tool, so RSVPs log as touchpoints + flag for manual linkage.
- Not committed to git.

---

## 2026-06-01 — Tutorial carousels: screenshot + "Ask Claude" MCP diagram per screen

Converted each of the 6 screen sections in `docs/guides/getting-started-tutorial.html` into a 2-card carousel. No app code or data-layer change.

- **Card 1** = the existing annotated screenshot (sticky-note drag-to-arrange still works). **Card 2** = an "Ask Claude" diagram showing the plain-English flow: *You type* (natural-language prompt) → *Behind the scenes* (the real MCP tool names that run) → *You get back* (the result).
- **Per-screen MCP examples** use real tools: Dashboard (`get_relationship_health` + `list_upcoming_actions`), Contacts (`create_or_update_contact` + `set_next_action`), Orgs (`add_touchpoint` + `update_relationship_status`), Events (`list_events`), Newsletter (`assemble_newsletter`), Outreach (`search_contacts` + `get_contact_detail`).
- **Navigation:** big circular black side arrows (fuchsia on hover, inset over the image edges), stretch-pill dot indicators, a live "Card 1/2 of 2" hint, and 45px touch-swipe support.
- **Diagram layout (after iteration):** vertical stack with down-arrows; size hierarchy flipped so the two ends dominate — *You type* 46px Caveat, *You get back* 30px bold, *Behind the scenes* de-emphasized (small dimmed tool chips). Shared `.mcp-flow` CSS so all six slides update together.
- Not committed to git.

---

## 2026-06-01 — Beginner picture tutorial (annotated sticky-note walkthrough)

Built a self-contained, non-technical "first-time user" tour of the app with real screenshots and hand-drawn-style sticky-note callouts. No app code or data-layer change.

- **New file:** `docs/guides/getting-started-tutorial.html`. Real screenshots captured by driving the live app with Playwright (added as a dev dependency), at 2× scale.
- **Design:** brand palette + Lato/Caveat fonts; each screenshot is a full-width frame with colored sticky notes (tape + number badge + slight rotation) placed on the relevant elements. Includes a **drag-to-arrange** mode ("✏️ Arrange notes" toolbar) that saves note positions to `localStorage`, with Reset + Copy-layout.
- **Slides (after iteration):** 1 Dashboard · 2 Contacts (merged list+detail: column labels over the dimmed list with Alexandra Galvis opened) · 3 Organizations (Barnun edit modal, Show-more expanded) · 4 Events (real 5/19 Show n Tell detail) · 5 Newsletter (fill-in-the-blanks editor + live preview) · 6 Outreach Log · then Daily basics (4 tasks, incl. the Log Touchpoint modal) · Word list. Import & Settings slide dropped per request.
- User has since started extending it into a **carousel** (each screen → screenshot slide + an "ask Claude" diagram slide); CSS for that is in the file.
- Not committed to git.

---

## 2026-06-01 — Added the official Supabase MCP server

Registered the official Supabase MCP (`@supabase/mcp-server-supabase`) with Claude Code for direct SQL / schema access, alongside the existing `sprout-crm` MCP. No app code or data-layer change.

- **`.mcp.json`:** new `supabase` server — `cmd /c npx -y @supabase/mcp-server-supabase@latest --project-ref=ixdnmjchvjzytyhmripc --access-token=${SUPABASE_ACCESS_TOKEN}`. Scoped to the project ref so it can't reach other Supabase projects; no secret committed (env-var expansion, per the global rule).
- **Auth:** Supabase Personal Access Token (PAT, `sbp_`), not the service-role key (the MCP uses the management API). Stored in the `SUPABASE_ACCESS_TOKEN` Windows user env var. First PAT was rotated after it briefly appeared in a screenshot; the live one is the replacement.
- **Verified** `list_tables` — all `sprout_*` tables visible (`sprout_contacts` 52, `sprout_orgs` 7, `sprout_events` 7, `sprout_newsletters` 0, `sprout_profile` 1). Reconfirmed shared-project debt with the social/QR/grant tools.
- **Decision: do not create `sprout_posts`.** `PostSchema.platform` is `["ig","nl"]` — Instagram (out-of-scope separate tool) + newsletter (superseded by `sprout_newsletters`). The dead `PostSchema` + save path should be removed rather than filled.

---

## 2026-06-01 — How-to slide deck: MCP tools & workflows

Built a self-contained HTML slide deck explaining the 14 MCP tools and the optimized everyday workflows, written for someone starting from zero on the CRM. No code or data-layer change.

- **New file:** `docs/guides/mcp-tools-and-workflows.html` (new `docs/guides/` folder for how-to / reference material).
- **17 slides:** what the CRM is → what an MCP tool is → the 14 tools by family (Read 5 / Write 4 / Create 2 / Research 3) → vocabulary (relationship ladder, cadence/next-action, readable IDs) → five workflows (morning health check, log interaction + follow-up, research → scaffold, bulk sheet merge, newsletter assembly) → rules of thumb → "say this → get that" cheat sheet.
- **Styling:** brand palette + Lato pulled from the app's `STYLES`/`C` constants; arrow-key/space navigation, progress bar, slide counter. Pure HTML/CSS/JS, opens in any browser.
- Not committed to git.

---

## 2026-06-01 — In-app Newsletter page (store + fill-in-the-blanks editor)

Built a Newsletter view in the app so past, current, and future issues live in the CRM with a workspace editor — not just as static template files driven by the MCP. Effort was medium (pattern-following CRUD + one new view); build passes clean.

**New `lib/newsletter.js` — shared template engine.** Ported the `assemble_newsletter` fill logic out of the MCP server's Node/`fs` context so the browser can render templates. Holds both templates as JS strings (monthly-roundup, quick-hit), `buildNewsletter()` (CRM auto-fill of recap + upcoming-event blocks → extract remaining `[brackets]` → substitute the user's copy; empty fields keep their bracket visible), `extractPlaceholders`, `esc`, `defaultMonthYear`, and exported `TEMPLATES` metadata. The MCP's own `assemble_newsletter` was left untouched (still reads its template files) to avoid risk; the engine is now importable there later for one source of truth.

**Data layer.** `NewsletterSchema` + `validateNewsletter` (`lib/schemas.js`); `fetchNewsletters` / `saveNewsletters` / `deleteNewsletterById` (`lib/services.js`) following the bridge-merge pattern (SQL columns `subject`/`status`/`send_date` promoted, full object in `data`). Fetch returns `[]` gracefully when the table is absent (`42P01`/`PGRST205`), so the view loads regardless. New table `sprout_newsletters` (id `nl_`-prefixed); DDL documented in `docs/CRM-db-schema.md` and **created in the `sprout-grant-tool` Supabase project** (`ixdnmjchvjzytyhmripc`).

**`NewsletterView` + `NewsletterEditor` (`components/CRMManager.jsx`).** List grouped into Drafts / Scheduled / Sent (past, current, future). New → template picker → editor: left form (subject, status, send date, month, recap/upcoming caps, spotlight contact) + a live `<iframe srcDoc>` preview on the right. Every remaining `[placeholder]` renders as a labeled textarea ("fill in the blanks"). Monthly-roundup auto-pulls recaps (completed events with a `recap`) and upcoming events from live CRM data. "Copy HTML" → paste into Mailchimp; status is a manual label (no real send), and the 📰 nav item sits between Events and Outreach. Wired into `loadAll`, state, and save/delete handlers in the main component.

**Note on shared Supabase project:** confirmed the CRM and its MCP both point at `ixdnmjchvjzytyhmripc` = the `sprout-grant-tool` project. Multiple tools are co-located there, separated only by the `sprout_` table prefix. A future migration to a per-tool project is just swapping the two env files (`.env.local`, `mcp/.env`) and recreating the `sprout_*` tables — no app code changes, since all DB access goes through `lib/services.js`.

---

## 2026-06-01 — Event contact list shows relationship type

`ContactRow` in the event detail view (`components/CRMManager.jsx`) now renders each linked contact's relationship type(s) as `type-tag` chips under the name (e.g. Music, Attendee, Partner), reading `relationship_types` with a fallback to the legacy `relationship_type` string. Matches the styling already used in the contact table and detail panel. Falls back to `c.title` only when a contact has no types set. Used by both the contacts strip and the "Show all" modal, since both render through `ContactRow`.

---

## 2026-06-01 — MCP Phase 4: creation/merge, research scaffolding, newsletter assembly

Extended the MCP from 9 → 14 tools across the three threads requested: record creation + research-driven merge, research-brief scaffolding, and newsletter generation from CRM data. Added a `recap` field to events end to end. Every new tool was live-tested over stdio with throwaway records, then cleaned up (no test residue left in Supabase).

**4a — creation + merge (`mcp/server.js`).** Added `create_or_update_contact` and `create_or_update_org`. They generate human-readable ids from the name (`ind_first_last` / `org_name`) on create, or merge into an existing record when an explicit `id` is passed. Merge is fill-empty by default — scalar fields only fill blanks unless `overwrite:true`, touchpoints append (deduped by date+summary), and `relationship_types` union — so a later, thinner research pass never clobbers verified data. Omitting the id on a name collision is rejected to prevent duplicates. Both honor the next-action dual-field rule and validate via the app's Zod (`validateContact`/`validateOrg`). New helpers: `slugify`, `fillScalar`, `mergeTouchpoints`, `unionArr`; core create/merge logic extracted into `applyContactInput`/`applyOrgInput` so the tools and `scaffold_from_research` share one path.

**4b — research scaffolding.** `check_existing` (Phase C dedupe — searches contacts AND orgs by name fragment or Instagram handle) and `scaffold_from_research` (lands a full Phase G brief: org created/merged first, then each individual with `org_id` auto-linked; per-record failures reported, not fatal to the batch). This gives `CRM Research Protocol.md` a write path into the CRM.

**4c — newsletter from the CRM.** Added `recap` to `EventSchema` (`lib/schemas.js`), the event edit modal overview tab and `BLANK_EVENT` (`components/CRMManager.jsx`). New `assemble_newsletter` MCP tool fills `docs/newsletter/01-monthly-roundup.html` from live data: recap blocks from completed events that have a recap blurb, upcoming-event blocks (rotating brand accents + date pills), footer/site from the org profile, and an optional spotlight name from a chosen contact. Returns a JSON summary (events pulled + remaining `[BRACKETS]`) followed by the assembled HTML; subjective copy (intro, spotlight blurb) stays bracketed for a human.

**Docs synced:** `CLAUDE.md` (Current State, MCP tool tables 5→14, Files), `mcp/README.md` (new tool tables).

**Verified + merged:** reloaded the VS Code window; all 14 tools confirmed live in-client (`check_existing` returned real data). Merged via PR #1 (merge commit `9d845fb`) into `main`; the additive `recap` field is now on the production Vercel site (defaults to `""`, no data migration). The relationship-type-chips change rode along in the same commit.

---

## 2026-06-01 — Newsletter templates + spreadsheet contact merge

Built an automated, low-effort newsletter system and a reusable spreadsheet-merge path, then ran the first real merge from Google Sheets.

**Newsletter templates** (`docs/newsletter/`). `01-monthly-roundup.html` — the main monthly send: thank-you + event recaps → upcoming events → membership CTA → member spotlight. `02-quick-hit.html` — short between-issues send (one recap, one event, one CTA). `event-recap-template.md` — a 2-minute recap form whose bottom "newsletter blurb" drops straight into the roundup. `README.md` — Mailchimp fill-in workflow (replicate + swap brackets) with a Gmail-BCC fallback. All 600px, table-based, inline-styled, brand palette (cyan/fuchsia/acid/banana on near-black). Membership block leads with the **scholarship / pay-it-forward** story: primary CTA = scholarship Google Form, secondary CTA = `https://givebutter.com/sproutmembership` (found in the Drive Calendar sheet).

**Spreadsheet merge UI** (`components/CRMManager.jsx`, `ImportView`). Added a "Merge spreadsheet" mode: paste tab/CSV copied from Google Sheets, auto-detect columns (email/first/last/phone/instagram/notes), dedupe by email, **fill-blanks-only** merge — new people added as `warm`, existing records never overwritten. Added an "Export newsletter list (CSV)" button: contacts with an email → Mailchimp-ready `First Name, Last Name, Email`. New module-level helpers `parseDelimited`, `detectSheetFields`, `buildSheetPlan`, `downloadNewsletterCsv`. `npm run build` passes.

**First Drive merge executed.** Connected the Claude-side Google Drive MCP to the account that can see two Google Form response sheets (Check-In Responses + Show N Tell Interest, owned by `danielle@sproutsociety.org`). Merged with email-first, name-fallback matching to avoid duplicating people already in the CRM without emails (used the match to backfill their missing emails instead). **Result: 38 → 52 contacts** — 14 new (warm), 9 enriched (phones, last names, one email, notes), 13 unchanged, 0 duplicates. 44 contacts now carry an email. Dry-run-then-write via a throwaway script (removed after).

**Deferred:** scheduled weekly auto-sync of the two Form sheets; in-app Drive button (needs Google OAuth in the Next.js app — only worth it for non-Claude self-serve).

---

## 2026-06-01 — MCP wired into Claude Code + read/write tools (Phases 1–3)

Executed all three phases of the MCP readiness/extension plan.

**Phase 1 — wire + unblock.** New `sb_secret_` key already in gitignored `mcp/.env`. Changed `mcp/server.js` to load that file by explicit path (`config({ path: join(__dirname, ".env") })`) instead of `import "dotenv/config"`, and consolidated the duplicate inner `__dirname` in the protocol-resource handler into one module-level definition. Added repo-root `.mcp.json` registering `sprout-crm` with Claude Code (full node.exe path, command + args only, no secret). Live JSON-RPC test confirmed `get_relationship_health` returns real data (52 contacts) — the legacy-key blocker is cleared.

**Phase 2 — verify + sync docs.** Tested all 5 read tools + 2 resources live; every one returned real payloads. Fixed doc drift in `CLAUDE.md` and `mcp/README.md`: full tool list, and setup docs switched from Claude Desktop to Claude Code `.mcp.json` wiring.

**Phase 3 — extend.** Aligned `mcp/package.json` to `zod@^3.23.8` (reinstall deduped mcp's zod v4.4.3 → 3.25.76, matching root). `server.js` now imports `validateContact`/`validateOrg` from `../lib/schemas.js` (not `services.js`) and adds `upsertContact`/`upsertOrg` helpers mirroring `saveContacts` promotion logic. Added 4 write tools — `add_touchpoint`, `set_next_action`, `complete_action`, `update_relationship_status` (9 tools total). Verified a sequential round-trip on a throwaway contact: touchpoints persist, the next-action dual-field rule holds (flat fields + `next_actions[]` written together), promoted `next_action_date` auto-advances on completion, and an invalid status enum is rejected with the Zod error rather than silently corrupting the row.

**Still pending:** reload the VS Code window so Claude Code loads `.mcp.json` and surfaces the 9 tools in-client (all tests invoked the server directly).

---

## 2026-06-01 — MCP audit + readiness/extension plan

Audited the MCP server and automation surface. **Blocker found:** the MCP's `SUPABASE_SERVICE_ROLE_KEY` in the Claude Desktop config is a legacy Supabase JWT that has been disabled — every tool returns `Error: Legacy API keys are disabled` (confirmed via live JSON-RPC test + direct REST 401). The web app's anon key already migrated to the new `sb_publishable_` format; the MCP key was missed. Fix requires minting a new `sb_secret_` key in the Supabase dashboard and swapping it into the config.

Also found doc drift: `mcp/server.js` actually exposes **5 tools** (`get_relationship_health`, `search_contacts`, `get_contact_detail`, `list_upcoming_actions`, `list_events`) + **2 resources** (`sprout://profile`, `sprout://crm-protocol`), not the 2 tools the docs claimed.

Wrote `docs/MCP-readiness-and-extension-plan.md` — three phases: swap the dead key, verify tools + sync docs, then add write tools (`add_touchpoint`, `set_next_action`, `complete_action`, `update_relationship_status`) reusing `lib/schemas.js` Zod validation (requires aligning `mcp/package.json` to `zod@^3.23.8`). No code changes this session — planning + audit only.

---

## 2026-05-28 — Memory system setup

Created `CLAUDE.md` and `CHANGELOG.md` for persistent session context. Current State moved to top of CLAUDE.md. Global `CLAUDE.md` updated to point Sprout CRM Next at these files. No code changes.

---

## [Session unknown] 2026-05-28 — CLAUDE.md created (superseded above)

Created `CLAUDE.md` and `CHANGELOG.md` to establish a persistent memory system matching the Composer's Compass pattern. Synthesized from existing memory files, git history, and codebase review. No code changes.

---

## [Session ~12] 2026-05-20 — CRM Research Protocol + MCP server

Added `CRM Research Protocol.md` (v1.1) — 7-phase research protocol (Phases A–G) for building records before outreach. Includes the Instagram Relationship-Building Protocol (Stages 1–4) with engagement sequence guidance. Added `mcp/server.js` — MCP server exposing live Supabase data to Claude Desktop via stdio. Tools: `get_relationship_health`, `search_contacts`.

---

## [Session ~11] 2026-05-23 — Dashboard next-action fixes + edit save

**Bug: dashboard next-action fallback.** Fixed `DashboardView` to fall back to `next_action`/`next_action_date` only when there are no *active* (non-completed, dated) `next_actions[]` entries. Previous check `!actions.length` blocked fallback when any completed entries existed; fixed to `!activeActions.length`.

**Bug: saveDashEdit.** `saveDashEdit` was defined as `(updated) => ...` and called as `onClick={onSave}` — so `updated` received the click event. Dashboard edits silently did nothing. Fixed to read `dashEditing` from closure.

**Sync: saveNewAction and addTp.** Both code paths now write to `next_actions[]` in addition to the legacy `next_action`/`next_action_date` fields. Dual-field invariant now enforced across all code paths.

---

## [Session ~10] 2026-05-20 — Contact filter update

Added/refined contact filtering in `ContactsView` — filter bar supports name search, relationship status, and relationship type filters.

---

## [Session ~9] 2026-05-15 — Events MVP v2

Added `EventsView` and `EventSchema`. Events support: name, date, status, location, description, contact RSVP (contact_ids / confirmed_ids), tags, links, checklist, next_actions, notes. Contact ↔ Event join is client-side via `contact_ids[]` in the event JSONB blob. No FK constraint. Bidirectional sync via contact edit modal events tab.

---

## [Session ~8] 2026-05-10 — DB schema doc v1.1

Corrected `docs/CRM-db-schema.md` to match live `schemas.js` and `CRMManager.jsx`. Added `attendee` to the `relationship_types` enum in contacts. Documented `next_actions_log` as a passthrough (not in Zod schema). Added full Events table schema.

---

## [Session ~7] 2026-05-05 — MVP v1 stress test

Stress-tested MVP v1 with real data. Fixed edge cases in the merge pattern and Zod validation. Established the schemas-sync rule after silent-skip bugs were traced to Zod enum mismatches.

---

## [Session ~6] 2026-04-28 — MVP v1

Initial working version with Supabase backend. Contacts (individuals), organizations, profile. `lib/services.js` pattern established. `lib/schemas.js` Zod validation layer added. Dashboard, ContactsView, OrgsView, ImportView, SettingsView all functional.
