# docs/db-schema.md
# Sprout CRM — Database Schema Reference# Version: 1.1 | Session: 8
# Version: 1.1 | Session: 8

This file is the authoritative mapping of SQL columns vs. `data` JSONB keys for
all Supabase tables. Claude reads this to know where each field lives.
The rule: if a field is a SQL column, it is indexed/queryable. Everything else
lives in the `data` JSONB blob and is accessed via the merge pattern.

---

## Table: `sprout_contacts`

### SQL Columns (indexed, queryable)
| Column              | Type        | Notes                                  |
|---------------------|-------------|----------------------------------------|
| `id`                | text PK     | Format: `ind_` prefix. e.g. `ind_jane_smith` |
| `org_id`            | text        | FK → `sprout_orgs.id`. Nullable.       |
| `record_type`       | text        | Always `"individual"`                  |
| `first_name`        | text        | Promoted for sort/search               |
| `last_name`         | text        | Promoted for sort/search               |
| `email`             | text        | Nullable                               |
| `relationship_status` | text      | Enum: `cold` `cool` `warm` `active`    |
| `next_action_date`  | date        | ISO string. Used for overdue queries.  |
| `created_at`        | timestamptz | Set on insert                          |
| `updated_at`        | timestamptz | Set on every upsert                    |

### `data` JSONB Keys (full object blob)
All fields from the SQL columns above are duplicated inside `data` as the
source of truth for the UI merge pattern. Additional JSONB-only fields:

| Key                         | Type             | Notes                                                           |
|-----------------------------|------------------|-----------------------------------------------------------------|
| `phone`                     | string           | Nullable                                                        |
| `relationship_types`        | string[]         | Multi-select. Enum: `music` `art` `event_host` `partner` `community_builder` `attendee` `showcase` `sprout_society` `other`. Legacy single-string coerced to array on read. |
| `other_description`         | string           | Free text when `relationship_types` includes `other`            |
| `website`                   | string           | Nullable                                                        |
| `instagram_handle`          | string           | Nullable                                                        |
| `notes`                     | string           | Free text                                                       |
| `next_action`               | string           | Legacy single-action field. Still written by touchpoint log.    |
| `next_actions`              | NextAction[]     | Multi-action queue. See NextAction schema below.                |
| `next_actions_log`          | object[]         | Archive of completed/superseded actions. Shape: `{ text, date, loggedAt, completed }`. Passthrough — not in Zod schema. v2: consolidate into `next_actions[]`. |
| `touchpoints`               | Touchpoint[]     | See Touchpoint schema below.                                    |
| `financial_relationship`    | FinancialRel     | See FinancialRel schema below.                                  |
| `createdAt`                 | ISO string       | Maps from SQL `created_at` on merge.                            |

---

## Table: `sprout_orgs`

### SQL Columns (indexed, queryable)
| Column              | Type        | Notes                                  |
|---------------------|-------------|----------------------------------------|
| `id`                | text PK     | Format: `org_` prefix. e.g. `org_brooklyn_org` |
| `name`              | text        | Promoted for sort/search               |
| `category`          | text        | Enum: `funder` `partner` `vendor` `media` `government` |
| `relationship_status` | text      | Enum: `cold` `cool` `warm` `active`  |
| `next_action_date`  | date        | ISO string. Used for overdue queries.  |
| `created_at`        | timestamptz | Set on insert                          |
| `updated_at`        | timestamptz | Set on every upsert                    |

### `data` JSONB Keys (full object blob)
| Key                         | Type             | Notes                                       |
|-----------------------------|------------------|---------------------------------------------|
| `record_type`               | string           | Always `"organization"`                     |
| `website`                   | string           | Nullable                                    |
| `primary_contact_id`        | string           | `ind_` prefixed ID. Nullable.               |
| `phone`                     | string           | Nullable                                    |
| `email`                     | string           | Nullable                                    |
| `instagram_handle`          | string           | Nullable                                    |
| `notes`                     | string           | Free text                                   |
| `next_action`               | string           | Legacy single-action field. Still written by touchpoint log. |
| `next_action_date`          | string           | Legacy date field. Written alongside `next_action`.          |
| `next_actions`              | NextAction[]     | Multi-action queue. Populated via touchpoint dual-write.     |
| `next_actions_log`          | object[]         | Archive of completed/superseded actions. Same pattern as contacts. Passthrough — not in Zod schema. |
| `touchpoints`               | Touchpoint[]     | See Touchpoint schema below.                |
| `financial_relationship`    | FinancialRel     | See FinancialRel schema below.              |
| `createdAt`                 | ISO string       | Maps from SQL `created_at` on merge.        |

