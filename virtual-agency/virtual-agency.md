# Sprout Society Virtual Agency — AI Employee System

## Concept

An Agile-native organization of AI agents serving Sprout Society, a Brooklyn nonprofit focused on mental wellness and community connection. Each agent is a specialist contributor on a sprint team. Max functions as Product Owner across the org.

**Core principle:** Agents = system prompt + tools + shared memory. Not Claude Projects. Claude Code is the runtime. This mirrors the Composer's Compass virtual-agency setup.

The shared memory is the live Sprout CRM (Supabase project `ixdnmjchvjzytyhmripc`), reached through the `sprout-crm` MCP server. That data layer is what makes these agents a team rather than isolated chatbots.

---

## Org Structure

```
Sprout Society
  Communications Manager   (drafts newsletters, marketing, outreach copy)
  Web & Graphic Designer    (PRIMARY: HTML newsletter design; also social graphics, flyers, slides, web look-and-feel)
  Grant Manager            (research, write, track deadlines)
  CRM Manager              (pipeline review, follow-ups, data hygiene via the sprout-crm MCP)
  Social Media             (post copy, content calendar, platform execution)
```

**Note:** Communications owns outcomes (newsletter sends, email campaigns, audience growth). Social Media is a content producer (post copy, calendar, platform-specific execution). The Web & Graphic Designer owns the *visual* layer across surfaces (Communications owns the words, Design owns the picture; they hand off). They are distinct agents. "Full-Stack Developer" is Claude Code itself, not a role.

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
In rough priority: Web & Graphic Designer, Grant Manager, CRM Manager, Social Media.

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

**Last session:** 2026-06-03 — Built the second employee: the Web & Graphic Designer (the visual counterpart to Communications). Mirrors the Communications folder pattern.

**What was built:**
- Web & Graphic Designer agent:
  - `employees/Design/system-prompts/design-lead-system-prompt_v1.md` — system prompt, brand rules (palette + Lato + accent rotation), design stack, the known Canva pixel-exact-vs-editable limit, standard formats, design protocol.
  - `employees/Design/design-lead-jobDescription.md` — role description, responsibilities, scope boundaries vs Communications/Social, tools.
  - `employees/Design/work-log.md` + empty `sprints/` and `briefs/` folders.
- Updated this org doc: roster, build-order, and the Communications↔Design handoff note (Communications owns the words, Design owns the picture).

**Build order status:**
- Communications Manager: built. First live run done (caption proof, 2026-06-03).
- Web & Graphic Designer: built (system prompt + job description). No deliverable yet.
- Grant Manager, CRM Manager, Social Media: not started.

**Invocation:**
- Communications: `claude --system-prompt virtual-agency/employees/Communications/system-prompts/communications-manager-system-prompt_v1.md`
- Design: `claude --system-prompt virtual-agency/employees/Design/system-prompts/design-lead-system-prompt_v1.md`
- Or spawn either as a sub-agent via the Agent tool.

**Resume here:**
- ⬜ Run the Web & Graphic Designer's first deliverable: an HTML newsletter design pass (its primary job) — revise `01-monthly-roundup.html` + the `lib/newsletter.js` engine string for email-client safety and the new logo header, tested via `assemble_newsletter`.
- ⬜ Run the Communications Manager's first newsletter (June roundup brief is pre-filled).
- ⬜ Build the next agent (Grant Manager or CRM Manager).
- ⬜ Add PMBOK artifact templates.
