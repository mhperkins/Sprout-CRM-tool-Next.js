# Sprout Society Virtual Agency — AI Employee System

## Concept

An Agile-native organization of AI agents serving Sprout Society, a Brooklyn nonprofit focused on mental wellness and community connection. Each agent is a specialist contributor on a sprint team. Max functions as Product Owner across the org.

**Core principle:** Agents = system prompt + tools + shared memory. Not Claude Projects. Claude Code is the runtime. This mirrors the Composer's Compass virtual-agency setup.

The shared memory is the live Sprout CRM (Supabase project `ixdnmjchvjzytyhmripc`), reached through the `sprout-crm` MCP server. That data layer is what makes these agents a team rather than isolated chatbots.

---

## Org Structure

```
Sprout Society
  Communications Manager   (drafts newsletters, marketing, email campaigns)
  Outreach Manager         (relationship research, tiering, cultivation paths, first-touch outreach)
  Event Manager            (event planning, prep checklists, run of show, close-out)
  Web & Graphic Designer    (PRIMARY: HTML newsletter design; also social graphics, flyers, slides, web look-and-feel)
  Grant Manager            (research, write, track deadlines)
  CRM Manager              (pipeline review, follow-ups, data hygiene via the sprout-crm MCP)
  Social Media             (post copy, content calendar, platform execution)
```

**Note:** Communications owns outcomes (newsletter sends, email campaigns, audience growth). The Outreach Manager owns the top of the relationship pipeline (discovery → research briefs → tiering → first contact) and hands a warmed relationship to Communications (for a campaign/spotlight) or to the CRM Manager (for ongoing cadence). Outreach lands *clean records at intake*; the CRM Manager keeps the *whole base* healthy. The Event Manager owns event *production* (planning, dated prep checklists, run of show); at close-out it hands the recap to Communications and the attendee data to the CRM Manager, and surfaces new attendees to Outreach. Social Media is a content producer (post copy, calendar, platform-specific execution). The Web & Graphic Designer owns the *visual* layer across surfaces (Communications owns the words, Design owns the picture; they hand off). They are distinct agents. "Full-Stack Developer" is Claude Code itself, not a role.

---

## Agile / PMBOK Framework

PMBOK artifacts are the connective tissue between agents.

### Roles
| Role | Who |
|------|-----|
| Product Owner | Max |
| Specialist Contributors | Agents |
| Shared Memory / State | Supabase + the `sprout-crm` MCP tools |

### Ceremonies
| Ceremony | Agent participation |
|----------|-------------------|
| Sprint planning | Max defines sprint; agents break down tasks, flag risks |
| Standup | Agent reports: done / doing / blocked via structured prompt |
| Review | Agent produces deliverable; Max reviews and approves |
| Retro | Adjustments go into the agent's system prompt |

### PMBOK Artifacts (markdown templates, readable/writable via tools)
- Project brief / scope statement
- Work breakdown structure
- Risk register
- Stakeholder communication plan
- Status report (standup format)

---

## Technical Architecture

### Each Agent Is
1. A system prompt file (`employees/{Role}/system-prompts/{role}-system-prompt_v#.md`)
2. A job description (`employees/{Role}/{role}-jobDescription.md`)
3. A set of MCP tools it's authorized to use
4. An invocation method: CLI, CronCreate schedule, or sub-agent

### Invocation Methods
```bash
# Direct CLI
claude --system-prompt virtual-agency/employees/Communications/system-prompts/communications-manager-system-prompt_v1.md -p "Draft the June monthly roundup."

# Scheduled (CronCreate) — autonomous runs, e.g. monthly newsletter draft

# Sub-agent (mid-session) — the Agent tool spawns the specialist inline
```

### Shared Memory
All agents read/write the same Supabase instance via the `sprout-crm` MCP tools (`assemble_newsletter`, `search_contacts`, `list_events`, `get_relationship_health`, etc.). One source of truth for contacts, orgs, events, and newsletters.

---

## Build Order

### 1. Communications Manager (start here)
**Why:** The newsletter pipeline is already built end to end (template engine, `assemble_newsletter` MCP tool, in-app Newsletter page). The agent has real tools to drive on day one.

Stack in hand:
- `lib/newsletter.js` template engine + `docs/newsletter/` templates
- `sprout-crm` MCP `assemble_newsletter` (CRM auto-fill → bracketed subjective copy)
- `google-workspace` Gmail MCP for staging drafts