---

## Table: `sprout_posts`

> ⚠️ Status: **Table pending creation.** Reads are currently stubbed with
> `Promise.resolve({ data: [], error: null })` in `loadAll()`.
> Write path (`savePosts`) is wired but will no-op until table exists.

### SQL Columns (planned)
| Column       | Type        | Notes              |
|--------------|-------------|--------------------|
| `id`         | text PK     | No prefix enforced |
| `updated_at` | timestamptz |                    |
| `data`       | jsonb       | Full post object   |

### `data` JSONB Keys (planned)
| Key              | Type   | Notes                                        |
|------------------|--------|----------------------------------------------|
| `platform`       | string | Enum: `ig` `nl` (newsletter)                 |
| `status`         | string | Enum: `draft` `scheduled` `published` `sent` |
| `scheduled_date` | string | ISO date string                              |
| `content`        | string | Post body text                               |
| `subject`        | string | Newsletter subject line. Nullable.           |

---

## Table: `sprout_newsletters`

> ⚠️ Status: **Table must be created in Supabase before saves persist.** The
> read path (`fetchNewsletters`) returns `[]` gracefully if the table is missing,
> so the Newsletter view loads either way; saves no-op until the table exists.
> Run the DDL below in the Supabase SQL editor.

```sql
create table if not exists sprout_newsletters (
  id         text primary key,
  subject    text,
  status     text,
  send_date  date,
  data       jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### SQL Columns (queryable / indexed)
| Column       | Type        | Notes                              |
|--------------|-------------|------------------------------------|
| `id`         | text PK     | Prefix `nl_` (e.g. `nl_june_2026_roundup`) |
| `subject`    | text        | Subject line                       |
| `status`     | text        | Enum: `draft` `scheduled` `sent`   |
| `send_date`  | date        | Scheduled/sent date. Nullable.     |
| `created_at` | timestamptz |                                    |
| `updated_at` | timestamptz |                                    |
| `data`       | jsonb       | Full newsletter object             |

### `data` JSONB Keys
| Key                    | Type   | Notes                                            |
|------------------------|--------|--------------------------------------------------|
| `template`             | string | Enum: `monthly-roundup` `quick-hit`              |
| `month`                | string | Display label, e.g. `June 2026`                  |
| `field_values`         | object | `{ "[placeholder]": "user copy" }` — fill-ins    |
| `spotlight_contact_id` | string | `ind_` id for the roundup spotlight. Nullable.   |
| `recap_limit`          | number | Max auto-filled recap blocks (default 4)         |
| `upcoming_limit`       | number | Max auto-filled upcoming-event blocks (default 4)|
| `html`                 | string | Rendered HTML snapshot at last save              |

### Merge Pattern
Same bridge rule as the other tables: SQL columns (`subject`, `status`,
`send_date`) override the JSONB blob on read; on write the full object lands in
`data` with those three promoted. Validated by `NewsletterSchema` in
[lib/schemas.js](../lib/schemas.js). The template engine and fill logic live in
[lib/newsletter.js](../lib/newsletter.js), shared by the in-app Newsletter view
(and available to the MCP `assemble_newsletter` tool).

---

## Table: `sprout_profile`

### SQL Columns
| Column       | Type        | Notes                              |
|--------------|-------------|------------------------------------|
| `id`         | text PK     | Always the string `"profile"`      |
| `data`       | jsonb       | Full profile object (see below)    |
| `updated_at` | timestamptz |                                    |

### `data` JSONB Keys
| Key                   | Notes                                      |
|-----------------------|--------------------------------------------|
| `legalName`           | e.g. `"Sprout Society Inc."`               |
| `ein`                 | e.g. `"83-1298420"`                        |
| `address`             | Full mailing address                       |
| `website`             | e.g. `"sproutsociety.org"`                 |
| `founded`             | Year string                                |
| `annualBudget`        |                                            |
| `numStaff`            |                                            |
| `numVolunteers`       |                                            |
| `mission`             | Mission statement                          |
| `programs`            | Program descriptions                       |
| `population`          | Population served                          |
| `serviceArea`         | e.g. `"Brooklyn, NY / New York City"`      |
| `igHandle`            | e.g. `"@sproutsocietyorg"`                 |
| `igUrl`               |                                            |
| `newsletterPlatform`  |                                            |
| `newsletterAudience`  |                                            |
| `contactName`         | Primary staff contact                      |
| `contactTitle`        |                                            |
| `contactEmail`        |                                            |
| `contactPhone`        |                                            |

---

## Shared Sub-Schemas

### Touchpoint
```json
{
  "date":             "2026-04-15",
  "summary":          "Sent intro email re: BKO grant",
  "next_action":      "Follow up in two weeks",
  "next_action_date": "2026-05-01"
}
```
> Lives inside `data.touchpoints[]` on both contacts and orgs.
> Never promoted to a SQL column — not queried independently.

### FinancialRel
```json
{
  "has_given":    false,
  "total_given":  0,
  "grant_history": []
}
```
> Lives inside `data.financial_relationship` on both contacts and orgs.

### NextAction
```json
{
  "id":        "uid-generated string",
  "text":      "Send follow-up email",
  "date":      "2026-05-15",
  "completed": false
}
```
> Lives inside `data.next_actions[]` on contacts and events, and `data.checklist[]` on events.
> `date` is nullable. `completed: true` items are greyed out, visible, and uncheckkable in the UI.
> The earliest active (completed: false) `date` value is promoted to the SQL `next_action_date` column on save.

### Link (event only)
```json
{
  "id":    "uid-generated string",
  "label": "RSVP Form",
  "url":   "https://example.com/rsvp"
}
```
> Lives inside `data.links[]` on events only. Client-rendered. No FK.

---

## Merge Pattern (The Bridge Rule)

On **read**, SQL columns override the JSONB blob so the UI always gets fresh
indexed values:

```js
const mergeContact = (row) => ({
  ...row.data,         // JSONB blob as base
  id:                  row.id,
  org_id:              row.org_id,
  record_type:         row.record_type,
  first_name:          row.first_name,
  last_name:           row.last_name,
  email:               row.email,
  relationship_status: row.relationship_status,
  next_action_date:    row.next_action_date,
  createdAt:           row.created_at,
});
```

On **write**, the full UI object is stored in `data`, and promoted fields are
extracted into their SQL columns in the same upsert row.

---

## ID Format Rules
- Contacts: `ind_` prefix + snake_case descriptor. e.g. `ind_donna_lennon`
- Orgs: `org_` prefix + snake_case descriptor. e.g. `org_brooklyn_org`
- Profile: hardcoded string `"profile"`
- Posts: no prefix (pending table design)
- **Never use raw UUIDs.**

--- 

## `sprout_events`

### SQL Columns (queryable / indexed)

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Prefix: `evt_` — e.g. `evt_brooklyn_gala_2026` |
| `name` | text | Promoted for sort/search |
| `event_date` | date | ISO string. Queryable for sorting. |
| `status` | text | Enum: `upcoming` `completed` `cancelled` |
| `created_at` | timestamptz | Set on insert |
| `updated_at` | timestamptz | Set on every upsert |
| `data` | jsonb | Full event blob |

### `data` JSONB Keys

| Key | Type | Notes |
|---|---|---|
| `name` | string | Duplicated from SQL column |
| `event_date` | string | Duplicated from SQL column |
| `status` | string | Duplicated from SQL column |
| `location` | string | Venue / address |
| `description` | string | Free text |
| `contact_ids` | string[] | Array of `ind_` IDs — client-side join, no FK |
| `confirmed_ids` | string[] | Subset of `contact_ids`. Confirmed RSVPs. No FK. |
| `tags` | string[] | |
| `links` | Link[] | See Link schema below |
| `checklist` | NextAction[] | Pre-event task checklist. See NextAction schema below |
| `next_actions` | NextAction[] | Post-event or general action queue |
| `notes` | string | |

### Merge Pattern

`mergeEvent(row)` — SQL columns override JSONB blob. Same bridge rule as `mergeContact` / `mergeOrg`.

### Join Strategy

Contact ↔ Event is stored as `contact_ids: string[]` inside the event `data` JSONB. Client-side resolution. No FK constraint. No junction table. Bidirectional sync maintained via contact edit modal events tab.