# Sprout CRM Next — Changelog

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
