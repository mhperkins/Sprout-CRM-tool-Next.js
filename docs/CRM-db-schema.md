# docs/db-schema.md
# Sprout CRM — Database Schema Reference
# Version: 1.0 | Session: 6

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
| `phone`             | text        | Nullable. Promoted S4; SELECT S8; upsert S7; merge S9. |
| `relationship_status` | text      | Enum: `cold` `warm` `active` `declined` |
| `next_action_date`  | date        | ISO string. Used for overdue queries.  |
| `created_at`        | timestamptz | Set on insert                          |
| `updated_at`        | timestamptz | Set on every upsert                    |

### `data` JSONB Keys (full object blob)
All fields from the SQL columns above are duplicated inside `data` as the
source of truth for the UI merge pattern. Additional JSONB-only fields:

| Key                         | Type             | Notes                                       |
|-----------------------------|------------------|---------------------------------------------|
| `phone`                     | string           | Nullable                                    |
| `relationship_type`         | string           | Enum: `partner` `community_builder` `other` |
| `other_description`         | string           | Free text when `relationship_type` is `other` |
| `website`                   | string           | Nullable                                    |
| `instagram_handle`          | string           | Nullable                                    |
| `notes`                     | string           | Free text                                   |
| `next_action`               | string           | Description of the next action              |
| `touchpoints`               | Touchpoint[]     | See Touchpoint schema below                 |
| `financial_relationship`    | FinancialRel     | See FinancialRel schema below               |
| `createdAt`                 | ISO string       | Maps from SQL `created_at` on merge         |

---

## Table: `sprout_orgs`

### SQL Columns (indexed, queryable)
| Column              | Type        | Notes                                  |
|---------------------|-------------|----------------------------------------|
| `id`                | text PK     | Format: `org_` prefix. e.g. `org_brooklyn_org` |
| `name`              | text        | Promoted for sort/search               |
| `category`          | text        | Enum: `funder` `partner` `vendor` `media` `government` |
| `relationship_status` | text      | Enum: `cold` `warm` `active`  |
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
| `next_action`               | string           | Description of the next action              |
| `touchpoints`               | Touchpoint[]     | See Touchpoint schema below                 |
| `financial_relationship`    | FinancialRel     | See FinancialRel schema below               |
| `createdAt`                 | ISO string       | Maps from SQL `created_at` on merge         |

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
| `tags` | string[] | |
| `notes` | string | |

### Merge Pattern

`mergeEvent(row)` — SQL columns override JSONB blob. Same bridge rule as `mergeContact` / `mergeOrg`.

### Join Strategy

Contact ↔ Event is stored as `contact_ids: string[]` inside the event `data` JSONB. Client-side resolution. No FK constraint. No junction table. Bidirectional sync maintained via contact edit modal events tab.