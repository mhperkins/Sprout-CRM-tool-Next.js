# Sprout CRM Next — Changelog

---

## 2026-06-03 — Sheet reconciliation pass (analysis only, no changes)

Deduped the three real contact sheets surfaced by the links pull against the live CRM roster (~130 contacts, matched by email): **Check-In (21 rows), Show N Tell – Interest Form (23 rows), Luma Attendees/Subscribers (45 rows) → 0 net-new contacts.** Everyone with real contact info is already in the CRM. The Luma sheet is the original donor/member base; Show N Tell "guest names" are headcount notes, not leads. Flagged (not acted on): a Luma row with display name "Tyler Ricci" but first/last "Jake Fleshner". `sprout_newest_followers` excluded per Max — it's an IG triage sheet, not contacts. No code or data change.

---

## 2026-06-03 — "How did you hear about us" contact field + key-links reference memory

App code + data + memory change (`lib/schemas.js`, `components/CRMManager.jsx`, `mcp/server.js`; `npm run build` passes).

**New `how_heard` field (referral/attribution):**
- Added `how_heard` (optional string, JSONB-only, defaults `""`) to `ContactSchema`.
- Surfaced in the **Add** modal, **Edit** modal, and **detail panel** ("How they heard:").
- **Sheet/CSV importer** now auto-detects a "how did you hear / referral / source" column (`detectSheetFields`), merges it (`NL_MERGE_FIELDS`), and sets it on new imported records.
- **MCP** `create_or_update_contact` accepts `how_heard` (input schema + `applyContactInput` merge via `fillScalar`). Requires a window reload before the running server picks it up.
- **Populated 14 existing contacts** from the Sprout Society Check-In (Responses) sheet, matched by email, via one `jsonb_set` batch (no SQL column to sync). Skipped the Test row and a junk "." answer.

**Reference memory — org links:**
- Created `memory/sprout-key-links.md` cataloguing 18 links pulled from the master "Sprout Society - Links" Google Doc, the `#sprout-links`/`#sprout` Slack channels, and Givebutter `get_campaign`: membership, scholarship, Luma, Discord, 6 Google Forms, 7 key Drive files. Indexed in `MEMORY.md`.

**Follow-ups:** referral-name answers (Cody, Izzy, Jesse, etc.) map to existing contacts but are stored as literal text — a future pass could resolve them into a referral graph.

---

## 2026-06-03 — Donor contact list shows Campaign (Givebutter) instead of Affiliation

App code change (`components/CRMManager.jsx` only; `npm run build` passes). Display-only — no data-side change. The **Campaign** field (visible) + hidden **`campaign_id`** (rename-proof Givebutter key in the `data` JSONB blob, never rendered) were already built a prior session and already populated on every donor at import time, so this session only added the two display surfaces.

- **List column:** in the Donors bucket the header reads **Campaign** with a 🎗 chip showing `c.campaign`; Community/Prospects keep **Affiliation** with the 🏢 org chips. One conditional on the `<th>` and the `<td>`.
- **Detail panel:** donors get a new **Campaign (Givebutter)** section (🎗 chip), rendered only when `contact.campaign` is set, placed above Affiliations.
- The hidden `campaign_id` was untouched and is still never shown.
- Note: `CAMPAIGN_OPTS` is a synced static snapshot, not a live pull — say "refresh the campaign list" after any Givebutter campaign add/rename.

---

## 2026-06-03 — Open-web enrichment pass on the imported IG prospects + orgs

Data-only (no app code). After the first IG import landed, the Desktop research flagged that some accounts (Polo Bear, Havi Tatu, the `@goldenarmyfitness_j` "Staton" lead) have off-IG web footprints. Max asked for an independent research pass on all the new prospects + orgs. This is the complementary half of the two-surface split: Desktop+Chrome reads IG directly; Claude Code in VS Code reads the open web.

