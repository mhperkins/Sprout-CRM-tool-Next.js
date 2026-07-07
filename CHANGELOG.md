# Sprout CRM Next — Changelog

---

## 2026-07-07 — Deliveries reorganized into month folders

Housekeeping only, no app code or data change. Reorganized `docs/deliveries/` so each per-day slide folder now nests under its month.

- **New two-level structure:** `docs/deliveries/<YYYY-MM>/<YYYY-MM-DD>/`. Created `2026-06/` (15 date subfolders: 2026-06-01 … 2026-06-26) and `2026-07/` (3 date subfolders: 2026-07-03, 2026-07-06, 2026-07-07). Only the months already present were added.
- Tracked date folders moved via `git mv`; the untracked `2026-07-07` moved with a plain move.
- **Convention updated** in CLAUDE.md End-of-Session Protocol step 4 + the standing delivery-slide note: slides now go in `docs/deliveries/<YYYY-MM>/<YYYY-MM-DD>/` (create the month folder on the month's first delivery, the date folder on the day's first delivery).

---

## 2026-07-07 — Members bucket in Contacts

Added a new **Members** bucket to Contacts (Community · Members · Donors · Prospects), mirroring the existing segment pattern. App code + schema only. Build passes. **Effort: low** (additive, JSONB-only, zero migration).

- **`member` added to the contact `segment` enum** in four sync points: the Zod enum (`lib/schemas.js`), the `SEGMENTS`/`SEGMENT_OPTS` UI constants (`components/CRMManager.jsx`), the import synonym map `_SEGMENT_MAP`, and the newsletter Send-to-list bucket dropdown.
- Existing contacts default to Community (`nullish→"community"`), so no data migration.
- The bucket flows automatically into the tab row, Add/Edit Bucket selectors, the detail-panel Move-to control, per-bucket counts, and the CSV export button (all map over `SEGMENT_OPTS`). Members get the ⬇ Export CSV button (emailable bucket, unlike Prospects).
- The server send route filters generically by segment (no hardcoded allowlist), so `member` sends work with no route change.
- Notes: the MCP `create_or_update_contact` tool still can't set `segment` (agent-created contacts land in Community); `member` is a manual label, same as the donor bucket.

---

## 2026-07-07 — AI rewrite panel on Outreach text blocks

Added an AI rewrite button to the Outreach Workspace: click a text block to edit it, and a ✨ instruction box lets you tell Claude to rewrite the message in plain English (e.g. "rewrite this as an invitation to our next Sprout N Tell"). App code + one new API route. Build passes; `/api/outreach-rewrite` registered. **Effort: medium.**

- **New route `app/api/outreach-rewrite/route.js`** — takes `{text, instruction, context}`, runs Sprout's Communications voice, returns only the rewritten message. Uses the official `@anthropic-ai/sdk` server-side with `ANTHROPIC_API_KEY` (Max's own Anthropic account, same as the newsletter Polish button — first-party Claude, not a third party).
- **Model: Sonnet 5** (`claude-sonnet-5`), chosen over Haiku/Opus for strong rewrites at reasonable cost/speed. Deliberately stronger than the Polish route's Haiku 4.5. `max_tokens:1200` so outreach messages can run a few short paragraphs.
- **No-fabrication guard** — the model is told to use a bracketed placeholder (`[date]`, `[RSVP link]`) for any detail it doesn't have rather than inventing one; no em dashes, active voice, no invented facts/numbers, gentle CTAs.
- **AI panel in `EditableDoc`** — renders under the editing textarea when a block is open: instruction input + Rewrite button + ↶ Undo. Non-destructive (original preserved; Undo restores the pre-rewrite draft). Enter rewrites; Esc discards the edit.
- **Blur-race fix** — `editWrapRef` + `onEditBlur` guard so clicking into the AI panel doesn't trigger the block's commit-on-blur and close the panel.
- **Live event context** — `OutreachView` now takes `events` and builds an `aiContext` of the next ≤6 upcoming events with real dates/locations, handed to the API so "invite to our next Sprout N Tell" uses the real date.

---

## 2026-07-07 — Hide-sidebar toggle

Added a collapsible sidebar so the nav can be hidden to give the main content full width. App code only (`components/CRMManager.jsx`). Build passes. **Effort: low.**

- **New `sbCollapsed` state** in `CRMManager`, persisted to `localStorage` (`sprout_sb_collapsed`) so the choice survives reloads.
- **« button** in the sidebar header hides the sidebar (slides it off-screen via `transform:translateX(-100%)`); the main content expands to full width.
- **☰ reopen button** appears fixed top-left when the sidebar is hidden.
- Smooth 0.2s slide + margin transition; styled in the Sprout palette (cyan hover). `.sb-brand` restructured to flex to seat the collapse button.

---

## 2026-07-06 — Org buckets: Active | Prospects tabs

Gave organizations a bucket system mirroring contacts, then moved all existing orgs into Prospects and added one-click promote controls. App code (`lib/schemas.js`, `components/CRMManager.jsx`) + one bulk data write via the Supabase MCP. Build passes. **Effort: medium.**

- **New JSONB-only `segment` field on `OrgSchema`** (`"active" | "prospect"`, null → `"active"`) — every existing org auto-lands in Active with zero migration.
- **Orgs page (`OrgsView`):** Active | Prospects tab row with live per-bucket counts, list filtered to the active tab, segment-aware "+ Add to {bucket}" button (defaults new orgs to the current tab), segment-aware empty state.
- **Move controls:** the detail panel got a direct "→ Move to Active" button (toggle, since only 2 buckets); each list row got a one-click "→ Active" / "→ Prospects" promote button before Edit/Del. Both Add and Edit org modals got a Bucket selector.
- **Import:** imported orgs now force `segment:"prospect"` in `prepareImportItem`, matching the IG-scrape pipeline where contact imports already force prospect.
- **Data move:** a single `jsonb_set` UPDATE put all 16 existing orgs into Prospects (verified 16/16).
- **Naming note:** the non-prospect bucket is labeled **Active** — distinct from `relationship_status:"active"` (an org can be Active-bucket but cold-status).

---

## 2026-07-06 — Outreach page → inline-editable Outreach Workspace

Renamed the "Outreach Log" sidebar item to **Outreach** (📣) and rebuilt the whole view into a workspace that surfaces the Outreach Manager virtual-employee's artifacts and makes every displayed doc editable inline. App code + a new API route + a new markdown lib + one new Supabase table. Build passes. **Effort: medium.**

- **New tabbed workspace** (`OutreachView`): Overview / Research Briefs / Sprints / Deliverables / Activity. The first four render the employee's markdown files; Activity keeps the old touchpoint log with search.
- **New server route `app/api/outreach/route.js`** reads the employee's `.md` files (`briefs/`, `sprints/`, `work-log.md`) live. New files dropped in those folders appear automatically. `next.config.mjs` gains `outputFileTracingIncludes` so the files bundle into the Vercel function.
- **New `lib/md.js`** — compact Markdown→HTML renderer (headings, GFM tables, blockquotes, lists, code, links) plus `blocksOf()` (splits a doc into editable blocks with stable raw↔render round-trip) and `parseTableBlock()`/`serializeTable()`/`renderInline()` for cell-level table editing.
- **Inline block editing** (`EditableDoc` + `AutoGrow`): stays in the rendered view — click any paragraph/heading/list/quote and it becomes an editable field in place; click away or Ctrl/Cmd+Enter saves, Esc cancels, empty-and-blur deletes, "＋ Add a section" appends.
- **Excel-style per-cell table editing** (`TableBlock`): every table cell and header is its own click-to-edit box; editing one cell rewrites only that cell (verified byte-stable, formatting preserved, escaped pipes handled).
- **Persistence:** edits save to a new `sprout_outreach_docs` table (id = file-relative path, `content`, `updated_at`; authenticated-only RLS matching the other CRM tables) via new `fetchOutreachDocs`/`saveOutreachDoc`/`resetOutreachDoc` in `lib/services.js`. The `.md` files are the seed; a doc shows its saved override if one exists, else the file. **↺ Reset to file** deletes the override. Vercel's read-only FS is why edits live in the DB, not the files.
- **Committed the previously-untracked source files** (`briefs/Prospect_Outreach_Plan_July2026.md`, `sprints/`) so the Sprints tab and second brief render in production.

---

## 2026-07-06 — Contact list: "Hide nameless" toggle, default ON

Added a filter to the contact list that hides email-only (nameless) contacts, on by default — the inverse of the existing "Needs a name" filter. App code only (`components/CRMManager.jsx`, `ContactsView`). Build passes. **Effort: low.**

- **New `hideNameless` state (`useState(true)`)** — contacts with no first/last name are hidden by default.
- **Filter logic:** `hideNameless && !hasName → false` (hide nameless) alongside the existing `needsName && hasName → false`; wired into the filter `useMemo` deps and the page-reset effect.
- **New "🙈 Hide nameless" toggle button** on the filter bar, styled `btn-blk` when active.
- **Mutually exclusive** with "👤 Needs a name" — clicking either turns the other off (logical opposites).
- **✕ Clear** resets to default (hideNameless on, needsName off) and shows when `!hideNameless`.
- The "filtered" badge intentionally ignores `hideNameless` since hiding nameless is the default state.

---

## 2026-07-03 — Virtual agency: built the Outreach Manager employee (docs only)

Built the third virtual-agency AI employee, the Outreach Manager, mirroring the Communications/Design folder pattern. Docs/scaffolding only; no app code, CRM data, or DB change. **Effort: medium.**