### 2. PMBOK scaffolding
Shared artifact templates so agents can hand off to each other and to Max without ambiguity.

### 3. Remaining agents
In rough priority: Web & Graphic Designer (built), Outreach Manager (built), Event Manager (built), Grant Manager, CRM Manager, Social Media.

---

## Key Principles

- **Don't build the org before you know the work.** Use agents manually for a few weeks, then automate the specific friction points.
- **Shared memory first.** The CRM data layer unlocks the team dynamic.
- **System prompts are job descriptions.** Tight, specific, with clear output formats. Vague prompts = vague employees.
- **PMBOK artifacts = communication protocol.** Standardized templates let agents hand off cleanly.
- **Nothing sends without Max's sign-off.** Agents draft and stage. Max approves and sends.

---

## Current State

*(Rewritten each session — snapshot, not a log.)*

**Last session:** 2026-07-14 — Built the fourth employee: the **Event Manager** (owns event planning, dated prep checklists, run of show, and close-out). Mirrors the Outreach/Communications folder pattern. Its first deliverable is the **Sprout N Tell checklist template**, built from the real Show n Tell / Sprout n Tell events and wired into the app as an importable, auto-dated checklist that populates the event calendar.

**What was built:**
- Event Manager agent:
  - `employees/Events/system-prompts/event-manager-system-prompt_v1.md` — system prompt built on the **event lifecycle** (Scope → Plan → Lineup → Prep → Gameday → Close-out): the golden no-fabrication rule (dates, lineup, headcount), the checklist-template asset + the app-import path, the raw-SQL-is-last-resort discipline (no MCP event-write tool), the `sprout-crm` MCP read stack, and scope boundaries vs Communications (recap copy) / Outreach (attendee research) / CRM Manager (hygiene) / Design (flyers/signage).
  - `employees/Events/event-manager-jobDescription.md` — role summary, responsibilities, out-of-scope, working relationships, tools, session protocol.
  - `employees/Events/deliverables/sprout-n-tell-checklist-template.md` — **the first deliverable.** The canonical 23-item prep-and-production checklist with lead-time offsets, source of truth for the app's `EVENT_CHECKLIST_TEMPLATES["Sprout N Tell"]` constant.
  - `employees/Events/work-log.md` — seeded with the 2026-07-14 template + app-feature delivery.
  - Empty `briefs/` + `sprints/` folders.
- App (`components/CRMManager.jsx`): the **Import checklist template** feature in the event Add/Edit → Checklist tab (auto-dates items off the event date; dated items populate the calendar).
- Updated this org doc: roster (added Event Manager), the handoff note (Event Manager → Communications / CRM Manager / Outreach at close-out), build-order status.

**Build order status:**
- Communications Manager: built. First live run done (caption proof, 2026-06-03).
- Web & Graphic Designer: built. No deliverable yet.
- Outreach Manager: built. First brief (July discovery batch) done and filed; records not yet landed in the CRM.
- **Event Manager: built.** First deliverable (Sprout N Tell checklist template) done + wired into the app.
- Grant Manager, CRM Manager, Social Media: not started.

**Invocation:**
- Communications: `claude --system-prompt virtual-agency/employees/Communications/system-prompts/communications-manager-system-prompt_v1.md`
- Design: `claude --system-prompt virtual-agency/employees/Design/system-prompts/design-lead-system-prompt_v1.md`
- Outreach: `claude --system-prompt virtual-agency/employees/Outreach/system-prompts/outreach-manager-system-prompt_v1.md`
- Events: `claude --system-prompt virtual-agency/employees/Events/system-prompts/event-manager-system-prompt_v1.md`
- Or spawn any as a sub-agent via the Agent tool.

**Resume here:**
- ⬜ Run the Event Manager to **import the Sprout N Tell checklist onto Vol. 4** (8/28, `evt_mr0yd2086np9`, currently empty) and adjust the dates for that show.
- ⬜ Run the Outreach Manager to **land the July brief's 3 records** in the CRM: merge Buzzkill NYC into the existing `org_mr3ulu05pxlg` (don't duplicate; recategorize vendor → community_builder/partner, cold → warm), create Dance Support NYC + Sober Supper Club. Then chase Rachel's last name/handle to link her to Buzzkill.
- ⬜ Run the Web & Graphic Designer's first deliverable (HTML newsletter design pass).
- ⬜ Run the Communications Manager's next newsletter.
- ⬜ Build the next agent (Grant Manager or CRM Manager).
- ⬜ Add PMBOK artifact templates.