- **Method:** pulled the 15 imported prospects + 3 orgs from the CRM (handles + notes), ran **6 parallel research agents** (WebSearch/WebFetch) over clustered targets, each told to report only source-cited facts and never fabricate a name/email/location.
- **Write path:** merged every verified finding into the **existing** records via the `sprout-crm` MCP merge tools (all returned `merged:true`, no new rows). Each record got blank `email`/`website`/`phone` filled, a dated `— WEB ENRICHMENT (open web, 2026-06-03)` block appended to `notes`, and a `[research]` touchpoint logged.
- **Best finds:**
  - **Jesse Staton** (`ind_jesse_goldenarmy`) — surname **confirmed** (Jesse Staton, male; not "Jessica"); founder/CEO **Golden Army Fitness LLC**, Brooklyn; "Soul Aligned" = a content series, not a business; runs a "Readers" literacy + mental-wellness initiative (strong Sprout fit); press in Disrupt + CanvasRebel. Set `last_name="Staton"`.
  - **Kyra Bowie** (`ind_kyra_bowie`) — public **email kyrabowie@gmail.com** + site; AEA stage manager, full credit list, Transcend Streaming producer.
  - **Aliana / Cozy By Aliana** (`ind_aliana_cozy`) — **email cozybyaliana@gmail.com** + Big Cartel shop; SUNY Oneonta (Digital Art + Psychology); **Long Island confirmed, no Brooklyn dates** (geo gap real); surname still unknown.
  - **Bar Nun** (`org_bar_nun`) — "The Bar Nun Life LLC", founder **Cullie Poseria**, **namaste@barnun.life / 929-295-6644**, recurring free "Dry Social" events (next 6/7) — confirms a live dry-happy-hour partner.
  - **Floorwork Arts Collective** (`org_floorwork_collective`) — Brooklyn interdisciplinary theatre collective, founded Spring 2024; co-founder **Mara Einson is an existing CRM contact** (`ind_mpvhkubvmyq9`) → linked as `primary_contact_id`.
  - Also enriched **Avi Ash** (Bed-Stuy, born ~1992, $1,250–3,000 price band), **Jonathan Puente** (NY/LA/London reach, AD/Elle Decor/NYFW press), **Fabian Guhl** (full name Fabian-Carlos Guhl, "Harmonic Water Flow"/Watsu, Oceanic Ventures Retreats).
- **Two flags raised:**
  - ⚠️ **Comadre Crafts** (`org_comadre_crafts`) — the handle `@comadrecrafts` resolves to a **San Diego, CA** maker pop-up (Krysta Hughes & Patricia Nieves), not a Brooklyn org. Likely a name-only triage mismatch; record flagged, Max to re-confirm the handle before any outreach.
  - 🔎 **Polo Bear** (`ind_polo_bear`) — do **not** conflate `@poloirpcu` with "AC2BSK", a separate documented Bushwick "Polo" muralist; no off-IG identity found for `@poloirpcu` itself.
- **Thin off-IG (need the browser surface):** Lauren Wax (etc.pr's site/email/clients aren't publicly indexed — behind the IG bio link), Haley Sumner, Havi Tatu, Polo Bear — details live on IG/YouTube only.

---

## 2026-06-03 — First live IG import (21 records) + dedupe/merge pass

Data-only (no app code). Max imported the first real batch of Instagram deep-dive JSONs — 6 orgs + 15 individuals from the @sproutsocietyorg follower scrape — then asked for validation and a dupe check. Found and resolved 3 cross-id duplicates against earlier May scans.

- **Validation first:** ran all 21 records through the real `validateContact`/`validateOrg` Zod gates (throwaway script, mirroring the import path with the forced `segment:"prospect"`). **21/21 valid, 0 skipped.** Enums, `YYYY-MM-DD` dates, `next_actions[]` shape, `email:null`, org role tokens in `tags` — all clean.
- **Dupe check (via `check_existing` on all 21 handles):** 18 clean, **3 collisions** — each an old May record under an auto-id colliding with the new clean-slug import. The import only dedupes on **exact `id`**, so auto-id (`org_mph7megb6x54`) vs slug (`org_bar_nun`) couldn't collide → duplicates. In every case the *old* record held the true relationship and the new import had wrongly reset it to a fresh prospect.
- **Merged 3 → kept the clean slugs, folded in the real history, deleted 4 stray rows:**
  - **Bar Nun** (`org_bar_nun`): status → `active`; folded in the Sprout Happy Hour collab (1×/month) + "sober events in Brooklyn" + the 5/12 touchpoint. Deleted `org_mph7megb6x54`, `org_mp2wv8ddgsq2`.
  - **Avi Ash** (`ind_avi_ash`): → **Community**/`active`; folded in the 5/19 Show n Tell Reddit history, 2 touchpoints, the Danielle next-action log. Deleted `ind_mossl72vzb75`.
  - **Aliana** (`ind_aliana_cozy`): → **Community**; preserved her "Follow up about SnT" (6/05) action + dry-happy-hour note alongside the new collage outreach. Deleted `ind_mpn2uirwwq20`.
  - Net: Avi + Aliana correctly left Prospects (already engaged).
