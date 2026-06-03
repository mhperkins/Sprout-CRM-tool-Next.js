# Instagram Deep-Dive → Sprout CRM: JSON Output Contract

> **For the Desktop / Claude-in-Chrome research project.** You research the chosen Instagram accounts (follow your existing research protocol), then emit the result as JSON **exactly per this contract**. The JSON gets handed back to Claude Code, which dedupes it against the CRM and imports it. This document is the authoritative output spec — match it exactly.

---

## How to use this document

1. Take the verified shortlist of handles (the ones marked for deep dives).
2. For each, run your normal deep-research protocol — but the **source of truth is the live Instagram profile**: open each handle, read the bio, link-in-bio, recent posts, follower count, and mutual-follow status with `@sproutsocietyorg`. Supplement with any off-IG footprint (website, press) you find.
3. Emit **one single JSON array** containing all records (mix of `organization` and `individual`). Output nothing but the array — no prose around it.
4. Obey the enum and field rules below **exactly**. They are not stylistic — see "Why this matters" below.

---

## ⚠️ Why this matters: two silent-failure modes

The CRM importer validates every record with Zod. Validation is **silent by design**:

| Mistake | What happens | Result |
|---|---|---|
| **Unknown key** (e.g. `tier`, `confidence`, `followers`, a touchpoint `outcome`) | The key is **stripped** | That data is silently lost |
| **Invalid enum value** (e.g. `relationship_types: ["arts"]`, `segment: "lead"`) | The **whole record fails** | The entire contact/org is **silently dropped** — no error shown |

**Therefore:** emit ONLY the fields listed here, and ONLY the allowed enum values. Every other piece of intel goes into `notes`, `instagram_handle`, or a `touchpoints[]` entry — those persist.

---

## The JSON contract

Emit a **single array** mixing organizations and individuals. The importer routes each record by its `record_type`.

### Organization record

```json
{
  "record_type": "organization",
  "id": "org_bar_nun",
  "name": "Bar Nun",
  "category": "partner",
  "instagram_handle": "@barnun.life",
  "website": "",
  "relationship_status": "warm",
  "tags": ["instagram_sourced", "nyc", "brooklyn", "event_host"],
  "notes": "Instagram: @barnun.life | non-alcoholic, vegetarian bar with events. Bio: \"...\". Link in bio: <url>. Mutual follow with @sproutsocietyorg. Recent: <events/posts>. Type: Event Host / Venue. Why now: <reason>. [IG-sourced 2026-06-03, confidence MEDIUM]",
  "next_action": "Leave a substantive comment on their latest events post, then assess DM timing",
  "next_action_date": "2026-06-10",
  "touchpoints": [
    { "date": "2026-06-03", "summary": "[social/inbound] @barnun.life follows @sproutsocietyorg on IG. Mutual follow established." }
  ],
  "financial_relationship": { "has_given": false, "total_given": 0, "grant_history": [] }
}
```

### Individual (contact) record

```json
{
  "record_type": "individual",
  "id": "ind_jonathan_puente",
  "first_name": "Jonathan",
  "last_name": "Puente",
  "instagram_handle": "@jonathanpuentephoto",
  "email": null,
  "segment": "prospect",
  "relationship_status": "warm",
  "relationship_types": ["art"],
  "tags": ["instagram_sourced", "nyc", "mutual_follow", "art"],
  "org_ids": [],
  "notes": "Instagram: @jonathanpuentephoto | photographer. Bio: \"...\". Link in bio: <portfolio url>. Mutual follow with Sprout. [IG-sourced 2026-06-03, confidence HIGH]",
  "next_action": "DM re: photographing a Sprout event",
  "next_action_date": "2026-06-06",
  "next_actions": [
    { "id": "na_jonathan_1", "text": "DM re: photographing a Sprout event", "date": "2026-06-06", "completed": false }
  ],
  "touchpoints": [
    { "date": "2026-06-03", "summary": "[social/inbound] @jonathanpuentephoto follows Sprout on IG. NYC photographer." }
  ]
}
```

---

## Allowed enum values (a wrong value silently drops the record)