- **Owns:** the top of the relationship pipeline — discovery → Relationship Research Brief (Phase A–G) → tiering → first-touch outreach copy → landed CRM record. Built directly on `CRM Research Protocol.md`.
- **New files** under `virtual-agency/employees/Outreach/`:
  - `system-prompts/outreach-manager-system-prompt_v1.md` — core training doc: the golden no-fabrication rule (HIGH/MEDIUM confidence, Claude can't access IG), the Phase A–G method table, tiering (A/B/C, assigned at end of Phase D), the Instagram pipeline (Stages 1–4, draft-Max-posts), the merge/dedupe discipline (`check_existing` first, never duplicate, never clobber verified data), the `sprout-crm` MCP write-tool stack (never raw SQL), Writing Rules, and scope boundaries vs Communications / CRM Manager / Social.
  - `outreach-manager-jobDescription.md` — role summary, responsibilities, out-of-scope, tools, session protocol.
  - `work-log.md` — seeded with the 2026-07-03 July IG discovery batch (Buzzkill NYC B, Sober Supper Club B, Dance Support NYC C; Peace Action NYS excluded).
  - `briefs/Relationship_Research_Briefs_July2026.md` — the existing brief, `git mv`'d from the virtual-agency root into the employee's `briefs/` folder.
- **Updated `virtual-agency.md`:** roster, the Outreach → Communications / CRM Manager handoff note, build-order status, and Current State.
- **Not yet run live:** the 3 July records are researched + filed but not yet landed in the CRM.

---

## 2026-07-03 — Sprout n Tell email list + Campaign Monitor import (Sheets/Drive only)

Compiled a deduped "Sprout n Tell" email spreadsheet from all three data sources (the interest form + two separate sign-in sheets), split into participants vs. attendees, then added a Campaign Monitor import tab. Google Sheets / Drive work only via the `google-workspace` MCP (as hello@sproutsociety.org); no app code, repo, CRM, or DB change. **Effort: low.**

- **Sources (source noted per row):** (1) *Sprout N Tell - Interest Form (Responses)* — "Showcasing" → Participants, "Attending" → Attendees; (2) *Sprout Society - Check-In (Responses)* — the 5/19 Show n Tell (Vol 1) sign-in; (3) *Sprout Society — Sign-Ins* — the 6/26 kiosk sign-in.
- **Deliverable:** new spreadsheet *Sprout n Tell — Email List (Participants & Attendees)* (`1WlbcQHX56WQe1VMgWz8j1HgGn6JhIeH0pAuHCBkPiRs`). **Master List** tab = 60 unique emails (13 participants + 47 attendees); people on multiple lists show all their sources on one row.
- **Campaign Monitor Import** tab = 52 subscribers, CM-native columns (Email Address / First Name / Last Name / Role / Source). Excluded the 7 rows Max annotated "don't include" plus the junk `jshgdgsh@` address; kept both Nina emails per Max.
- **Search lesson:** the second sign-in sheet only surfaced with `search_drive_files corpora='allDrives'` — run the all-drives search before concluding a sheet doesn't exist.
- **Sheets-write gotcha:** notes beginning with `+` throw a formula parse error under the default `USER_ENTERED`; rephrase or use `value_input_option:"RAW"`.

---

## 2026-06-26 — Sign-in page: "Welcome" landing tab with the night's program

Added a Welcome tab to the event sign-in page that people land on first after signing in, showing the night's lineup with inline link buttons per act. Sign-in HTML only ([public/sprout-sign-in.html](public/sprout-sign-in.html)); no CRM app code, schema, or DB change. **Effort: low.**

- **New "Welcome" tab + `#panel-welcome`** as the first tab on the landing page (`#step3`), before Membership/Host/Donate. The three post-sign-in / skip-link `selectTab(...)` calls now default to `selectTab('welcome')`.
- **Program layout** — "Welcome to Sprout Society" heading + an **Artists** section (Michael NeJame, Tim Smith, Alexandra Galvis, PictureManBob, Jaclyn) and a **Music** section (ClassV, Proactive Panic). Each `.act` row: name left, pill buttons right.
- **Pill button system** — `.pill` (rounded 999px) in four variants: `.pill-venmo` (blue, also used for "Tips"), `.pill-ig` (fuchsia, also used for "Bolo Ties"), `.pill-link` (green, linktr.ee), `.pill-web` (ink, Website).
- **Links filled in** per act: Venmo/Instagram/Website/Links/Tips/Bolo Ties as supplied. "Bolo Ties" = a shared fuchsia button on PictureManBob + Jaclyn → `instagram.com/b.o.l.o.ties`; "Tips" = blue Venmo buttons for the two music acts. All buttons open in a new tab. No remaining placeholders.

---

## 2026-06-24 — Sign-in page: "How did you hear about us?" dropdown + sheet moved to shared drive

Added a referral-source dropdown to the event sign-in kiosk and moved its Google Sheet into the team shared drive. App-adjacent files only (`public/sprout-sign-in.html`, `sign-in-kiosk/apps-script.gs`); no CRM app code, schema, or DB change. **Effort: low.**

- **New "How did you hear about us?" `<select>`** after the email field on [public/sprout-sign-in.html](public/sprout-sign-in.html), styled with the existing `.field` class. Options: A friend, Social media, Flyer, Reddit, Other (no fill-in for Other). Defaults to a disabled "Select one…" placeholder; **optional** (no validation gate).
- **Wired into `signIn()`** — the selected value sends as `heard` in the POST body to the Apps Script.
- **Apps Script updated** ([sign-in-kiosk/apps-script.gs](sign-in-kiosk/apps-script.gs)) — header row now `Timestamp · Name · Email · How heard · Source`; each appended row writes `data.heard` in the 4th column. ⚠️ The live "Sign-ins" tab already has a header row, so the new column header won't auto-insert — add a "How heard" column header to the live sheet manually so old/new rows line up.
- **New Apps Script deployment** — Max created a new deployment (new `/exec` URL); swapped `CONFIG.SCRIPT_URL` in the HTML to the new URL. Going forward, redeploy via **Manage deployments → edit → New version** (keeps the same URL, no HTML change).
- **Moved the [Sprout Society — Sign-Ins sheet](https://docs.google.com/spreadsheets/d/1VokUNOaYOiVzvbKAUoZldNI9pCssaD9F2AeRLd_R4ss/edit)** out of hello@'s My Drive into the **Sprout Society Team** shared drive → **03 Surveys & Forms** (folder `1sJZAT3tG1W3WWAfsYq2tUJ3pZ6N7nWWG`) via the Drive API (moving a file, not a folder, into a shared drive is supported). The bound Apps Script moves with it.
- **Note:** the "unable to open the file" screen Max hit is Google's multi-account routing (hello@ not the browser's default account) — fixed with a `/u/N/` URL or incognito, not a permissions problem.

### Same day — sign-in page UI pass (HTML only)

- **Live sheet realigned via the Sheets API** — a real test row landed misaligned (new script writes `heard` into col D, but the live tab's header still labeled D "Source"). Rewrote the D/E cells: header → `How heard` / `Source`, and shifted old rows' "kiosk" from D to E. The Apps Script only appends rows, so existing-data cleanup had to be a direct edit, not a redeploy.
- **Donation amounts** $10/$25/$50 → $5/$10/$15 (then mooted by the next change).
- **Removed the donation screen** — sign-in now routes straight to the tabbed landing page (Membership tab). Deleted the donation `<section>` + its `goDonate`/`amts`/`customAmt`/`skipDonate` JS. Donating still lives as a tab on the landing page.
- **White logo in the header** — replaced the green dot + "Sprout Society / WELCOME & SIGN IN" text with the email template's hosted white logo (`newsletter-images/brand/sprout-logo-white.png`, 48px tall).
- **"Prefer not to sign in? Click here." skip link** — jumps to the landing page; merged into the existing disclaimer paragraph as a subtle continuation (muted, only "here" underlined), per Max's preference (not a blue button).
- Commits: `aa05ccf`, `84d0983`, `e18de1c`, `a59c679`→`091eb16`→`15c716a`.

---

## 2026-06-23 — One-off "Quick Hit" newsletter: same section editor as the roundup

Rebuilt the one-off Quick Hit template to use the **exact same structured-section editor** as the Monthly Roundup (it was previously a bracket-fill template with none of the section machinery). App code only (`lib/newsletter.js`, `components/CRMManager.jsx`). **Effort: medium.** `npm run build` passes; node render verified.

- **New `QUICK_HIT_SECTIONS` + `buildQuickHit()`** — sections: Heading, Body, Announcements (repeatable), Upcoming event. Every section gets the same controls: text boxes, ✨ Polish, 🖼 image add, drag-to-crop photo, `[label](url)` clickable-link parsing, live preview, focus→scroll sync.
- **Upcoming event** — adjustable crop photo + RSVP/clickable link, rendered via the reused `compactUpcomingRows` (identical to the roundup).
- **Announcements** — new repeatable block between body and upcoming; each has an optional crop photo, title, body (Polish), and a clickable link button. Untouched blank announcements are filtered out so no `[placeholder]` text leaks into the sent email.
- **`buildNewsletter` routes `quick-hit` → `buildQuickHit`**; deleted the dead `QUICK_HIT` raw template + its `RAW_TEMPLATES` entry.
- **Editor generalized** — `isQuick`/`SECTIONS`/`isStructured`/`secByKey`; section-rendering branch + labels switched `isCompact` → `isStructured`. Quick Hit stamps `data-sec="<section key>"` so the field↔preview group is the key itself.
- ⚠️ Old saved Quick Hit drafts (bracket-keyed) open empty since the template is now key-based — no live quick-hit drafts exist, so nothing lost.
- **Follow-up:** added a dedicated **Button label** field (`linkLabel`) to each announcement so the link button text is editable directly (was only changeable via the `[text](url)` markdown trick). Resolves as `linkLabel` → markdown label → "Learn more".
- **Follow-up:** **bullet lists in email copy.** New `richText()` helper — lines starting with `-`, `*`, or `•` become a real email-safe `<ul>`/`<li>` list; everything else keeps the `<br>` behavior; links still work inside bullets. Routed `cval` through it, so bullets work in every copy box across both templates. Opt-in by content (plain copy unchanged).
- **Follow-up:** bullets separated by blank lines now collapse into **one** `<ul>` (a blank line inside a bullet run keeps the list open) instead of a separate single-item list per bullet. (A "dashes still showing" report was a stale dev server, not a code bug — restarted it; node render confirmed the conversion.)
- **Fix (encoding):** repaired mojibake corruption in `lib/newsletter.js` (`Â·`, `â€"` in both footers + editor labels) caused by an earlier `Set-Content -Encoding utf8` round-trip that double-encoded every non-ASCII char. Restored the pristine file via `git checkout` and re-applied all changes through UTF-8-safe edits. **Never rewrite source files with PowerShell `Set-Content`/`Get-Content`** — use `[System.IO.File]::WriteAllText` + `UTF8Encoding($false)` or the editor.
- **Follow-up:** all Quick Hit headers are now editable with defaults (matching the roundup): masthead label ("Sprout Society"), upcoming header ("Next up"), footer brand ("SPROUT SOCIETY"), and a per-announcement header ("Announcement"). Added as `kind:"header"` fields rendered via `tval`.
- **Follow-up:** the whole footer is now editable per-newsletter in **both** templates — Donate button (link + label), Become-a-member button (link + label), Instagram handle, address, and EIN, each with a default. New `footerBtn`/`footerIgParts` helpers + `FOOTER_DEFAULTS`. IG/address/EIN precedence: per-newsletter field → org profile → default. ⚠️ The Monthly Roundup footer now always shows both buttons (previously only when filled).

---

## 2026-06-22 — Editable checklist calendar on the event detail page

Made the event-detail checklist calendar fully editable. App code only (`components/CRMManager.jsx`, inside `EventDetailPage`). **Effort: medium.**

- **Edit name + date** — clicking an item dot opens a popover with an editable name field (commits on blur/Enter), a due-date picker (moves the item), the complete toggle, and a Delete button.
- **Add by clicking a day** — clicking a day cell opens an inline input prefilled with that date; Enter adds. The calendar now always renders, so the first item can be added to an empty checklist.
- **Drag-drop** — item dots are draggable; drop on another day to re-date, or onto the "No due date" section to clear the date. Days outline dashed-cyan while dragging.
- **No-date section** — rows are now inline-editable (name, date, delete, drag handle).
- New helpers `updateChecklistItem`/`deleteChecklistItem`/`addChecklistItem`/`openAdd`/`dropOnDay`; state `editText`/`addDate`/`addText`/`dragId`. All edits persist through the existing `onUpdateEvent` path.
- **Bug fixed same session** — initial version threw `item is not defined` (popover rendered outside `items.map`); moved it inside the map, each dot wrapped in a `position:relative` container.

---

## 2026-06-22 — Event sign-in page → Google Sheet, hosted, with QR code

Built a standalone branded HTML sign-in page that writes each entry into a Google Sheet via an Apps Script web app, hosted it on Vercel, and generated a QR code + printable flyer. New files only — no change to the CRM app code, schemas, or DB. **Effort: medium.**

- **The page** (`public/sprout-sign-in.html`) — 3 steps: name/email sign-in (+ optional client-side "Continue with Google"), a 501(c)(3) suggested-donation step (Givebutter), and a tabbed Get Involved landing page (Membership / Host / Donate). Self-contained, Sprout-branded; a top-of-file `CONFIG` block holds the script URL + Givebutter/form links.
- **The sink** (`sign-in-kiosk/apps-script.gs`) — a Google Apps Script web app bound to the Sheet; `doPost` appends `Timestamp · Name · Email · Source`, creates the `Sign-ins` tab on demand, and serializes concurrent submits with `LockService`. The page POSTs JSON `no-cors` with `text/plain` to dodge the CORS preflight.
- **Hosting** — moved the HTML into `public/` so it deploys at `https://sprout-crm-tool-next-js.vercel.app/sprout-sign-in.html`. Static files bypass the AuthGate login wall, so the public reaches it without signing in (verified live).
- **QR + flyer** — `sign-in-kiosk/sign-in-qr.png` (encodes the live URL) + `sign-in-kiosk/sign-in-flyer.html` (letter-size "Scan to sign in" sheet embedding the QR).
- **Mid-build tweaks** — donation amount selection now advances into the landing page (no popup) carrying the amount into the Donate button; removed the "Done — sign in someone new" button (self-service, not a shared kiosk).
- **Verified** — a real test sign-in landed in the Sheet. Apps Script gotchas resolved: multi-account "unable to open the file", and the first deploy's domain-login redirect (fixed by setting Who-has-access = Anyone).
- **Open** — wire "Continue with Google" (OAuth client ID), and optionally also pipe sign-ins into `sprout_contacts`.

---

## 2026-06-22 — Copy May 19 event checklist onto June 26 Sprout n Tell

Copied the 18-item planning checklist from the May 19 **Show n Tell** (`evt_mordmhe4e6nj`) onto the June 26 **Sprout n Tell** (`evt_mpn2a3rtn29n`). Data-only — one `execute_sql` UPDATE on `sprout_events` via the Supabase MCP; no app code or repo change. **Effort: low.**

- **Before** — June 26 had 2 checklist items (Confirm Musicians, Confirm Artists); May 19 had 18, all completed.
- **Transform** — appended all 18 to June 26 with: new collision-safe ids (`md5(orig||'_jun26')`), `completed:false` (reset for the new event), and due dates shifted **+38 days** (the May 19→June 26 gap) so lead-times stay meaningful.
- **Result** — 20 items total (original 2 preserved via `coalesce(...) || new_items`), verified with `jsonb_array_length`.
- **Notes** — checklist is JSONB-only (`data->checklist`), no SQL column/Zod gate; no MCP event-write tool exists so raw SQL is the path; conceptual overlap with the existing Confirm-Musicians/Artists items left in place for Max to prune in-app.

---

## 2026-06-20 — Discord server structure for the Sprout community

Stood up the Sprout Society Discord server scaffolding via the `discord` MCP. Discord config only — no app code, CRM data, or repo change. **Effort: low.**

- **Goal** — serve the community from 0 members without overwhelming people: member-only networking/promotion, official announcements, and an events channel. Launched lean (empty channels read as a dead server; split later as activity grows).
- **Created** (guild "Sprout Society") — 3 categories: `START HERE`, `COMMUNITY`, `MEMBERS`; 7 text channels with topics: `welcome`, `announcements`, `events`, `introductions`, `members-lounge`, `networking`, `promote`. The pre-existing `#general` stays in COMMUNITY.
- **Member gate (decided)** — reaction/verify gate: agree to rules → `Verified` role; `Member` is a separate role for paying members, used to unlock the MEMBERS category.
- **MCP limits hit** — the bot needed **Manage Channels** added to its role before any create succeeded (recommended scoped perms, not Administrator). `discord_create_text_channel` has no category param and the MCP exposes no role/permission tools, so the rest is manual in Discord: drag channels into categories, create the two roles, hide MEMBERS from `@everyone`, lock `#announcements`/`#events` to staff-post-only, wire the ✅ verify in `#welcome`.
- **Also** — bot renamed to "Russell Sprout"; exposed bot token still pending a reset.

---

## 2026-06-19 — Newsletter preview: fix typing-scrolls-to-top + per-item field sync + same mechanism in Quick Hit

Fixed the newsletter editor's live preview jumping to the top on every keystroke, made the focus→scroll target individual repeat-event cards (not just the section), and ported the whole field↔preview sync mechanism to the Quick Hit one-off template. App code only (`components/CRMManager.jsx`, `lib/newsletter.js`; `npm run build` passes). **Effort: diagnose medium / fix low.**

- **Bug: preview scrolled to top on every keystroke.** Each keystroke rebuilt the preview HTML and swapped the iframe's `srcDoc`, forcing a full document reload that reset scroll to 0; the restore logic flickered to the top and landed short before layout settled. **Fix:** the iframe now loads a static shell once (`srcDoc` never changes → window/document persist) and each update swaps only the inner DOM (`documentElement.innerHTML`), so the scroll position is preserved naturally — no reload, no reset, no restore guesswork. Also avoids re-fetching every image per keystroke. The reverse-sync click handlers are re-wired after each swap (innerHTML drops listeners).
- **Per-item scroll for repeat sections.** Upcoming/Past events shared one `data-sec` marker, so focusing any event field scrolled to the first card. Each rendered card now carries `data-sec-item="upcoming-<i>"` / `past-<i>` (`lib/newsletter.js`), and `focusScroll(key, idx)` targets the specific card, falling back to the section marker.
- **Same mechanism in the Quick Hit template.** Quick Hit is bracket-based (no structured sections), so it had no sync wiring. Added inert `data-sec` markers (`qh-headline`, `qh-recap`, `qh-nextup`, `qh-cta`) to its blocks, a keyword resolver (`qhGroupForKey`) mapping each bracket placeholder to its block, and template-aware `groupForKey` / `firstKeyForGroup` helpers so `focusScroll` + reverse click-to-jump work for either template. Wired `onFocus` + `data-fkey` onto the Quick Hit fields.

---

## 2026-06-17 — Login wall (Supabase Auth, invite-only) + authenticated-only RLS — full lockdown

Closed the previously-public CRM. App code + two DB migrations + dashboard config (`npm run build` passes). The app now requires login, and the database is readable only by logged-in users — verified that an anonymous request returns 0 rows.

- **Why** — the app had no auth at all (public at `/`), so a Supabase *invite* couldn't grant access (it connected to nothing), and the public link failed for the teammate (wrong invite redirect URL). Chose invite-only access + full lockdown.
- **`components/AuthGate.jsx` (new)** — wraps `CRMManager`. Email/password sign-in, a forced set-password screen for invite/reset links (`detectSessionInUrl` → `updateUser`), and forgot-password. Self-contained inline Sprout styling; dark inputs with white text that survives browser autofill (`.ag-input:-webkit-autofill` box-shadow trick).
- **`lib/supabase.js`** — explicit `persistSession` / `autoRefreshToken` / `detectSessionInUrl`.
- **`lib/services.js` + sidebar** — `signOut()` export + a **⎋ Sign out** button in the sidebar footer.
- **`app/api/send/route.js`** — recipient lookup now uses `SUPABASE_SERVICE_ROLE_KEY` server-side (falls back to anon) so list-sends keep working after anon is locked out.
- **Migration `sprout_crm_authenticated_read_write`** — added `authenticated_all` (`for all to authenticated using true / with check true`) to the 5 CRM tables only (contacts/orgs/events/newsletters/profile). Existing anon policies left in place for now. `sprout_grants` and other shared grant-tool policies untouched.
- **RLS visibility gotcha** — logging in switched the browser to the `authenticated` role; the old anon-only policies stopped applying, so the app briefly showed 0 contacts/orgs (events/profile use `public`-role policies, so they stayed visible). No data lost (verified 3,747 contacts intact via service-role count); the Phase 1 migration restored visibility.
- **Migration `sprout_crm_lockdown_drop_anon` (Phase 2)** — dropped the `anon_all` (and `sprout_profile`'s `"Allow all"`) policies on all 5 CRM tables, leaving only `authenticated_all`. Verified `set local role anon; select count(*) from sprout_contacts` → 0. Reversible by recreating the anon policies.
- **Vercel** — turned OFF Deployment Protection ("Vercel Authentication") so the public reaches the app's login instead of a Vercel SSO wall; added `SUPABASE_SERVICE_ROLE_KEY` (Production) for the send route's recipient lookup.
- **Supabase Auth config** — Site URL was `http://localhost:3000` (why the first invite failed); set to the prod URL + added prod/localhost Redirect URLs. Public sign-up disabled (invite-only).
- **Follow-ups:** redeploy Vercel so the send route picks up the service-role key (else "Send to list" resolves 0 recipients); resend any invite generated before the Site URL fix (old links are dead).

---

## 2026-06-17 — Quick Hit one-off matched to the Monthly Roundup look

Rebuilt the "Quick Hit" single-focus template's chrome so it matches the Monthly Roundup (compact) exactly in format and coloring. App code only (`lib/newsletter.js`; `npm run build` passes).

- **Masthead** — replaced the black header bar + white logo with the roundup's white masthead: black-heart logo left, "Sprout Society / [MONTH YEAR]" label right, acid-green (`#C6C902`) 3px rule beneath. `[MONTH YEAR]` auto-fills from the issue month (same as the roundup).
- **Card** — same `#F7F7F6` page with `40px 12px` padding wrapping one white `max-width:600px` card (`border-radius:8px; overflow:hidden`), so the black footer corners clip rounded.
- **Typography/colors** — headline 22px/900 `#030000`, recap 16px/1.6 `#3a3a38` (was a 24px h1 + `#4B5563`), matching the roundup intro block.
- **"Next up" box** — gained the cyan left accent bar (`#73C4D6`) + card shadow, mirroring the roundup announcement block; kept the fuchsia "NEXT UP" eyebrow.
- **CTA + footer** — aligned padding and color tokens to the roundup.
- **Footer Instagram** — changed `@sproutsociety` → `@sproutsocietyorg` (link + label). Note: this template's footer IG is hardcoded; the roundup pulls IG from the org profile.

---

## 2026-06-10 — First Campaign Monitor send: export June HTML + Campaign Monitor unsubscribe tag

Shipped the June "Sprout Monthly" newsletter through Campaign Monitor (the first real send off the new ESP) and made the footer unsubscribe compliant with CM.

- **Exported the baked June roundup HTML from the DB** (`sprout_newsletters` record `nl_may_2026_roundup`, subject "Sprout Monthly: June 2026") to a new folder: `virtual-agency/employees/Communications/deliverables/june-2026-monthly-roundup.html`. The app bakes HTML into JSONB on save, so there was no file before.
- **Footer unsubscribe → Campaign Monitor tag (`lib/newsletter.js`).** Replaced the `mailto:hello@sproutsociety.org?subject=Unsubscribe` anchor with `<unsubscribe><span style="…">Unsubscribe</span></unsubscribe>` in both active templates (compact `buildCompact()` footer + `QUICK_HIT` footer). CM turns this into the real one-click unsubscribe and stops appending its duplicate auto-link. The inner span preserves grey/underline styling. **Caveat:** the tag only works when sending through Campaign Monitor — it renders as literal text in the in-app Gmail send path. `npm run build` passes.
- **CM campaign setup (advice, no code):** subject `🌱 Sprout Monthly - June 2026` (one emoji, sprout not carrot, front-loaded); preview text "Inside: our first Sprout 'N' Tell, weekly Co-Working, and a June lineup."; no name personalization this send (~2,200 contacts have no first name → fallback would hit thousands).
- **Recipients:** Sprout-Community (1,190) + Sprout-Donors (2,076) = 3,266 unique; Prospects (~348) left off this send. Tested live — unsubscribe + all links work.

---

## 2026-06-10 — Campaign Monitor: connect audience via UI + in-app per-bucket CSV export

Connected the CRM newsletter audience to Campaign Monitor. The API key path is blocked (the login is a client-level user, not the account administrator — Danielle is checking who the admin is), so we used CM's UI instead of the API for now.

- **Decision:** stay with CM, send via the UI. CM holds the 877-person suppression list (opt-outs/bounces) + deliverability — the can't-DIY value. CRM owns the deduped master audience + the `buildCompact()` HTML builder.
- **List structure:** 2 CM lists — **Sprout Community** + **Sprout Donors** (prospects excluded). No name/no-name split — handled by a template personalization fallback. CRM segments are mutually exclusive, so the lists don't overlap; a send selects both and CM dedupes.
- **New feature (`components/CRMManager.jsx`):** `exportSegmentCSV` + a `⬇ Export {Community|Donors} CSV` button on the Contacts filter bar (hidden on Prospects). Exports the full current bucket regardless of active filters, deduped by lowercased email, columns Email / First Name / Last Name, client-side Blob download `sprout-{segment}.csv`. Additive, read-only, no schema change. `npm run build` passes. Commit `ac62394`.
- **Result:** imported both CSVs into CM → Sprout-Community 1,190 active (~10 suppressed), Sprout-Donors 2,076 active (~100 suppressed). Total reachable ≈ 3,266. The active-count gap vs. the export (1,200 / 2,176 unique) is the suppression list working as intended.

---

## 2026-06-09 — Conversation: Discord bot rename + newsletter passphrase location (no code change)

Pure Q&A + dev-server start. No code, data, or config change.

- **Rename the Discord bot** — Developer Portal action, not a codebase change. Bot username: portal → "Russel Sprout" → Bot → Username. Application name: General Information → Name. Per-server display: right-click bot → Edit Server Profile → Nickname. Renaming the username does not reset `DISCORD_TOKEN`.
- **Newsletter send passphrase** = `NEWSLETTER_SEND_SECRET`, set independently in `.env.local` (localhost dev) and Vercel (live). `app/api/send/route.js` validates against `process.env.NEWSLETTER_SEND_SECRET` of the running environment, so the two having drifted apart (`russ…` local vs `sk_…` Vercel) is harmless — the live app only checks the Vercel value. The `sk_…` Vercel value is the real working passphrase for the deployed site.
- **Started dev server** at http://localhost:3000 (cleared port 3000 first).

---

## 2026-06-09 — Newsletter editor: field ↔ preview sync (focus a field → preview scrolls to that block)

App code (`lib/newsletter.js` + `components/CRMManager.jsx`). Effort: medium. `npm run build` passes. Committed + pushed.

- **The ask:** line up the editor text boxes with the block being edited in the live preview. Literal per-pixel pinning isn't feasible (fields and rendered blocks have different heights; in the old shared-page-scroll layout the same section sat at different Y in each column). Shipped focus → scroll instead.
- **Block tagging** — every section block in `buildCompact()` carries `data-sec="<group>"` (11 groups, 17 tagged `<td>`s). Inert in email clients (unknown attributes ignored), so the sent newsletter is unchanged.
- **Forward sync** — each section field has `onFocus` → `focusScroll(key)`, which maps the field key to its block group (`SEC_GROUP`), scrolls the preview iframe to `[data-sec=…]`, and flashes a fuchsia outline (~1.4s). Fields carry `data-fkey` for reverse lookup.
- **Reverse sync** — clicking a block in the preview scrolls the editor to that section's first field (`GROUP_FIRST`) and focuses it; real links/buttons inside a block are left alone.
- **Sticky preview** — the preview is now `position:sticky; top:12` with fixed `height:calc(100vh - 96px)` and internal scroll, so it can scroll to a block without pushing the focused field off-screen. Grid `alignItems` changed `start`→`stretch` so the right column gets full height and the panel stays pinned through the whole form. A `previewScroll` ref restores the iframe's scroll across the per-keystroke `srcDoc` reloads.
- **Bug fixed same session:** preview rendered narrow/compact with a horizontal scrollbar — `alignSelf:"flex-start"` on the card was collapsing it to content width (in a column flex container `alignSelf` is the horizontal axis), reflowing the email to its phone layout. Removed it; card fills the column width again.
- **Trade-off:** preview changed from "auto-grows to full content height, page scrolls" to a pinned internally-scrolling panel. Offered a toggle between "follow my edits" and "full-length" modes if wanted later.

---

## 2026-06-09 — Newsletter mobile-readability pass: removed dead "See more events" button, trimmed side padding, 16px body copy

App code only (`lib/newsletter.js`). Effort: low. `npm run build` passes after every change. Committed + pushed.

- **Removed the "See more events" button** from the compact Monthly Roundup. It used an in-page `href="#events"` anchor that works in the rendered preview but not in email — Gmail/Outlook/Apple Mail strip `id` attributes, so the anchor had nothing to scroll to. Not a bug; a documented email-anchor limitation with no CSS/HTML fix. Deleted the render IIFE from `buildCompact()` and the `seeMoreLabel`/`seeMoreLink` fields from `COMPACT_SECTIONS`; left the `<tr id="events">` anchor (harmless). Existing drafts with a saved `seeMoreLink` ignore it (no migration).
- **Trimmed compact template side padding** to fix text looking squished on mobile (padding stacked ~78px deep on the testimonial block): outer content cells 28→18px L/R, colored blocks (membership/marketing/scholarship/spotlight) 22–24→18px, testimonial pop-out 28→20px, footer 28→20px.
- **Body copy bumped 15→16px** (professional newsletter standard) in the compact (intro, featured recap, announcement/co-working body + highlight, spotlight blurb 14→16, testimonial 15→16) and in the Quick Hit template (intro recap 15→16). Labels, eyebrows, event-card names, bold callouts, and the 17px membership/marketing copy left as-is.
- ⚠️ The May draft's stored HTML is now older than these edits — open the draft and Save once to rebake before sending.

---

## 2026-06-09 — Quick Hit newsletter: branded header/footer, stacked + centered footer buttons, dark-mode meta tags

App code only (`lib/newsletter.js`). Effort: low. `npm run build` passes. Committed + pushed.

- **Quick Hit (single-topic) header + footer now match the Monthly Roundup compact:** header is a black bar with the white logo on the left; footer is the black branded footer (brand line, `Brooklyn, NY · @sproutsociety`, Donate + Become-a-member buttons, mailto unsubscribe + address + EIN, white logo on the right). Removed the dead `[WEBSITE]`/Mailchimp `*|UNSUB|*` merge tags.
- Donate/membership URLs hardcoded in Quick Hit (it's a bracket template with no link fields): `givebutter.com/sproutspacedonors` (donate, slug pulled live via Givebutter MCP) + `givebutter.com/sproutmembership` (member).
- **Footer buttons stacked top/bottom for mobile** in BOTH templates (Quick Hit + compact roundup) — previously side by side. The compact footer IIFE now renders each `parseBtn` cell as its own `<tr>` with a 10px spacer.
- **Button labels centered** in both templates: `<td width="220">` + anchor `display:block; text-align:center` → uniform 220px buttons with centered text.
- **Dark-mode accommodation:** added `<meta name="color-scheme">` + `<meta name="supported-color-schemes">` + a `:root` color-scheme hint to both templates' `<head>` (and `x-apple-disable-message-reformatting` to Quick Hit). Stops Apple Mail's forced dark-mode color inversion. Caveat: Gmail/Outlook ignore these and may still invert.

---

## 2026-06-09 — Decision: migrate newsletter email channel from Givebutter to Campaign Monitor (planning only)

No code, data, or config change — conversation/planning session. Blocked on Campaign Monitor account reactivation.

- **Driver:** Givebutter Engage is template-only and won't accept raw HTML, so the custom Sprout newsletter template can't be used there. Campaign Monitor accepts full HTML import, so `buildCompact()` output renders as designed. Givebutter stays as the donation platform; only the email channel moves.
- **Second driver:** post-import the CRM is ~3,750 contacts; the current Gmail-BCC `app/api/send` path (45/batch, 2,000/day Workspace cap, no real unsubscribe) won't scale — a real ESP was needed regardless.
- **Decided:** full API send (in-app Send card flow unchanged, engine swaps Gmail → Campaign Monitor). Deliverability concern dropped — most of the 3,600 already donated/attended, and the 20 "Email Lists (Campaign Monitor)" CSVs came from the existing Campaign Monitor account (already-consented subscribers).
- **To build when account is reactivated + Max provides API key + Client ID:** (a) CRM → Campaign Monitor contact sync by bucket (Community/Donors/Prospects), matched on email; (b) rewrite `app/api/send` to create a campaign from the built HTML and trigger send via Campaign Monitor's API. Point footer unsubscribe at Campaign Monitor's merge tag instead of `mailto:`.
- **First check when live:** whether the old subscriber lists still exist in the reactivated account (would make sync a reconcile, not a full push).

---

## 2026-06-09 — Bulk email-list import (3,609 contacts) + 1,000-row fetch fix + paginated/sorted contact list

Data write (3,609 contacts) + app code (`lib/services.js`, `components/CRMManager.jsx`). Effort: high. `npm run build` passes.

- **Import:** loaded a ~3,500-row historical email dump from two Drive folders (Funraise donor transactions + 20 Campaign Monitor `Name,Email` lists). Bucketed by file title — donor-titled → **Donor**, real events → **Community** (`attendee`), subscriber/partner lists → **Prospect**. Dedupe precedence Donor > Community > Prospect; cross-file name backfill + conservative email-based name guessing; filtered staff (`@sproutsociety.org`), bot/test/junk, and blank rows. Funraise gift amount/date carried into `financial_relationship`. Result: **3,609 net-new** (donor 2,151 / community 1,110 / prospect 348), 46 already-in-CRM left untouched.
- **Write path:** throwaway service-role script with collision-safe id generation (seeded with all 138 existing ids so no record could be overwritten), real Zod `validateContact` (0/3,609 failures), whole batch tagged `email_list_import_2026_06_09` for filtering/undo, upserted in 500-row batches. Existing 12 Community-contacts-also-on-a-donor-list left un-upgraded per request. Throwaway scripts deleted after.
- **Fix — 1,000-row read cap:** the app showed only 1,000 contacts because `fetchContacts` did a single `.select()` and Supabase/PostgREST caps a request at 1,000 rows. Now pages through in 1,000-row chunks (`.order("id").range(...)`) until exhausted.
- **Contact list for scale (`ContactsView`):** added pagination (50/page default; 20/50/100/250; Prev·Page X of Y·Next), a Sort dropdown (Name A–Z default + Newest / Health / Most-given-on-donor-tab), "Showing X–Y of N" with a per-page selector, and a **👤 Needs a name** toggle that filters to email-only contacts (verified all 2,211 nameless rows carry a valid email). Existing search/type/status filters unchanged.

---

## 2026-06-08 — Newsletter: fix "prompt() is not supported" crash on Save version

App code only (`components/CRMManager.jsx`). Effort: diagnose low / fix low. `npm run build` passes.

- **Bug:** clicking **📌 Save version** in the newsletter editor threw a Next.js runtime error `prompt() is not supported` (call stack `saveVersion` → `CRMManager.jsx:2472`). The Next.js 16 dev runtime blocks native `window.prompt()`/`window.confirm()`/`alert()`.
- **Root cause:** `saveVersion` used `window.prompt(...)` to name the version, and `restoreVersion` used `window.confirm(...)` — both unsupported in this runtime.
- **Fix:** replaced both native dialogs with in-app modals using the existing `Modal`/`ConfirmModal` primitives. **Save version** now opens a small name modal (defaults to "Version N", Enter or button to confirm, `commitVersion` does the snapshot). **Restore** now routes through `ConfirmModal` (title "Restore version", non-danger). Behavior is otherwise identical.

---

## 2026-06-08 — Newsletter: footer Donate + Become-a-member buttons, editable membership link, new Scholarship block

App code only (`lib/newsletter.js`). Effort: low. `npm run build` passes.

- **Footer Donate button** — new `donateLink` field; renders a fuchsia `#E10098` button in the footer (between the brand line and Unsubscribe) only when filled. Bare URL → "Donate →", or `[label](URL)` via `parseBtn()`.
- **Footer Become-a-member button** — new `memberLink` field beside Donate; cyan `#2a8ca0` button with a spacer cell between the two. Either renders alone if only one is set.
- **Editable membership-block link** — the Membership CTA button's URL was hardcoded to `https://givebutter.com/sproutmembership`. Added a `membershipLink` field that defaults to that same URL when blank (no change for existing drafts), overridable by typing a new URL.
- **New Scholarship block** — acid-green `#C6C902` block with the banana `#FAD100` left bar, inserted between Marketing and Community Spotlight, rendered only when its message is filled. Dark ink `#030000` text for contrast + black button with banana label. Fields: `scholarship` (message + Polish), `scholarshipBtn` (button label, default "Learn more"), `scholarshipLink` (button URL).

---

## 2026-06-08 — Newsletter: "See more events" button auto-scrolls again (was a hardcoded Luma link)

App code only (`lib/newsletter.js`). Effort: diagnose low / fix low. `npm run build` passes.

- **Bug:** the featured "See more events" button always linked out to `https://luma.com/sproutsociety` in a new tab, even with the link field empty. It used to auto-scroll down to the Upcoming events section.
- **Root cause:** the `seeMoreLink` field's render used `tval(v.seeMoreLink, "https://luma.com/sproutsociety")`; `tval` returns its fallback when the field is blank, so an empty field still produced the Luma URL + `target="_blank"`. The May draft's stored `seeMoreLink` is `null` (verified via Supabase) — the URL was purely the fallback default.
- **Fix:** button now defaults to `href="#events"` (scrolls to the existing `#events` row at the Upcoming section, no `target`); if a URL is typed into the field, it links out to that URL in a new tab. Relabeled the editor field/placeholder to "(blank = scroll to Upcoming)".
- Email caveat unchanged: Gmail/Outlook strip `id` anchors, so the in-email scroll may not fire there — the typed-URL fallback covers that case if ever needed.

---

## 2026-06-08 — Comms: wire the Foundational Language deck into all rewrites (Polish + agent)

App route + virtual-agency docs (`app/api/polish/route.js`, `virtual-agency/employees/Communications/`). Effort: medium. `npm run build` passes.

- Distilled Sprout's new **Foundational Language** deck (`Sprout Society - Foundational Language.pdf`, in the Comms folder) into a clean, version-controlled reference: **`virtual-agency/employees/Communications/foundational-language.md`** — canonical mission/vision, the loneliness-epidemic problem framing, the four offerings, the Russell "Sprouts" Efros founding story, the verified impact numbers (5,000+ served, 50+ programs, $1.7M raised, $120K to 32 artists via the Sprout Fund), and the three "Give" CTAs. This is the single source of truth for what Sprout says about itself.
- **✨ Polish button now recognizes it:** extended the `SYSTEM` prompt in [app/api/polish/route.js](app/api/polish/route.js) with a foundational-language block (mission line + throughline, the four offerings, a verified-stats whitelist with "if a number isn't here, don't state it", the CTAs, vocabulary cues). Every newsletter Polish rewrite now stays on-message and can't invent stats.
- **Comms agent now references it:** added a "Foundational Language (read this first)" section to [communications-manager-system-prompt_v1.md](virtual-agency/employees/Communications/system-prompts/communications-manager-system-prompt_v1.md) and two rows in its Newsletter Tooling table pointing at the `.md` + `.pdf`.
- **Em-dash call:** the deck uses em dashes throughout; Max's rule + both prompts forbid them. Kept the ban — both surfaces take the deck's language and facts, not its punctuation. Placeholder slides (leadership/board names, "What's next" XXX columns) left out as unfilled.
- ⚠️ The Polish route carries a *condensed copy* of the foundational block. When the deck / `.md` changes, re-sync that block in `route.js` (a comment marks it).

---

## 2026-06-08 — Newsletter: version history (Save version + restore/delete)

App code + schema (`components/CRMManager.jsx`, `lib/schemas.js`). Effort: medium. `npm run build` passes.

- Added a **`📌 Save version`** button to the newsletter editor's action bar (next to 💾 Save draft). It prompts for an optional name (default "Version N") and commits a point-in-time snapshot of the editable content (`subject`, `month`, `template`, deep-cloned `field_values`, `spotlight_contact_id`, `recap_limit`, `upcoming_limit`, and the baked `html`) with a `savedAt` timestamp + `label`, then persists via the existing `onSaveStay`/`makeRecord` path (stays in the editor).
- Added a **"Version history" card** in the left form column under Details: lists saved versions newest-first with name + localized timestamp, each with **↩ Restore** (loads the snapshot back into the editor behind a confirm; history is kept) and **🗑** (delete that version). Empty state when none saved.
- New **`versions: z.array(z.any()).default([])`** field on `NewsletterSchema` — JSONB-only, defaults to `[]`, rides the existing save path, survives reloads, no migration needed.
- Design: a version is created **only** by the explicit button (Save draft / auto-save / send do not), keeping the history meaningful. Restore loads into the editor and does not auto-overwrite the DB. Deep-clone on save + restore so snapshots and the live draft never share `field_values` references.

---

## 2026-06-06 — Contacts: new "Showcase" relationship type

App code + MCP + docs (`components/CRMManager.jsx`, `lib/schemas.js`, `mcp/server.js`, `docs/CRM-db-schema.md`). Effort: low. `npm run build` passes.

- Added a new community contact type **`showcase`** ("Showcase") for people who have performed or displayed at Sprout Society.
- Updated all four schemas-sync points per the invariant: `REL_TYPES` in `CRMManager.jsx`, the Zod `relationship_types` enum in `lib/schemas.js`, both MCP inputSchemas in `mcp/server.js` (`search_contacts` filter + `create_or_update_contact` merge), and the enum row in `docs/CRM-db-schema.md`. Placed after `attendee`, before `sprout_society`.
- People-only: not added to the org high-signal `tags` mirror (Showcase describes individuals who performed/displayed, not orgs).
- Flows automatically into the Add/Edit modals, detail panel, contact + org list chips, and the type filter, since those map over `REL_TYPES`.
- ⚠️ Reload the VS Code window so the running MCP server picks up the new enum value.

---

## 2026-06-06 — Newsletter: proofread May draft + editable titles/subheaders + generic Announcement section

App code (`lib/newsletter.js`, `components/CRMManager.jsx`) + DB content edits to the May draft (`nl_may_2026_roundup`). Effort: low → medium. `npm run build` passes.

- **Proofread the May newsletter.** Pulled `field_values` and read every field. Fixed the intro broken sentence ("...into our space**.** launched..." → comma), the spotlight blurb ("instagram"→"Instagram", "Soundcloud"→"SoundCloud", missing final period), and trimmed cosmetic trailing spaces. Per Max: standardized the event name to **"Sprout 'N' Tell"** everywhere, left the testimonial punctuation alone, kept "Last month" in the featured recap (correct — Vol. 1 ran in May, the issue ships in June). Applied via targeted `jsonb_set` on `data->field_values`.
- **All static titles/subheaders → editable fields.** New `kind:"header"` field type in `COMPACT_SECTIONS` + a `tval(v, fallback)` helper in `lib/newsletter.js`. Unlike `cval` (muted `[placeholder]` when blank), `tval` falls back to the hardcoded default, so any draft that never sets these renders identically to before — no data migration, no placeholder leak. New fields: `mastheadLabel`, `featuredEyebrow`, `seeMoreLabel`, `spotlightEyebrow`, `membershipBtn`, `upcomingTitle`, `pastTitle`, `footerBrand`. Editor renders `header` fields as a one-line input whose placeholder is the current default (new `header` branch in `NewsletterEditor`). Left the masthead month label (already in Details) and the dynamic Follow @handle button (from the org profile) alone.
- **Coworking block → generic Announcement section.** "It won't always be coworking." Relabeled the fields ("Coworking — …" → "Announcement — eyebrow/title/body/highlight"), made the yellow highlight chip label editable (`coworkingChip`, default "Sprout-by-Day"), and made the whole highlight line render only when `coworkingThurs` is filled. Changed the generic defaults (eyebrow → "Announcement", title → blank) so a future non-coworking issue won't show stale wording, and wrote the May draft's `coworkingEyebrow`/`coworkingTitle` explicitly so this issue is visually unchanged. Kept the existing `coworking*` keys (no rename) to avoid migrating saved data. This also subsumes the earlier fix of the hardcoded "Coworking, Tuesdays & Thursdays" heading — that line is now the editable `coworkingTitle`.
- **⚠️ Stale baked HTML:** the May edits went straight to `field_values` in the DB, so the draft's baked `html` is stale. Open the draft in the editor and Save draft once to rebake before sending; the live preview already shows the corrected copy on open.

---

## 2026-06-06 — Newsletter: featured-event announcement box + cyan hyperlinks

App code only (`lib/newsletter.js`). Effort: low. `npm run build` passes.

- **Featured announcement box.** New optional field `featuredAnnounce` in `COMPACT_SECTIONS` (textarea + ✨ Polish, "Featured event — announcement (optional)"), placed after `featuredRecap`. New render block in `buildCompact()` between the recap and the "See more events" button: a grey `#ECECEA` box with bold fuchsia `#E10098` text. Renders only when filled, so a featured event without an announcement gets no empty grey box.
- **Hyperlink color → cyan.** Confirmed markdown links already work in any fill-in box via `linkify()` (`[label](https://url)`, no space between `]` and `(`, http(s) only) — no separate link box needed. Parameterized `linkify(html, color)` and `cval(v, t, linkColor)`, then set the global default to cyan so every inline link is uniform.
- Used a deeper cyan `#2a8ca0` rather than the light brand cyan `#73C4D6`: the light cyan as link text is too low-contrast on white/grey backgrounds; `#2a8ca0` is a darker shade of the same hue that stays legible.

---

## 2026-06-06 — Newsletter: testimonial / quote pop-out in the Community Spotlight

App code only (`lib/newsletter.js`). Effort: low. `npm run build` passes.

- Max wanted a testimonial box for the newsletter that "pops out" — an acid-green block inside the Community Spotlight with a shadow and big quotation marks capping it like a testimonial.
- **New field** `spotlightTestimonial` in `COMPACT_SECTIONS` (textarea + ✨ Polish) — auto-renders as an editor field since the editor maps over `COMPACT_SECTIONS`. Labeled "Community spotlight — testimonial / quote."
- **New render block** in `buildCompact()`, inside the spotlight card below the blurb and above the IG/Website buttons: acid-green `#C6C902` block, rounded corners, shadow `0 6px 18px rgba(0,0,0,0.22)`. **Renders only when the field is filled** so a spotlight without a quote doesn't get an empty green box.
- Iterated the quote-mark styling live with Max: bumped the marks to **46px banana `#FAD100`**, and placed them **inline** — the opening `"` sits right before the first word and the closing `"` right after the last word (instead of floating on their own rows), each dropped via negative `vertical-align` to cap the italic quote text.

---

## 2026-06-05 — Newsletter: unify upcoming-event date chips to cyan

One-line template tweak (`lib/newsletter.js`). Effort: low. `npm run build` passes.

- Max noticed two side-by-side upcoming-event cards showed different date-chip colors (left acid-green, right cyan). They weren't hand-set — `EVT_PILLS` alternated `#C6C902` / `#73C4D6` by card position for "visual rhythm." In a 2-up row that reads as two different *kinds* of thing rather than both being upcoming events.
- Set both `EVT_PILLS` entries to cyan `#73C4D6`, so every upcoming-event date chip is consistent and ties to the coworking accent. Rotation removed.

---

## 2026-06-05 — Newsletter data-loss fix + save-path hardening

App code only (`components/CRMManager.jsx`, `lib/services.js`). Effort: diagnose high / fix low. `npm run build` passes. Commits `630cf7b` + `cd30eba` pushed to `main`.

**The scare:** On the deployed app, the Marketing block text + link showed as placeholders and photos were gone. Investigation showed git was clean/pushed and the database record (`nl_may_2026_roundup`) was fully intact — the editor was displaying a **stale draft restored from the browser's `localStorage`** (`sprout_nl_editor_v1`), an older snapshot from before the marketing/photos were added. Clearing local storage by hand didn't stick because the running app rewrites the snapshot on every state change.

- **Fix 1 (`630cf7b`) — necessary.** The restore `useEffect` in `NewsletterView` loaded the local snapshot verbatim and never consulted the database. It now **prefers the authoritative DB record** for any already-saved draft (waits for the newsletters list to load, then matches by id); only a never-saved new draft falls back to the local snapshot. A stale cache can no longer override saved content.
- **Fix 2 (`cd30eba`) — hardening.** Added a single-record `saveNewsletter(n)` to `services.js` that **validates one record and returns a real error on Zod failure** instead of silently skipping (the old bulk path returned `{error:null}` on skip, producing a false "Saved ✓" with nothing written). The save callback now upserts only the changed record via a functional state update (no whole-list re-write, no stale closure), and strips `_isNew`/`_wasNew` so editor flags don't persist into the JSONB blob. Bulk `saveNewsletters()` kept as an unused fallback.
- **Blast radius:** newsletter-only. Contacts/orgs/events/profile use separate save functions and are untouched.
- Two residual items (sync `sendBeacon` tab-close save, post-save refetch) were deliberately **not** added — they only guard cases Fixes 1+2 already prevent.

---

## 2026-06-05 — Newsletter polish pass: spotlight rework, all-photo crop fix, sticky header, mobile stacking, card styling, footer logo, test-send toggles, list delete

App code (`lib/newsletter.js`, `components/CRMManager.jsx`, `app/globals.css`), a new white-logo asset in Supabase Storage, one DB delete. Effort: medium. `npm run build` passes. Committed + pushed.

- **All photo crop boxes now work** (was featured-only). Spotlight + upcoming + past photos use the `ImageCrop` drag control. The bug: non-featured crops updated the editor but not the preview, because each crop box's aspect ratio didn't match its rendered email box. Proved the wiring was correct (node test of `buildCompact` output), then matched each crop ratio to its real box: spotlight 495/200, upcoming 234/140, past 160/110 (featured already 544/200).
- **Community Spotlight** reworked: full-width 200px banner photo on top, name/blurb below, two inline link buttons (Instagram + website/streaming) via `parseBtn`. Replaced the generic add/remove links list.
- **Mobile stacking:** Membership + Marketing + Spotlight changed from side-by-side message/button to stacked (text on top, button below) to fix phone squeeze.
- **Sticky editor header.** Made the editor action bar `position:sticky`. The real blocker was `app/globals.css` `overflow-x:hidden` on `html,body` (forces a scroll container, kills sticky) — changed to `overflow-x:clip`.
- **Card styling:** banana `#FAD100` left accent bars on Membership + Marketing, all four section bars bumped to 6px, `overflow:hidden` so bars clip into rounded corners, and a uniform `0 4px 14px rgba(0,0,0,0.16)` shadow on all boxes (past-event rows kept flat).
- **White footer logo** (`White-logo-new.png` → trimmed/resized → `newsletter-images/brand/sprout-logo-white.png`), placed bottom-right in a two-column footer; its `#030000` background blends into the footer.
- **Test send** is now toggle pills for Max / Danielle / Morgan + a "＋ Add email" manual extras field; sends to the union (deduped). Passphrase is required for both test and list sends (client + server enforced).
- **List-view delete** button (🗑 + styled confirm) on each saved-newsletter card. Note: deleting via raw SQL while the app is open resurrects the row (app auto-saves the in-memory list back) — delete through the app button.
- Coworking chip "THURSDAYS" → "Sprout-by-Day".

---

## 2026-06-05 — Newsletter: new "Marketing" promo section (acid-green block, editable button)

App code only (`lib/newsletter.js`). Effort: low. `npm run build` passes. Committed + pushed.

Added a new Marketing section to the compact newsletter, modeled on the Membership block but acid green:

- **Two new `COMPACT_SECTIONS` entries** — `marketing` (single textarea + ✨ Polish) and `marketingLink` (single; bare URL → default "Learn more →", or markdown `[Button text](URL)` via the existing `parseBtn()`). They auto-render as editor fields (the editor maps over `COMPACT_SECTIONS`). Placed after `membership`, before `spotlightName`.
- **New MARKETING render block** in `buildCompact()`, between the Membership and Community Spotlight blocks. Mirrors the membership table layout (message left, black button right) with an **acid-green `#C6C902`** background.
- Live tuning with Max: message text **white**; button text **banana `#FAD100`** to match the membership button (both the real link and the empty `[Button link]` placeholder); message has its own **white placeholder** (the shared `cph()` grey reads poorly on acid green); **20px padding** between message and button; message converts **newlines → `<br>`** so pressing Enter in the box adds a line break in the email.

---

## 2026-06-05 — Newsletter polish: section renames, inline links + editable button labels, new no-tagline logo, footer cleanup

Template + data + storage (`lib/newsletter.js`; new logo in Supabase Storage `newsletter-images/brand/`; `sprout_profile.address` updated via SQL). Effort: low. `npm run build` passes. Committed + pushed.

Six changes, mostly in `buildCompact()` / `COMPACT_SECTIONS`:

- **Masthead renamed** "Monthly Sprout" → **"Sprout Monthly"** (display label only; template picker name and `<title>` left as "Monthly Roundup").
- **Spotlight heading renamed** "Community Spotlight" → **"Community Sprout Shout"** (rendered email heading; editor field labels still read "Community spotlight — …").
- **Inline links in any fill-in box.** New `linkify()` runs after `esc()` and converts markdown `[label](https://url)` into a styled fuchsia anchor; wired into `cval()` so every placeholder-using field supports it. No space between `]` and `(`; http/https only.
- **Editable RSVP button label.** The upcoming-event `link` box now accepts a bare URL (default "Sign up / RSVP →") **or** markdown `[Button text](url)` to set both label and URL, via a new `parseBtn()` helper. Field placeholder updated to "Button: URL, or [Button text](URL)".
- **New logo.** Swapped the tagline logo ("Less Bullshit, More Connection") for the **black wordmark + heart, no tagline**. Trimmed surrounding whitespace with `sharp` (1379×769 → 473×224), capped to 624px wide, uploaded to `newsletter-images/brand/sprout-logo-blackheart.png` (new filename; old logo kept), and repointed the masthead `<img src>`. Note: SVG is not usable — email clients don't render SVG in `<img>`; must be a transparent PNG.
- **Footer cleanup.** Removed the website link (site under reconstruction; dropped the unused `website` const) so the footer reads `Brooklyn, NY · @sproutsocietyorg`; changed the address to **24 Scott Ave. Brooklyn, NY 11237** (updated in org settings via `jsonb_set`, not hardcoded); added a **501(c)(3) EIN line** rendering `Sprout Society is a registered 501(c)(3) nonprofit · EIN 83-1298420` from `profile.ein`.

---

## 2026-06-05 — Newsletter editor layout: Send card moved right, preview auto-sizes to the full template

App code only (`components/CRMManager.jsx`). Effort: low (single-file UI layout change). `npm run build` passes.

Two layout fixes to the newsletter editor (`NewsletterEditor`):

- **Send card moved to the right column.** It used to sit in the left form column between Details and Sections, pushing the section-fill fields far down. The left column is now Details → (Auto-fill) → Sections, so the sections sit near the top. The Send card now lives in a new right-side column above the preview, with Test send and Send-to-list laid out side by side (the right column is wide enough).
- **Preview fits the whole template.** The iframe was capped at `calc(100vh - 180px)` with an inner scrollbar. Added a `previewRef` + `previewH` state and a `fitPreview()` that reads the document `scrollHeight` on each `onLoad`; the container height now equals the content height (min 480), so the entire newsletter shows with no inner scrollbar. The page scrolls instead, and the preview grows automatically when the filled-in version runs longer than the empty template. Re-measures live as you type.

---

## 2026-06-05 — Non-techy newsletter tutorial with real annotated screenshots

Docs only, no app code or data change. Effort: medium.

Built a plain-English HTML walkthrough of the newsletter feature for people who have never seen the app — no tech speak, just step-by-step with annotated screenshots.

- Captured 10 high-res screenshots of the live Newsletter UI by driving the running dev server with a throwaway Playwright script (landing, templates, editor, Details/Send/Sections cards, live preview).
- `docs/guides/newsletter-tutorial.html` — references the PNGs in `docs/guides/newsletter-shots/`.
- `docs/guides/newsletter-tutorial-portable.html` — single file with all screenshots embedded as base64 (~0.95 MB). The shareable version; opens or emails anywhere with no broken images.
- 10 steps: open Newsletter → pick a template → meet the editor → fill details → write sections (✨ Polish + 🖼 Add image) → save → the Draft→Pending→Approved→Sent stages → test on yourself first → send to list → find it again.
- Annotations are percentage-positioned numbered pins (so they scale) with plain-language legends, in the Sprout palette (ink/acid/banana/fuchsia/cyan, Lato). Both throwaway capture/inline scripts deleted after.

---

## 2026-06-05 — Wrote + imported the May newsletter, then built the in-app send workflow (Draft → Pending → Approved → Sent) with Gmail sending

App code + new server route + data. Effort: high (multi-file build + outward-facing send + Gmail auth wiring). `npm run build` passes; verified a live test send end to end.

**1. Wrote the May "Monthly Sprout" issue.** Ran the Communications Manager agent against the filled intake brief (`briefs/SnTv1_newsletter-intake-TEMPLATE.md`, NOT the blank `newsletter-2026-06.md` — corrected mid-task). Tightened Max's brain-dump into Sprout-voice copy, fixed typos, left genuinely-blank items blank. Imported it as a real compact-template draft (`nl_may_2026_roundup`) by baking `field_values` + HTML through `buildNewsletter()` and upserting to `sprout_newsletters`.

**2. SnT signup hyperlink + responsive fix** (`lib/newsletter.js`):
- Added an optional `link` field to the compact **upcoming-event** block (`COMPACT_SECTIONS` + `compactUpCard`); renders a clickable fuchsia "Sign up / RSVP →" button. Wired the Show N Tell Google Form to the June 26 card. The editor now shows a "Sign-up / RSVP link" input on every upcoming event.
- **Made the email fluid:** outer container `width:600px` → `width:100%; max-width:600px`, so it fills any phone width instead of forcing horizontal scroll / zoom-out. Improves every compact newsletter.
- Fixed the footer **unsubscribe** (dead Mailchimp `*|UNSUB|*` tag → working `mailto:hello@…?subject=Unsubscribe` + physical address) for CAN-SPAM compliance.

**3. Send workflow** (`lib/schemas.js`, `components/CRMManager.jsx`, new `app/api/send/route.js`):
- New statuses **pending** + **approved** (Zod enum + `NL_STATUS_OPTS`/`NL_GROUPS`/colors). Flow: Draft → Pending → Approved → Sent.
- New **Send card** in the editor: a passphrase field, a **Test send** (type addresses, subject prefixed `[TEST]`, always available), and **Send to list** (bucket selector All/Community/Donors/Prospects with live email counts, enabled only when status = Approved; on success auto-flips to Sent + stamps the date).
- New `app/api/send` route sends via **Gmail API as hello@sproutsociety.org**, reusing the existing Workspace OAuth refresh token (has `gmail.send` scope) — no new API key. Test mode = typed addresses; list mode resolves recipients **server-side from the CRM by bucket** (BCC'd in batches of 45) so it can't be aimed at arbitrary addresses.
- 🔒 Gated by `NEWSLETTER_SEND_SECRET` (the app is public + unauthenticated). Verified 401 on wrong/missing passphrase, 200 + delivered email on a real self-test to hello@.

**Env (added to `.env.local`, must also be set in Vercel):** `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER`, `NEWSLETTER_SEND_SECRET`. Until set in Vercel, sending works on localhost only.

---

## 2026-06-05 — Fixed newsletter "Save failed: violates row-level security policy" (added missing RLS policy)

DB-only change (one RLS policy via Supabase MCP `apply_migration`); no app code. Effort: diagnose low / fix low.

**The bug:** every newsletter save threw `new row violates row-level security policy for table "sprout_newsletters"`.

**Root cause:** `sprout_newsletters` had RLS **enabled but zero policies** — Postgres denies all writes by default, so the table was effectively locked and newsletters had never persisted via the app. It was the only `sprout_*` table missing a policy; every other CRM table (`sprout_contacts`/`orgs`/`events`/`profile`) already carries an identical `anon_all` policy (`FOR ALL TO anon USING (true) WITH CHECK (true)`). Confirmed via `pg_policies`.

**Fix:** applied the same `anon_all` policy to `sprout_newsletters` (migration `sprout_newsletters_anon_all_policy`), bringing it in line with the rest. Verified live. Applies immediately at the DB, no redeploy.

**Security note (discussed + deferred):** this app has no Supabase Auth — RLS is "enabled" everywhere but every policy is wide-open `anon`, and the anon key ships in the client bundle, so the whole CRM is effectively public. Adding `anon_all` to newsletters doesn't weaken anything; it makes the table consistent with the app's existing model. Real lockdown (Supabase Auth + `auth.uid()`-scoped policies on every table) is now a tracked cross-app project that pairs with the planned per-tool Supabase migration.

---

## 2026-06-04 — SOLVED the gigantic featured-image bug + added a drag-to-reposition crop control

App + template change (`components/CRMManager.jsx` + `lib/newsletter.js`; `npm run build` passes). Effort: diagnose high / fix low.

**Root cause (a 4-session bug):** in `buildCompact()`, the featured and spotlight `<img alt="…">` used `cval(...)` for the alt text — but `cval` returns **HTML** (`<span style="color:#c2c2bf;">[…]</span>`) when the field is empty. Inside `alt="…"`, those quotes terminate the `<img>` tag early; the browser's error-recovery drops the real `style` (the `height:200px; max-width:544px; object-fit:cover`), so the image renders at natural size = gigantic. It dodged 3 prior sessions because every fix tweaked the sizing CSS and every test used a non-empty title (which made `cval` return clean text); Max uploads the photo before typing a title, triggering the empty-field path. Confirmed by inspecting the live element (`alt="<span style=" color:#c2c2bf;"…`).

**Changes:**
- **Fix** (`lib/newsletter.js`): featured + spotlight alt now use plain escaped text — `alt="${esc(v.featuredTitle || "Featured event")}"` and `alt="${esc(v.spotlightName || "Member")}"` (the event-card/past-row imgs already used `esc(...)`). Verified in headless Playwright with an empty title → renders exactly 544×200.
- **Crop feature** (Max's follow-up): featured photo gets a **drag-to-reposition** control. `lib/newsletter.js` — featured `COMPACT_SECTIONS` entry flagged `crop:true, ratio:544/200`; img renders `object-position:${esc(v.featuredPhotoPos || "center")}`. `CRMManager.jsx` — new reusable **`ImageCrop`** component shows the photo at the exact 544×200 banner aspect with `object-fit:cover` and pointer-drag to move the focal point (clamped 0–100%), emitting an `object-position` string into `field_values.featuredPhotoPos`. New upload recenters; Remove clears both. No canvas/re-upload — email-safe. `field_values` is `z.record(z.any())`, no schema change.

**Found, not yet applied (needs Max's OK):** `sprout_newsletters` has no RLS policy — every save returns 401 ("violates row-level security policy") and the table is empty. Fix is the same `anon_all` policy the other `sprout_*` tables have.

---

## 2026-06-04 — Monthly Sprout newsletter intake form + Comms agent brain-dump/don't-guess workflow

Virtual-agency docs only (no app code or CRM data change). Effort: medium.

**Goal:** pair the existing SnT event-recap form with a monthly newsletter intake form so Max brain-dumps and the Communications agent writes a clean first draft, filling what it can, leaving unknowns blank, never guessing, and flagging the gaps.

**Changes:**
- **Rewrote** `virtual-agency/employees/Communications/briefs/_newsletter-intake-TEMPLATE.md` to map 1:1 to the live compact **Monthly Sprout** template (`COMPACT_SECTIONS` in `lib/newsletter.js`): headline, intro/thank-you, featured event (title/recap/photo), coworking (note + Thursday happy hour), membership ask, community spotlight (name/blurb/photo), upcoming events (repeat), past events (repeat). The old version mapped to the retired classic roundup. Every field instructs: brain-dump messy notes, leave unknowns blank, do not guess.
- **Updated** `communications-manager-system-prompt_v1.md`: tooling table points at the compact template + the section-mapped intake; Newsletter Draft Protocol rewritten with two hard rules — (a) input is a stream-of-consciousness dump to be tightened into clear/concise/punchy Sprout-voice copy without inventing facts, and (b) never guess: leave blank and end with a "Couldn't fill — need from you" list. Output Standards + Session Workflow aligned (dropped the old bracket-fill/ask-before-inventing lines).
- **Added** `briefs/SnTv1_newsletter-intake-TEMPLATE.md` — Max's filled May 2026 intake (Sprout n Tell Vol.1 featured; Barnun happy hour + Co-Work past; Pat Hopkins spotlight; Sprout n Tell Vol.2 6/26 upcoming). The blank reusable `_newsletter-intake-TEMPLATE.md` was restored so the copy-the-template workflow persists.

---

## 2026-06-04 — Newsletter preview: fix "See more events" hijacking the pane + make every link work + add Instagram button

App + template change (`components/CRMManager.jsx` + `lib/newsletter.js`; `npm run build` passes). Effort: diagnose medium / fix low.

**The bug:** clicking **"See more events"** in the compact-newsletter preview reloaded the iframe and rendered the live CRM **Dashboard** inside the preview pane.

**Root cause:** the preview is an `<iframe srcDoc=…>`, and a `srcdoc` document inherits its base URL from the parent page (`localhost:3000/`). The email's `<a href="#events">` resolved to `http://localhost:3000/#events`, so clicking it navigated the iframe to the live app, which booted and rendered the Dashboard.

**Fix (preview-only):**
- New `previewHtml` `useMemo` in `NewsletterEditor` injects `<base href="about:srcdoc">` into the `<head>` so fragment links scroll within the iframe instead of loading the app. The stored/sent `built.html` is untouched.
- Sandboxed the preview iframe (`sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"`) — scripts off as defense-in-depth, popups allowed so `target="_blank"` links open.
- Moved `id="events"` off a stray `<a>` (which sat between `</tr>` and `<tr>` and got foster-parented out of the table) onto a real `<tr id="events">`, so the scroll target is reliable.

**Then made the other links real:**
- Membership button got `target="_blank" rel="noopener noreferrer"`.
- Footer website + IG handle changed from plain text to clickable links (website https-normalized; IG → `instagram.com/<handle>`).
- Added a new fuchsia "● Follow @handle →" Instagram button in the intro area (there was no IG button before; the handle only appeared as footer text). Pulls from `profile.igHandle`; blank → placeholder. Solid fuchsia + `●` glyph since email clients don't render CSS gradients/SVG.

**Note:** the base-injection + scroll-target + membership-`target` work landed in commit `b4be500` (bundled with the Polish version-history change below). This commit adds the footer links + IG button (`lib/newsletter.js`) and the sandbox `allow-popups` line (`CRMManager.jsx`). Email caveat: Gmail/Outlook strip `id` anchors, so the scroll only works in the in-app preview + hosted view; `target="_blank"` does ship to the real email.

---

## 2026-06-04 — Newsletter Polish: non-destructive result card with version history

App code change (`components/CRMManager.jsx`; `npm run build` passes). Effort: medium.

**The ask:** the ✨ Polish button overwrote the field silently, destroying the original draft. Make it non-destructive — show the agent's rewrite in a new box with an explicit "add" action, keep the original, and allow re-polishing.

**Built (in `NewsletterEditor`):**
- New per-field `polishOut` state: `fieldId -> { apply, versions:[string] }`. `runPolish` no longer calls `apply(...)` directly — it **appends** the result to that field's `versions` array, leaving the field untouched.
- New `polishPanel(fieldId)` renderer — an acid-yellow result card shown directly under the field (original stays visible above). Each re-polish stacks a new numbered version (`v1 · v2 · v3 · latest`), each with its own **✓ Use this** button. A single **✕ Discard** clears the card.
- `usePolishVersion` applies the chosen text + clears the card; `clearPolish` discards.
- The Polish button relabels to **✨ Re-polish** once a result exists. Wired into both call sites: single copy fields (Headline, Intro, etc.) and per-item repeat fields (event entries).
- Layout/version behavior chosen by the user: inline card (not a popup) + keep all versions (not latest-only).

**Also in this commit (folded in):** the prior session's large uncommitted `NewsletterView` refactor (templates-on-top landing; `mode` `list|pick|edit` → `list|edit`; `startNew()`), left on disk across sessions, is committed here so the tree stops drifting. Reverted a leftover debug marker in `lib/newsletter.js` (`border:6px solid red` on the featured `<img>`, from the prior gigantic-image hunt) back to `border:0`.

## 2026-06-04 — Compact newsletter masthead: "MONTHLY ROUNDUP" → "MONTHLY SPROUT"

One-line template tweak (`lib/newsletter.js` only; `npm run build` passes).

- The masthead right-column label in `buildCompact()` read `Monthly Roundup` (rendered uppercase via `text-transform:uppercase`). Changed the literal to `Monthly Sprout` at `lib/newsletter.js:233`.
- Display-only. The template picker `name` ("Monthly Roundup") and the `<title>` tag ("Sprout Society Monthly Roundup") were left untouched.
- Commit staged `lib/newsletter.js` only. The pre-existing uncommitted `components/CRMManager.jsx` NewsletterView refactor (open handoff) and a line-endings-only no-op in `lib/schemas.js` were deliberately excluded.

## 2026-06-04 — UNRESOLVED: featured newsletter image still renders gigantic (handoff to a fresh convo)

Debugging session. The compact newsletter editor preview still renders an uploaded Featured photo at full natural height (spilling past the email-card edges). All fixes failed from the user's POV — handing off.

**Code changes that ARE on disk + committed/pushed (and proven correct):**
- `lib/newsletter.js`: featured `<img>` `height:auto` → fixed **200px window** with `object-fit:cover; object-position:center; max-width:544px`, wrapped in a `<td height="200" style="height:200px">`; empty placeholder shares the same 200px cell. Upcoming-event card img → `height:140px; object-fit:cover`. (200px version supersedes the earlier 260px in `3e4186a`.)
- Verified the disk code is correct: a `node` import of `buildNewsletter({templateId:'monthly-roundup-compact', fieldValues:{featuredPhoto:...}})` returns HTML containing exactly `height:200px; object-fit:cover; max-width:544px`. Routing confirmed: `buildNewsletter` → `buildCompact` at `lib/newsletter.js:464`.

**Failed remediation attempts (none changed the user's preview):**
1. Hard-refresh (Ctrl+Shift+R) to bust the `built` `useMemo` cache.
2. Suspected broken compile serving a stale build — ruled out (editor renders fine).
3. Killed the node process on port 3000, deleted `.next/cache`, restarted `npm run dev` fresh — still broken.

**Key clue:** the rendered image exceeds `max-width:544px` and ignores `height` — behavior the current disk code cannot produce → the preview is executing code different from disk (stale/baked HTML), not a CSS problem.

**Strongest untested lead for next convo:** a large **uncommitted** refactor of `NewsletterView` in `components/CRMManager.jsx` (templates-on-top landing; `mode` `list|pick|edit` → `list|edit`; added `startNew()`). Verify the preview iframe still reads the live `built.html` (recomputed `useMemo`) and not a stale baked `draft.html`. Decisive test: drop a temporary visible marker into `buildCompact`'s featured block and reload — if it doesn't appear, the preview isn't running current `buildCompact`. Also confirm the browser is on localhost:3000, not the deployed Vercel site. `components/CRMManager.jsx` left uncommitted for the user to finish.

## 2026-06-03 — Compact newsletter: render Headline + Intro greeting block (+ Polish key / grant-tool build diagnosis)

App code change (`lib/newsletter.js`). Effort: diagnose medium / fix low.

- **Headline + Intro now render.** The compact editor's **Headline** (`v.headline`) and **Intro / thank-you** (`v.intro`) fields had no visible home — `headline` rendered nowhere and `intro` only fed the hidden inbox-preheader `<div>`. Added a visible greeting block (headline 22px/900 + intro paragraph, `cval` placeholder pattern) at the top of `buildCompact()`, between the masthead rule and Featured.
- **Featured photo banner 260px → 200px** (`object-position:center`, dropped the placeholder padding wrapper) — Max's tuning in the same file.
- **Polish "API key didn't match" — resolved as a Vercel config issue, no code change.** The deployed app reads `ANTHROPIC_API_KEY` from Vercel; a stale/wrong value lived under that name on the **`sprout-crm-tool-next-js`** project (and Max had initially opened the wrong project). Local `.env.local` key verified valid (curl → 200). Max edited (not added) the key under Settings → Environments → Production + redeployed → Polish works.
- **Diagnosed (and locally fixed) a build break in a *different* repo.** The redeploy surfaced a *Build Failed* for `sprout-grant-tool` (GitHub `mhperkins/sprout-tools`): `Error: supabaseKey is required` from a module-scope `createClient(url, SUPABASE_SERVICE_ROLE_KEY)` evaluated during `next build` page-data collection. Fix (lazy-init the client inside the handlers in `app/api/ai/upload/route.js` + `upload-image/route.js`, remove the dead `export const config`) is verified green locally but **uncommitted/unpushed** to that repo, pending authorization.
- Swept in the prior session's orphaned delivery slide (committed in code, never added as a file).

## 2026-06-03 — Newsletter: Save draft + auto-save on navigate-away + persist on reload

App code only (`components/CRMManager.jsx`). `npm run build` passes. Effort: medium.

- **`💾 Save draft` button** — persists to Supabase but stays in the editor. The old "Save" (which closed back to the list) is now **"Save & close"**. A new draft adopts its generated id on first save so repeat saves update in place instead of duplicating.
- **Auto-save on navigate-away** — the editor saves on unmount (← Back, sidebar view switch) and on tab close (`beforeunload`). Guarded by `draftHasContent()` so a blank new draft isn't saved; suppressed (`suppressAuto` ref) on Delete and explicit Save-&-close so a deleted newsletter isn't resurrected and an explicit save isn't double-written.
- **Persist on reload** — `NewsletterView` snapshots `{mode,draft}` to `localStorage` (`sprout_nl_editor_v1`) on every change and restores it once on mount (in a `useEffect`, guarded by a `restored` ref, to avoid an SSR/hydration mismatch). A reload mid-edit returns to the editor with the draft intact, even a never-saved new one; cleared on return to the list.
- **Duplicate trap fixed** — the new-draft id is a deterministic slug, so auto-saving then returning with a stale `id:null` snapshot would regenerate the same base id and bump to `_2`. `onAutoSave` now writes the saved rec (with its assigned id) back into the localStorage snapshot so restore returns the id.
- **Mechanics** — new editor callbacks `onSaveStay`/`onSaveClose`/`onAutoSave` replace the single `onSave`; `makeRecord(d)` factors the shared id-assign + html-bake; `draftRef`/`builtRef`/`autoSaveRef` capture latest values for the unmount cleanup.

## 2026-06-03 — Fix: cap newsletter photo blocks to fixed-height banners

App code change (`lib/newsletter.js` only). An uploaded featured photo was rendering at full natural height and dominating the page.

- **Featured photo** in `buildCompact()`: was `width:100%; height:auto` (a tall portrait ran floor-to-ceiling) → now a fixed **260px** banner with `object-fit:cover`.
- **Upcoming-event card photo** in `compactUpCard()`: same fix → fixed **140px** banner with `object-fit:cover`, so a portrait can't blow out the 2-up card.
- `object-fit:cover` renders in the in-app preview and modern email clients; older Outlook ignores it and shows the bounded box. Spotlight (64×64) and past-row (max-160px) images were already bounded — unchanged.

## 2026-06-03 — Web & Graphic Designer employee + in-app compact newsletter (template, section editor, Comms "Polish" AI, image uploads)

App code + data-infra change. `npm run build` passes.

**New virtual-agency employee — Web & Graphic Designer** (`virtual-agency/employees/Design/`): system prompt + job description + work-log + `briefs/`/`sprints/`, mirroring the Communications pattern. Primary job = designing the HTML newsletter. Prompt carries the brand rules (palette, Lato, cyan→fuchsia→acid→banana accent rotation), email-safe HTML rules (tables not flexbox, inline styles, ~600px, absolute image URLs, bulletproof buttons), the Canva pixel-exact-vs-editable limit, and the Communications↔Design handoff. Org doc updated.

**Compact monthly-roundup design** (`docs/newsletter/monthly-roundup-compact.html`): removed the black top trim (+ acid rule under the masthead), sized to ~7in tall on a phone (measured with throwaway Playwright scripts), restructured to: Featured event photo block (Sprout n Tell) + a "See more events" `#events` jump → Coworking promo (permanent Tue/Thu + Thursday Happy Hour, not an event) → Membership → Community Spotlight → Events (Upcoming 2-up + Past rows). In-email anchor caveat: Gmail/Outlook strip `id` anchors.

**In-app newsletter system** (`lib/newsletter.js`, `components/CRMManager.jsx`):
- Added the compact as the **primary** template `monthly-roundup-compact` ("Monthly Roundup"); the old one is now "Monthly Roundup (Classic)".
- New `COMPACT_SECTIONS` structured model + `buildCompact()` renderer (not bracket-extraction); `buildNewsletter` delegates for the compact id.
- **Section-based custom fill form**: each section is its own field; single boxes for copy, repeat sections (Upcoming/Past events) start with one entry + a "＋ Add another event" button. Live iframe preview as you type.

**Stream-of-consciousness → Comms "✨ Polish"** (`app/api/polish/route.js`, new `@anthropic-ai/sdk`): server-side Anthropic call (Haiku 4.5, prompt-cached system = condensed Communications voice/rules) rewrites a brain-dump into 1–2 Sprout-voice sentences. Button on every copy field. Requires `ANTHROPIC_API_KEY` (server-side; `.env.local` + Vercel) — placeholder appended to `.env.local`.

**Image uploads** (`lib/services.js`, Supabase Storage): new public `newsletter-images` bucket (migration `newsletter_images_storage_bucket`: anon insert + public read). "🖼 Add image" buttons on the featured photo, spotlight, and each event entry upload via `uploadNewsletterImage()` and store a public URL (works in app preview and email). The logo is now hosted in the bucket too (`brand/sprout-logo.png`, hardcoded into `buildCompact`), fixing the old relative-path-breaks-in-email problem.

## 2026-06-03 — Effort-Level Protocol authored + saved to global and project memory

Config/memory only, no repo code or data change (all artifacts live outside the git repo).

- Wrote the **Effort-Level Protocol**: the word `effort` (or my own judgment on a big/multi-step/hard-to-reverse task) triggers an opening `Effort: <low|medium|high|max/ultra> — <why>` line; debugging splits into `diagnose / fix` with fix never exceeding diagnosis; data-loss surfaces go max on both; match effort to the cost of being wrong; autonomous mid-task re-tiering under bypass permissions (report, don't ask).
- Saved to **Sprout project memory** (`memory/effort-level-protocol.md`, type `feedback`, + `MEMORY.md` pointer).
- Saved to **global `~/.claude/CLAUDE.md`** as a new "Effort-Level Protocol" section (between Permissions and Git Commands) so it applies across all projects.
- Open: the project-memory copy is now redundant with the global rule — pending Max's call whether to delete it or keep it as a backup.

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