- **Name placeholders (Max's call):** the 3 no-name records were kept (not dupes) with their IG handle copied into `first_name` until real names surface — `ind_polo_bear` → `@poloirpcu`, `ind_rsri` → `@melodysri21`, `ind_zinnergy` → `@zinnergy`.
- **Method:** all merges/deletes via `supabase` MCP `execute_sql` (targeted `jsonb_set` to preserve every other field + keep promoted SQL columns in sync; verified survivors before deleting). No app code changed.
- **Open idea:** extend the donor cross-check into a general handle/email pre-check in the Import preview so *any* existing match (not just donors) gets flagged before it creates a cross-id duplicate.

---

## 2026-06-03 — Imports all land in Prospects + one-click "Move to" bucket changer

App code change (`components/CRMManager.jsx`; `npm run build` passes; uncommitted at session start, committed by this update). Simplified how the import routes contacts across the Community/Donor/Prospect buckets, and added a fast way to reclassify afterward.

- **The question:** with three contact lists now, how does the import know where to put each person? Orgs are easy (they have no segment, they just land in Orgs). The community-vs-prospect-vs-donor split is the hard one because the three buckets are knowable in different ways (donor = a verifiable money fact; community = already engaged; prospect = a target you haven't built the relationship with yet).
- **Decision = keep it dead simple:** **all imports land in `prospect`.** No per-record segment logic in the JSON, no decision tree for the research surface to follow. `prepareImportItem` now forces `segment:"prospect"` on every imported individual, overriding whatever the JSON says. A fresh follower scrape is by definition a list of prospects.
- **Givebutter donor cross-check (harmless bonus):** before validation, each imported person is matched against existing CRM donors (the 26 from the Givebutter import live in the CRM as `segment:"donor"`). A match by **id, email, or @handle** auto-upgrades prospect → donor and shows it in the preview as a heal note (`matched existing donor → Donors`). Catches the rare re-import of someone who already gave.
- **New "Move to ▾" control in the contact detail panel:** a `Bucket: [current]  Move to ▾` line under the status row. Click → pick one of the other two buckets → instant move + toast, no modal, no save, no confirm (deliberate single action, reversible). The Edit-modal Bucket selector (with its confirm) still exists for when you're already editing. Triage now happens in one click after reading the person, instead of three clicks deep in the Edit modal.
- **Consequence flagged:** re-importing an existing contact by id resets their bucket to prospect unless they match a donor. For the fresh-follower pipe that's the intended behavior.

---

## 2026-06-03 — IG deep-dive JSON contract doc + where CRM research actually runs

Docs only, no app code or data change. New `docs/guides/ig-deep-dive-json-contract.md`. The session clarified a platform reality and produced a Desktop-readable output contract for the Instagram research workflow.

- **Where IG research runs (the clarification):** Max asked Claude Code (VS Code) to scrape @sproutsocietyorg's recent followers and save a triage sheet. **Claude Code in VS Code cannot scrape Instagram** — it has no browser bridge (no browser-control tool, no MCP to point at; a plain WebFetch can't log into IG or render its virtualized followers modal). **The scrape + deep research must run in Claude Desktop, which is wired to the Claude-in-Chrome extension** — that's the surface driving the logged-in IG session and reading the DOM (what "through web search" always meant). Division of labor: **Desktop+Chrome = research/scrape surface; Claude Code (VS Code) = landing zone** (filter, `check_existing` dedupe, import).
- **Settled workflow order:** (1) Desktop+Chrome scrapes followers → lean triage sheet. (2) Max verifies, picks keepers. (3) Desktop+Chrome deep-researches **only the keepers** and emits import-ready JSON (its research protocol drives the research; our contract defines the output shape). (4) JSON comes back to Claude Code → `check_existing` per handle → merge dupes, import the rest. Triage sheet first, deep dives only on verified keepers; never import unverified people.
- **New doc — `docs/guides/ig-deep-dive-json-contract.md`:** a self-contained, Desktop-readable restatement of the import JSON contract so the research project can consume it without reading the codebase. Covers the two silent-failure modes (Zod strips unknown keys; one invalid enum drops the whole record), full org + contact examples using real accounts from Max's scrape, the allowed-enum table with the common traps (`arts`, `musician`, `photographer`, `community builder` with a space), ID format, priority-role→`tags` mirroring (orgs have only `tags` for roles), the mandatory dual `next_action`/`next_actions[]` rule, touchpoint shape, the "fold tier/confidence into notes trailer" rule, and a "thin/unsure accounts → leave out, don't fabricate" section. Companion to `instagram-to-crm-import-spec.md`, but written for the research surface rather than this project.
- **Live-run status:** Desktop produced a ~20-row triage sheet (e.g. `@floorworkco`, `@barnun.life`, `@jonathanpuentephoto`, `@cozzybyaliana`, `@comadrecrafts` flagged art/event_host/org; most others "no visible signal"). Deep dives happen in Desktop next; JSON returns here for dedupe + import.

---

## 2026-06-03 — Deliveries organized into date subfolders

Housekeeping + convention change, no app code or data change. Reorganized `docs/deliveries/` so every delivery slide lives in a per-day subfolder.

- **Reorg:** moved the existing flat slides into `docs/deliveries/<YYYY-MM-DD>/` — `2026-06-01/` (1 slide) and `2026-06-03/` (Instagram-import-pipe + the day's other slides). Moves done with `git mv`; tree clean.
- **Convention updated** in CLAUDE.md (gitignored, local): End-of-Session Protocol **step 4** and the standing delivery-slide note now say to save the slide to `docs/deliveries/<YYYY-MM-DD>/`, creating the folder on the day's first delivery. All deliveries from the same day live in that day's folder.

---

## 2026-06-03 — Instagram → CRM import pipe: spec, tags field, hardened import, org type tags

App code + docs change (`lib/schemas.js`, `components/CRMManager.jsx`, new guide). `npm run build` passes. Designed the **two-surface workflow** for bringing Instagram followers into the CRM and hardened the import path that receives them. **Not committed before this entry** — stacks on the three prior same-day uncommitted changes (segments, donor campaign selector, affiliations).

- **Why two-surface, not a rebuild:** investigated how the user previously scraped IG ("through web search" turned out to be **Claude in Chrome** driving their logged-in session and reading the DOM — not Composio, not the API, not a hosted scraper). The official IG Graph API blocks follower enumeration and user search entirely; `business_discovery` only reads other Business accounts' public posts. Conclusion: keep the browsing in **Claude in Chrome** (more accurate — authenticated session + adaptive profile visits; Playwright would share the same DOM-virtualization ceiling and add an auth handicap), and make **this project the clean landing zone**.
- **Import spec** (`docs/guides/instagram-to-crm-import-spec.md`, new): the exact JSON contract Claude in Chrome must emit so records land with zero silent loss. Documents the two silent-failure modes (Zod strips unknown keys; invalid enum drops the whole record), the org/contact/touchpoint shapes, the dual `next_action`/`next_actions[]` rule, dedupe-via-`check_existing`, and a priority-classification table. Verified the example JSON against the real schemas with a throwaway script (deleted).
- **`tags` field** added to `ContactSchema` + `OrgSchema`. Closes a latent bug: `ImportView` already passed `tags` through, but neither schema had the field, so Zod silently stripped every tag on every import. Now free-form labels (`instagram_sourced`, `nyc`, `wellness`) and role tokens persist and are filterable. Additive, non-enum — no schemas-sync risk, defaults to `[]`.
- **Import view hardened** (the landmine fix): the preview now runs the real Zod validators per record and shows **✓ ready / ✗ will be skipped** with the field error, instead of silently dropping records in `saveContacts`. Added an **auto-heal** layer (`normalizeImportRecord`) that fixes predictable enum slips before validation — `musician→music`, `artist/arts→art`, `community builder→community_builder`, `host/organizer→event_host`, plus `segment`/`status`/`category` synonyms and legacy singular `relationship_type→relationship_types[]`. Each fix shows as "↻ auto-fixed:"; unmappable roles coerce to `other` (record survives) rather than dropping. Import button reports skipped count and is disabled when nothing valid.
- **Priority roles across people AND orgs:** the four high-signal roles (`music`, `art`, `event_host`, `community_builder`) auto-mirror from a contact's `relationship_types` into `tags`. Orgs (no `relationship_types` field) store the same tokens in `tags` directly, so one filter value spans both record types. `partner`/`attendee`/`other` stay low-signal/untagged.
- **Org type tags (UI):** new **Type column** on the Orgs list rendering role chips with the same `type-tag` styling + `REL_TYPES` labels the Contacts list uses (reads `o.tags`, role tokens only). Added the same multi-select **Type picker** (Music / Art / Event Host / Community Builder, via new `ORG_ROLE_TAGS` constant) to the org Add + Edit modals, toggling tokens in `tags`. `tags:[]` added to the org blank state.

---

## 2026-06-03 — Comms Manager proofed the Sprout n Tell IG caption + first retro loop

Virtual-agency work, no app code or CRM data change. Ran the Instagram caption for the first Sprout n Tell through the **Communications Manager** agent (spawned via the Agent tool with its `_v1` system prompt), then closed the retro loop into the prompt.

- **Proof + alternates:** Comms flagged the caption's issues (hype words "HUGE"/"amazing", all-caps shouting, stiff "if/then" CTA, "Sprout n Tell's" wrong apostrophe → "Sprout n Tells", "signup" → "sign up"; no em dashes present) and delivered a clean revision. On request it produced 3 alternates (short/punchy, warm/reflective, recurring-detail-first). Max chose the **first revision** (recap + thank-you angle).
- **New work-log convention:** created `virtual-agency/employees/Communications/work-log.md` — an append-only ledger for small one-off deliverables (caption proofs, quick edits) that don't merit a `sprints/` file. Logged this entry with the selected copy. Distinction recorded: `sprints/` = planned multi-task work, `briefs/` = per-issue newsletter intake, `work-log.md` = ad-hoc deliverables.
- **Retro loop into the system prompt:** captured *why* the chosen caption beat the alternates (anchored in the real event vs. describing the concept; concrete physical image over abstract praise; gratitude naming real actions; CTA woven into the warmth, not bolted on) and promoted those four durable lessons into a new **"Learned style preferences (retro notes)"** section under Sprout Voice in `communications-manager-system-prompt_v1.md`. The work log holds the case file; the system prompt is what actually trains future copy (the agent doesn't read the log between sessions).
- **Files:** `virtual-agency/employees/Communications/work-log.md` (new), `virtual-agency/employees/Communications/system-prompts/communications-manager-system-prompt_v1.md`.

---

## 2026-06-03 — Givebutter contacts imported into the Donors tab

Data-only pass (no app code change). Pulled the full Givebutter contact + transaction set via the `givebutter` MCP and loaded **26 records** into the Donors segment, each assigned to its actual campaign.

- **Source:** `list_contacts` (30 contacts, 2 pages), `list_transactions` (24 transactions, 2 pages), `list_campaigns` (5). Campaign per donor came from the **transaction record** (not guessed). `total_contributions` confirmed to be in **cents** (matches `last_donation_amount` dollars); used the transaction `amount` (dollars) for `financial_relationship.total_given`.
- **Write path:** the MCP `create_or_update_contact` tool exposes no `segment`/`campaign`/`financial_relationship` params, so the import ran through a throwaway `scripts/import-donors.mjs` that mirrors `saveContacts` exactly — same `validateContact` (Zod) gate + SQL-column promotion (`id, record_type, first/last, email, relationship_status, next_action_date, data`) — upserting `sprout_contacts` with the **service-role key** (RLS-safe). All 26 validated clean (0 skips). Script deleted after the run.
- **Per donor:** `segment="donor"`, `campaign` + `campaign_id`, `relationship_status="warm"`, `financial_relationship {has_given, total_given, grant_history:[]}`, address + alt-contacts in `notes`, and a dated `touchpoint` ("Donated $X to <campaign> via Givebutter") carrying their giving-space message where present.
- **Dedupe (CRM side):** Jodi Kaplan ×3 → 1 `ind_jodi_kaplan` (kept the record with the gift + address; alt phone in notes); Danielle Karlik ×2 → 1 `ind_danielle_karlik` (alt email `dcoren11@gmail.com` + alt phone in notes). **Danielle Kastenbaum skipped** — staff, already `ind_danielle_kastenbaum`, $0. Household links noted: Adam↔Chelsea Lieb (shared email), Madeleine Kassimir↔Maddee Siegel (shared phone).
- **Zero-dollar contacts:** Chelsea Lieb + Maddee Siegel imported as `cold`, no campaign, `has_given:false` (in the donor system, no gift recorded).
- **Reconciliation:** Sprout Society x Designs that Donate = **23 donors / $1,735** — an exact match to the campaign's reported `raised`/`donors`. Support Sprout Society = 1 / $10 (Pranav Kadam).
- **⚠️ Open:** the 3 Jodi + 2 Danielle duplicates still exist **in Givebutter itself** (only the CRM was deduped); the Givebutter API key was exposed in chat earlier and should be rotated.

---

## 2026-06-03 — Affiliations: contacts link to orgs AND events as badges

App code change + a data pass. Renamed the contact "Organization" link to **"Affiliation"** and turned it into a multi-select of organizations and/or events, shown as badges. Builds on the same-day contact-segments + campaign work (all still uncommitted).

- **Data pass first (no code):** the 13 untyped event-attendee contacts got `relationship_types:["attendee"]` + a note recording the event attended and what they want (only from check-in data; "not specified" where blank). Added to their event's attendee list: 11 walk-ins → **Show n Tell** `evt_mordmhe4e6nj` (23→34 `contact_ids`), Remy Litvin + Kingsley Udoyi → **Sprout Happy Hour** `evt_mph6ux3tk6un` (1→3). Event-membership edits went through `execute_sql` on the `data.contact_ids` blob (no MCP event-write tool exists); contact type/notes went through the `create_or_update_contact` MCP tool. Flagged that Kingsley's check-in is dated 5/26, not the 5/28 happy hour.
- **Design decisions (asked, user chose):** (1) event affiliations **reuse the existing `event.contact_ids` attendance link** — one source of truth, the 🗓/✓ badges + RSVP screens stay in sync (vs. a separate list that could drift); (2) orgs become **multiple** (`org_ids` array) vs. the old single link; (3) rename scope = **contact views only** (the Organizations section keeps its name).
- **Data model:** new `org_ids` array on `ContactSchema` (JSONB). Legacy `org_id` SQL column kept and mirrors `org_ids[0]` for backward compat + the MCP. `lib/services.js` migrates `org_id → org_ids` on read (`mergeContact`) and re-mirrors `org_ids[0] → org_id` column on write (`saveContacts`). **Zero migration** — existing single-org contacts auto-upgrade on read.
- **New `AffiliationField` component** (`CRMManager.jsx`): removable chips (🏢 orgs cyan, 🗓 events banana) + a search dropdown grouped into **Organizations** / **Events** sections, multi-select. Wired into Add modal (events staged in `_pendingEventIds`, applied to `event.contact_ids` on save), Edit modal (live toggle via existing `toggleEventLink`), the detail panel (new "Affiliations" section), and the contact table (column renamed Organization→Affiliation, renders org chips; events already show as name-adjacent 🗓/✓ badges).
- **Files:** `lib/schemas.js`, `lib/services.js`, `components/CRMManager.jsx`. `npm run build` passes clean. Not committed yet.
- **Follow-up:** MCP `create_or_update_contact` still takes single `org_id` (works, migrates on read) — add a multi-org param if explicit MCP control is wanted.

---

## 2026-06-03 — Donor campaign selector (synced from Givebutter)

App code change. Added a **Campaign** field to the donor segment, pulled from the live Givebutter campaign list. Builds on the same-day contact-segments work (still uncommitted).

- **New fields on `ContactSchema`:** `campaign` (title string) + hidden `campaign_id` (stable Givebutter id). Both in `lib/schemas.js`. Used `z.string()` for `campaign`, **not** a strict enum, deliberately: a campaign renamed/removed in Givebutter would otherwise fail validation and silently drop the contact (the silent-validation invariant). `campaign_id` survives a rename, so a future donor→campaign auto-sync has a stable key.
- **Sync model = synced static list** (user's choice over a live API route). `CAMPAIGN_OPTS` constant in `CRMManager.jsx` holds the 5 campaigns pulled via the `givebutter` MCP (`list_campaigns`), each with its `id`. The deployed browser app can't reach the MCP, so this is refreshed manually ("refresh the campaign list" → re-pull + update the constant). No new API route, no API key in the app env.
- **Campaigns synced (id):** Powered by Community (643783, unpublished), Support Sprout Society (634555), Sprout Society Membership (635382), Sprout Society Membership Scholarship (642585), Sprout Society x Designs that Donate (619527, event).
- **UI:** searchable `SearchSelect` dropdown (value = title) in both Add + Edit contact modals, shown **only when Bucket = Donor**. Selecting a campaign sets `campaign` + `campaign_id` together via a `campaignIdFor()` lookup. The id never shows in the UI; it's written to the `data` JSONB blob.
- **Files:** `lib/schemas.js`, `components/CRMManager.jsx`. `npm run build` passes clean. Not committed yet.

---

## 2026-06-03 — Contact segments: Community / Donors / Prospects tabs

First **app code change** in several sessions. Split the Contacts page into three in-page tabs (segments) over the single `sprout_contacts` table — no new tables, no DB migration.

- **Backend model:** new `segment` field on each contact (`"community" | "donor" | "prospect"`), stored in the `data` JSONB blob. Missing value reads as `"community"`, so all existing contacts auto-land in Community with zero migration. Added to **both** `lib/schemas.js` (`ContactSchema` enum, defaults to `community`) and the UI constants — the schemas-sync rule, or saves get silently dropped (the `sprout_society` lesson).
- **One table, three filtered tabs:** the Contacts view renders one list scoped by an active `segment` state. Tab row (Community | Donors | Prospects) with live per-bucket counts; sidebar still shows a single "Contacts" item. Decided against separate tables (would fork services/schemas/MCP/dashboard for no gain).
- **One bucket per contact, warn-don't-block:** Add + Edit modals both have a **Bucket** selector. On edit, moving a contact to a *different* bucket than where it started pops a confirm ("…currently in Community… moves them into Donors. Continue?"); cancel reverts, moving back to the original bucket doesn't warn. No hard constraint. Extended `ConfirmModal` with optional `title`/`confirmLabel`/`danger` (existing delete callers unaffected via defaults).
- **New contacts** default to the active tab's bucket; "+ Add" button and counts are bucket-aware.
- **Donor logic = manual label** (user's choice). `financial_relationship.has_given` is still present if auto-derivation from Givebutter giving is wanted later.
- **Files:** `lib/schemas.js`, `components/CRMManager.jsx`. `npm run build` passes clean. Not committed yet.
- **Follow-up:** MCP write tools (`create_or_update_contact`) and Import JSON don't set `segment` yet — those contacts default to Community. Add `segment` to the `mcp/server.js` inputSchemas if explicit MCP control is wanted.

---

## 2026-06-03 — Givebutter MCP connected + verified live

Connected the **Givebutter MCP** end to end (the audience/email-contact integration planned 2026-06-02). **No app code or data change** — MCP registration + config only.

- **Server:** community **johnnylinsf/givebutter-mcp** (65 tools, Bearer auth via `GIVEBUTTER_API_KEY`, stdio). Cloned outside the repo at `C:\Users\maxwe\mcp-servers\givebutter-mcp`, `npm install` + `npm run build` → `dist/index.js`. Not on npm, so `.mcp.json` points `node.exe` at the built entry (unlike our `npx -y` servers).
- **Config:** added `givebutter` key to `.mcp.json` (`node dist/index.js`, env `GIVEBUTTER_API_KEY` via `${...}` expansion — no secret in git) + added `givebutter` to this project's `enabledMcpjsonServers` in `~/.claude.json`.
- **Auth:** user had only a Givebutter **login**, not an API key — created one in the UI (Settings → Developers → API → New API key, `claude-code-crm`). Stored as a Windows User env var via `setx GIVEBUTTER_API_KEY` (same pattern as `DISCORD_TOKEN`); **full VS Code restart** to pick it up (setx-only-reaches-new-processes gotcha).
- **Verified live (both smoke tests pass):** `list_contacts` → **30 real contacts** (2 pages; donations, tags, subscription status, addresses). `list_messages` → empty (0 Engage sends yet, expected).
- **Data findings:** duplicate contacts present (Jodi Kaplan ×3, Danielle Karlik ×2) — dedupe before any sync. One contact tagged `DTD`. No `newsletter` tag or saved segment yet (UI-only, must be created once).
- **⚠️ Loose ends:** (1) API key was pasted in chat → rotate + re-`setx` to clean. (2) No send API confirmed in practice — Engage send stays manual.

---

## 2026-06-02 — Virtual Agency stood up + first employee (Communications Manager) + newsletter intake templates

Docs/scaffolding only, **no app/data change**. Mirrored the Composer's Compass `virtual-agency/` setup into the CRM repo and built the first AI employee.

- **New folder `virtual-agency/`** mirroring Compass's pattern (folder-based system-prompt "subagents," invoked via `claude --system-prompt …` or the Agent tool — **not** `.claude/agents/` files). Structure: `virtual-agency.md` (org doc) + `employees/Communications/{system-prompts,sprints,briefs}/`.
- **`virtual-agency.md`** — Sprout Society org doc: agent roster (Communications [first build], Grant Manager, CRM Manager, Social Media), Agile/PMBOK framework, shared-memory = the `sprout-crm` MCP, build order, Current State.
- **Communications Manager (first employee)** — owns the newsletter/outbound voice. `system-prompts/communications-manager-system-prompt_v1.md` + `communications-manager-jobDescription.md`. Grounded in the real newsletter stack: starts every roundup from `assemble_newsletter`, fills brackets in Sprout voice, stages drafts in Gmail (Max sends). Carries Max's writing rules + a Sprout warm/non-corporate voice section + a flag-don't-invent rule for thin CRM data.
- **Fill-in templates (the "info from me" the agent needs):** new `docs/newsletter/spotlight-template.md` (mirrors the existing `event-recap-template.md`; who → their thing → why now → human detail → paste-ready blurb, Pat Hopkins worked example). New per-issue intake form `virtual-agency/employees/Communications/briefs/_newsletter-intake-TEMPLATE.md` (recaps + spotlight + CTA + subject in one fillable doc) and a pre-filled `briefs/newsletter-2026-06.md` (CRM facts filled, only blurbs blank).
- **Agent wired to the intake:** session protocol now reads `briefs/newsletter-<month>.md` as the authoritative source for subjective copy; hands Max the template to fill if none exists. README + job description updated to list the two new templates.
- **CRM landscape pulled (for the June issue):** **zero events marked `completed`** (so `assemble_newsletter` returns no recaps) though several May events already happened (Show n Tell 5/19, Sprout Happy Hour 5/28, Community Coworking x3, Game Night 5/26); only true upcoming = Sprout n Tell 6/26. Decisions captured in the June brief: Monthly Roundup, spotlight = Pat Hopkins, CTA = become a member.

---

## 2026-06-02 — Sprout n Tell Vol. 1 recap (graphic blocks) in monthly roundup + Canva-limits finding

Docs only, **no app/data change**. Built the inaugural Sprout n Tell recap as HTML, then learned where Canva automation stops.

- **New files:** `docs/newsletter/SnTv1_monthly-roundup.html` (the deliverable — `01-monthly-roundup.html` with Sprout n Tell as the lead recap block) and `docs/newsletter/SnTv1_event-recap.html` (standalone, holds the IG caption). Source: `SnTv1_event-recap-template.md`.
- **Two user corrections shaped it:** (1) it's a **monthly roundup** with the recap as **one block**, not a standalone event newsletter; (2) the recap must be **graphic text blocks, not prose** — rebuilt as a card with a black title bar, a clean photo placeholder box, and four color-coded chip rows (🎤 Live Music / 🎧 DJ Sets / 🎨 Art / 📸 Photo Booth) + a bold cap line. Shoutouts treated as the highlights; photos deferred to placeholders.
- **Wrote fresh copy:** newsletter blurb (in the roundup) + IG caption (standalone file only).
- **⚠️ Canva MCP finding (the durable lesson):** no automated path gives a design that is **both pixel-exact and fully editable**. `import-design-from-url` imports **flat/non-editable**; `generate-design` is **AI-interpreted** (editable but not exact — user rejected all candidates); `perform-editing-operations` edits **only pre-existing elements** (can't draw new shapes). Verified end to end: pushed HTML to throwaway branch `canva-import-sntv1` → imported to Canva design `DAHLehCW_7A` (flat). **User moved to Claude design (claude.ai)** with HTML + screenshots + a structured brief instead.
- **Cleanup:** both recap files committed + pushed to **main** (commit `9bc1cfc`); throwaway branch `canva-import-sntv1` deleted local + remote. Flat Canva import `DAHLehCW_7A` left in the user's Canva account (harmless, delete via UI if wanted).

---

## 2026-06-02 — Givebutter ↔ Newsletter integration plan + setup doc

Planning/research session for connecting **Givebutter** (Sprout Society's email-contact system of record) to the CRM, with the **Newsletter** as the anchor use case. **No code/data/config change** — produced one doc: `docs/guides/givebutter-mcp-setup.md`.

- **Goal clarified across two passes:** not donor enrichment — the main function is the **Newsletter's email audience**. Send path = **Givebutter Engage** (replaces the "Copy HTML → Mailchimp" step); contact sync = **two-way, matched by email**.
- **⚠️ Hard API constraint confirmed against the spec:** Givebutter has **no send endpoint** — Engage email sending is **UI-only**. `Messages` is **read-only** (list/get sent history). **No Segments API** (segments are a UI feature on tags/filters). **Contacts + tags are fully writable** (create/update, add/remove/**sync tags**). So the API does the *audience* half; the *send* stays a human action in Engage. No workaround exists.
- **Chosen server:** community **[johnnylinsf/givebutter-mcp](https://github.com/johnnylinsf/givebutter-mcp)** — 65 tools, Bearer auth via `GIVEBUTTER_API_KEY`, stdio. **Not on npm** → needs `git clone` + `npm run build`, `.mcp.json` points `node` at `dist/index.js` (differs from our `npx -y` one-liners). Plan to clone outside the repo at `C:\Users\maxwe\mcp-servers\givebutter-mcp`.
- **Workflow designed (MCP orchestration, no app code):** CRM builds HTML → sync/tag audience CRM⇄Givebutter (preview before write, dedupe via `check_existing`, mirrors `/email-to-crm`) → paste HTML into Engage + send to a tag/segment → read Messages to confirm. Two-way conflict rule: email is the match key, CRM owns relationship fields, Givebutter owns contactability.
- **Blocked on the user creating an API key** (Settings → Developers → API → New API key; shown once). Then: `setx GIVEBUTTER_API_KEY` (full VS Code restart, not reload), clone+build, wire config + `enabledMcpjsonServers`.
- **Layer 2 (deferred):** in-app "Sync audience to Givebutter" button, `givebutter_contact_id`/email-status on `sprout_contacts`, scheduled/webhook sync.

---

## 2026-06-02 — Shared-drive sheets → Slack `#sprout-links` (first `slack` MCP use)

First real task on the new `slack` MCP: posted all 5 Google Sheets from the "Sprout Society Team" shared drive (`0AABHYS_tIU_6Uk9PVA`) as links into a new `#sprout-links` channel (`C0B7Y3GAPKK`). **No app/data change** — Drive→Slack orchestration only (`search_drive_files` mimeType filter → `conversations_add_message`).

- **Mapped the stealth Slack MCP's limits:** no file upload (`files.upload`), no channel create (`conversations.create`), no message delete. So "sheets as actual files" is impossible on browser-token auth — post Drive links instead; the user created `#sprout-links` by hand. Real uploads/channel-creation would need a bot-token Slack app.
- **Stale channel cache:** a just-created channel isn't in `channels_list` (roster cached at startup), but `conversations_add_message` resolves `#name` live and posts fine.
- **Link formatting:** default `content_type` is `text/markdown`, where Slack's `<url|label>` renders literally. Use markdown `[label](url)` or Block Kit `mrkdwn` `<url|label>` for clickable titled links (used Block Kit).
- User connected Slack's **official Google Drive app** (File Previews ON) so Drive links unfurl as rich cards. Decided **no Slack Workflows** needed — those are for unattended/scheduled automation; the MCP covers on-demand.

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
