# Instagram → CRM Import Spec

> **Purpose:** Define the exact JSON contract that **Claude in Chrome** must emit when scraping Sprout's Instagram followers / researching IG accounts, so the output drops into the CRM **Import & Merge** view with zero hand-editing and **zero silent data loss**.

This is the "landing zone" half of the two-surface workflow:

1. **Claude in Chrome** drives Sprout's logged-in IG session, collects + researches handles, and emits JSON **per this spec**.
2. **Claude Code (this project)** receives that JSON, dedupes it, and writes it into the CRM.

---

## ⭐ Priority classification — the roles that matter

When researching a handle, the **high-signal roles** to identify (and the only ones worth filtering on) are:

| Role | Contact `relationship_types` value | `tags` value (both contacts AND orgs) |
|---|---|---|
| Musician | `music` | `music` |
| Artist | `art` | `art` |
| Event host | `event_host` | `event_host` |
| Community builder | `community_builder` | `community_builder` |

> The tag token is **identical** to the `relationship_types` token so a single filter value matches both. For contacts, the importer **auto-mirrors** these four roles from `relationship_types` into `tags` — but include them in `tags` anyway for orgs (orgs have no `relationship_types`).

- These four are usually obvious from an IG bio/content (a DJ/band → `music`; a painter/designer → `art`; someone running events → `event_host`; a collective/space convening people → `community_builder`).
- **Always mirror the role into `tags`** so a single tag filter surfaces **both people and orgs** (orgs have no `relationship_types` field — `tags` is their only role home).
- `partner`, `attendee`, `other` are **low-signal**: set them on contacts' `relationship_types` if accurate, but do **not** tag them — they're not worth filtering on.

---

## ⚠️ Why this spec exists: the two silent-failure modes

The Import view (`components/CRMManager.jsx`) accepts a single object or an array, then validates every record through Zod (`lib/schemas.js`). Validation is **silent** by design:

