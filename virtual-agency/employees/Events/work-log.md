# Event Manager — Work Log

> Append-only ledger of deliverables: event plans, checklist templates, run-of-shows, and close-outs.
> Reusable templates live in `deliverables/`. Planned, multi-event work belongs in `sprints/`.
> Newest entries on top.

---

## 2026-07-14 — First deliverable: the Sprout N Tell checklist template

**Ask (Max):** Build a reusable event checklist template from the past Sprout N Tell / Show n Tell events, wired into the app so a new event can import it and have it populate the calendar.

**Delivered:** `deliverables/sprout-n-tell-checklist-template.md` — the canonical 23-item prep-and-production checklist with lead-time offsets, built from the real checklists across Show n Tell (5/19), Sprout n Tell (6/26), and Vol. 3 (7/24).

**Also shipped (app):** the **Import checklist template** feature in the event Add/Edit → Checklist tab (`components/CRMManager.jsx`). Set the event date, click Import, and all 23 items land dated off the event date; the dated items then populate the event's calendar. Re-import skips items already on the list.

**Excluded from the template on Max's call:** Outdoor Smoke Ash Tray, Garbage cans, Send out zoom link.

**Sync rule:** the `deliverables/` template is the source of truth; the app's `EVENT_CHECKLIST_TEMPLATES["Sprout N Tell"]` constant mirrors it. Change one, change the other.

**Recommended next action:** Import the template onto Sprout N Tell Vol. 4 (8/28, `evt_mr0yd2086np9`, currently empty) and adjust dates for that show.