| Field | Applies to | Allowed values | Default / guidance |
|---|---|---|---|
| `record_type` | all | `organization`, `individual` | required |
| `category` | orgs | `funder`, `partner`, `vendor`, `media`, `government` | default `partner` |
| `segment` | contacts | `community`, `donor`, `prospect` | **use `prospect`** for new IG finds |
| `relationship_status` | all | `cold`, `cool`, `warm`, `active` | mutual follow ⇒ `warm`; one-way (they follow us, we don't follow back) ⇒ `cool`; cold target ⇒ `cold` |
| `relationship_types` | contacts (array) | `music`, `art`, `event_host`, `partner`, `community_builder`, `attendee`, `sprout_society`, `other` | if a role doesn't map, use `other` and describe in `notes` |

> ⚠️ `relationship_types` traps: NOT `"arts"`, NOT `"musician"`, NOT `"community builder"` (with a space), NOT `"founder"`, NOT `"photographer"`. Map to the closest allowed token (`art`, `music`, `community_builder`) or use `other`. **One wrong value drops the entire contact.**

---

## Field rules

**IDs**
- Org: `org_<name_snake_case>` (e.g. `org_floorwork_collective`).
- Contact: `ind_<first_last>` snake_case (e.g. `ind_haley_sumner`).
- Used for dedupe + merge — keep them stable and human-readable.

**Priority roles — the four that matter** (`music`, `art`, `event_host`, `community_builder`)
- Always mirror the role into `tags` using the **identical token**.
- For contacts: the importer auto-mirrors from `relationship_types` → `tags`, but include it in `tags` anyway.
- For orgs: there is **no** `relationship_types` field — `tags` is the **only** place a role lives. An event-host org MUST have `"event_host"` in `tags` or it won't surface in role filters.
- `partner`, `attendee`, `other` are low-signal: set on a contact's `relationship_types` if accurate, but do **not** add them to `tags`.

**`tags`** — free-form array of labels for filtering. Always include `"instagram_sourced"`. Add geo (`nyc`, `brooklyn`), `mutual_follow` when true, and any role token. Persists.

**`email`** — `null` if unknown. IG rarely exposes it. **Never invent one.**

**`org_ids`** (contacts) — array of `org_` ids this person is affiliated with. If you create that org in the same array, reference its `id` here and the link resolves on import.

**Dual next-action rule (MANDATORY for contacts)** — if you set `next_action` + `next_action_date`, you **must** also add a matching `next_actions[]` entry: `{ "id": "...", "text": "<same text>", "date": "<same date>", "completed": false }`. Otherwise the CRM dashboard won't see the follow-up. Orgs use only `next_action` + `next_action_date` (no `next_actions[]` array).

**Touchpoints** — only `date` and `summary` persist:
```json
{ "date": "2026-06-03", "summary": "[social/inbound] <what happened, who, why it matters>" }
```
- `date` must match `YYYY-MM-DD` or the touchpoint is dropped.
- `summary` is required (min 1 char). Lead with a `[channel/direction]` tag (e.g. `[social/inbound]`) so the old `type`/`direction`/`outcome` context survives as text. Any extra keys (`type`, `direction`, `outcome`, `next_step`) are stripped.

**Do NOT emit** `tier`, `confidence`, `followers`, `bio`, or any other top-level key not listed above — they get stripped. Fold them into the `notes` trailer:
`[IG-sourced YYYY-MM-DD, confidence LOW|MED|HIGH]`

---

## Handling thin / unsure accounts

Many handles on the list show "no visible signal" or "UNSURE — name only." For those:
- If the live profile genuinely shows nothing that fits a type, **leave it out of the JSON** — don't manufacture a record.
- If it fits but barely, set the honest `relationship_types`/`category`, set `confidence LOW` in the notes trailer, and write what you actually saw in `notes`. Don't guess at facts (no invented names, emails, or roles).

---

## What to return

A single JSON array, e.g.:

```json
[
  { "record_type": "organization", "id": "org_floorwork_collective", "...": "..." },
  { "record_type": "individual", "id": "ind_jonathan_puente", "...": "..." }
]
```

Hand that array back to Claude Code. It will run every handle through `check_existing`, **merge** anyone already in the CRM (instead of duplicating), and import the rest.