| Failure mode | What happens | Consequence |
|---|---|---|
| **Unknown key** (e.g. `tier`, `confidence`, a touchpoint's `outcome`) | Zod **strips** it | Data silently lost — record still imports, but that field is gone |
| **Invalid enum value** (e.g. `relationship_types: ["arts"]`, `segment: "lead"`) | Zod **fails the whole record** | The **entire contact/org is silently dropped** — no error in the UI |

**Rule:** emit ONLY the fields listed below, and ONLY the allowed enum values. Put every other piece of IG intel into `notes`, `instagram_handle`, or a `touchpoints[]` entry — those persist.

---

## The JSON contract

Emit a **single array** mixing organizations and individuals. Orgs first is fine but not required (the importer routes by `record_type`).

### Organization record

```json
{
  "record_type": "organization",
  "id": "org_dear_community",
  "name": "DearCo",
  "category": "partner",
  "instagram_handle": "@dear_community",
  "website": "",
  "relationship_status": "warm",
  "tags": ["instagram_sourced", "nyc", "brooklyn", "community_builder", "wellness"],
  "notes": "Instagram: @dear_community | 2,444 followers | cadence: active. Bio: \"Building community through live art performances for a 1-of-a-kind NYC experience.\" Mutual follow with @sproutsocietyorg. Followed by shared-network accounts (@fabriksocialspaces, @xojessicatorres). Recent: Mindful Vibes + Sound Bath at Beatbrush Studios (Brooklyn); open volunteer positions. Type: Partner / Community Builder. Why now: active Brooklyn wellness events + mutual follow = direct Sprout alignment. [IG-sourced 2026-04-30, confidence MEDIUM]",
  "next_action": "Leave a substantive comment on @dear_community's most recent Brooklyn post, then assess DM timing",
  "next_action_date": "2026-05-07",
  "touchpoints": [
    { "date": "2026-04-30", "summary": "[social/inbound] @dear_community follows @sproutsocietyorg on IG. Mutual follow established." }
  ],
  "financial_relationship": { "has_given": false, "total_given": 0, "grant_history": [] }
}
```

**Org field rules**
- `id` — stable, human-readable: `org_<name_snake_case>`. Used for dedupe + merge.
- `category` — **must** be one of: `funder | partner | vendor | media | government`. Default `partner`.
- `relationship_status` — **must** be one of: `cold | cool | warm | active`. A mutual follow ⇒ `warm`; one-way (they follow us, we don't follow back) ⇒ `cool`; cold outreach target ⇒ `cold`.
- `instagram_handle` — put the handle HERE (it persists), not only in notes.
- `tags` — array of free-form labels for cataloguing/filtering (e.g. `instagram_sourced`, `nyc`, `wellness`, `community_builder`). Always include `instagram_sourced`. **Persists** (added to the schema for this workflow).
- **No** `tier`, `confidence`, `segment` on orgs — orgs have no `segment` field, and `tier`/`confidence` are stripped. Fold them into the `notes` trailer (`[IG-sourced <date>, confidence <LOW|MED|HIGH>]`).
- Orgs use a single `next_action` + `next_action_date` (no `next_actions[]` array — that's contacts only).

### Individual (contact) record

```json
{
  "record_type": "individual",
  "id": "ind_jesse_rauch",
  "first_name": "Jesse",
  "last_name": "Rauch",
  "instagram_handle": "@jessebinnyc",
  "email": null,
  "segment": "prospect",
  "relationship_status": "warm",
  "relationship_types": ["community_builder", "event_host"],
  "tags": ["instagram_sourced", "nyc", "mutual_follow", "community_builder", "event_host"],
  "org_ids": ["org_community_week_nyc"],
  "notes": "Instagram: @jessebinnyc | co-founder, Community Week NYC. Mutual follow with Sprout. Bio: ... [IG-sourced 2026-04-30, confidence HIGH]",
  "next_action": "DM re: Community Week May 9-17 collaboration",
  "next_action_date": "2026-05-02",
  "next_actions": [
    { "id": "na_jesse_1", "text": "DM re: Community Week May 9-17 collaboration", "date": "2026-05-02", "completed": false }
  ],
  "touchpoints": [
    { "date": "2026-04-30", "summary": "[social/inbound] @jessebinnyc follows Sprout on IG. Co-founder of Community Week NYC." }
  ]
}
```

**Contact field rules**
- `id` — `ind_<first_last>` snake_case. Used for dedupe + merge.
- `segment` — for new IG finds use **`prospect`**. Allowed: `community | donor | prospect`.
- `relationship_status` — `cold | cool | warm | active` (mutual follow ⇒ `warm`).
- `relationship_types` — array, each value **must** be one of:
  `music | art | event_host | partner | community_builder | attendee | sprout_society | other`.
  ⚠️ NOT `"arts"`, NOT `"community builder"` (space), NOT `"founder"`. If a role doesn't map, use `"other"` and describe it in `notes`. **One wrong value drops the entire contact.**
- `tags` — array of free-form labels for cataloguing/filtering (e.g. `instagram_sourced`, `nyc`, `mutual_follow`). Always include `instagram_sourced`. **Persists.**
- `org_ids` — array of `org_` ids this person is affiliated with. If you create the org in the same import, reference its `id` here and the link resolves.
- `email` — use `null` if unknown (IG rarely exposes it). Do not invent.
- **Dual next-action rule (mandatory):** if you set `next_action` / `next_action_date`, you **must** also add a matching `next_actions[]` entry (`{id, text, date, completed:false}`), or the dashboard won't see the follow-up.

### Touchpoint sub-object — exact shape

Only these keys persist. Everything else (`type`, `direction`, `outcome`, `next_step`) is **stripped** — encode that context inside `summary` with a bracket prefix.

```json
{ "date": "2026-04-30", "summary": "[social/inbound] <what happened, who, why it matters>", "next_action": "", "next_action_date": null }
```

- `date` — **must** match `YYYY-MM-DD` or the touchpoint is dropped.
- `summary` — required, min 1 char. Lead with a `[channel/direction]` tag so the old `type`/`direction`/`outcome` info survives as text.

---

## Dedupe before writing (Claude Code side)

Scraped lists WILL contain handles already in the CRM (your April scan caught `@communityweek.nyc`, `@jessebinnyc`). Before importing, run each handle/name through **`check_existing`** (sprout-crm MCP). Then:

- **New** → import fresh (Import view, or `scaffold_from_research` for a full brief).
- **Existing** → **merge**, don't duplicate: `create_or_update_contact` / `create_or_update_org` with the existing `id`. Merge is fill-empty by default (only blanks fill; `relationship_types` union; touchpoints append-deduped), so verified data is never clobbered. Pass `overwrite:true` only on a field you intend to replace.

---

## What stays manual / out of scope

- **Completeness ceiling:** IG's followers modal lazy-loads + virtualizes the DOM, so any single scrape captures only what rendered (your run got ~57 before it stalled). Treat each pass as a batch, not a guaranteed-complete roster. Re-run to go deeper.
- **No follower list / user search via the official API** — this whole workflow exists *because* the API blocks it. The browser scrape is your own session at human pace (low-risk, but still technically against IG ToS — keep volume sane).
- **Email/phone** are almost never on IG. Leave `null`; enrich later via the `/email-to-crm` flow or Givebutter.

---

## TL;DR for the Claude-in-Chrome prompt

> Scrape followers, research the promising ones, and output a **single JSON array** of `organization` and `individual` records **exactly per `docs/guides/instagram-to-crm-import-spec.md`**: only schema fields, only allowed enum values (`relationship_types`, `segment`, `relationship_status`, `category`), all rich IG context in `notes` / `instagram_handle` / `touchpoints[].summary`, structured labels in `tags` (always include `instagram_sourced`), and a matching `next_actions[]` entry whenever `next_action` is set. New finds get `segment:"prospect"`. Do not emit `tier` or `confidence` as top-level keys (fold them into the notes trailer).
