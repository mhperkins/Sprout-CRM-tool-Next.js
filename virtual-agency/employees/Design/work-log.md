# Web & Graphic Designer — Work Log

> Append-only ledger of small, one-off deliverables (a single graphic, a quick flyer, a slide) that don't merit their own sprint file.
> Planned, multi-task design work belongs in `sprints/`. Per-issue intake from Communications belongs in `briefs/`.
> Newest entries on top.

---

## 2026-06-03 — HTML newsletter redesign (compact monthly roundup), first pass

**Ask (Max):** Design the best HTML newsletter from the template's content model (don't copy the existing file). One hard rule: fit the info so the reader doesn't scroll a long way to get to it.

**Delivered:** `docs/newsletter/monthly-roundup-compact.html` — a standalone, email-safe redesign proposal of the monthly roundup.

**Design decisions (to minimize scroll):**
- **One-row masthead:** logo + issue label share a single black bar instead of a tall hero. No big banner image eating the first screen.
- **Recaps as 4 tight one-liner rows** with a 4px rotating accent bar (cyan → fuchsia → acid → banana). Name + date inline on one line, recap on the next. Thin dividers, ~8px padding.
- **"What's Coming" as a 2-up grid** (two event cards per row) to halve vertical space vs a stacked list.
- **CTA as a single fuchsia band** with the ask and a bulletproof black/banana button side by side, not a full section.
- **Spotlight as one compact accented card.** Footer holds org line + links + unsubscribe.
- Net: the whole roundup lands in roughly 2 phone screens; recaps and the next event are above or near the first fold.

**Email-safety applied:** table layout (no flexbox/grid), all styles inline, ~600px container, Lato-first web-safe stack (`'Lato',Helvetica,Arial,sans-serif`), solid `bgcolor` color blocks, bulletproof table-cell button, hidden preheader, `alt` + explicit width on the logo.

**Revision 2 (same session) — restructure + height target.** Max set the order: Featured May Event as a **top photo block** (Sprout n Tell) with a **"See more events" button** that jumps (in-page `#events` anchor) to a combined Events section at the bottom; then **Coworking** (promo, not an event: permanent Tue/Thu hours + a Thursday Happy Hour), then **Membership**, then **Community Spotlight**, then the **Events section** (Upcoming + Past). Earlier he asked to push the bottom to ~7in on a phone (hit 6.9in on the compact version); the restructured version with the photo + bottom events list now runs ~8.0in (1715px @ 600), with the featured event + jump button serving the "get to it fast" goal. Also removed the black top trim (logo is dark-on-transparent, reads on white) and added an acid rule under the masthead.

⚠️ **In-email anchor caveat:** the "See more events" `#events` jump works in a browser / hosted "view in browser" version. Gmail and Outlook strip `id` anchors, so in the email itself the button may not scroll. For the email, either accept it or point the button at the hosted web URL.

**Open / handoff:**
- `sprout-logo.png` AND the featured photo (`sprout-n-tell.jpg`) must become absolute hosted `https://` URLs before any send (local paths won't load in email). Browser preview uses the relative path / colored fallback.
- Copy in `[BRACKETS]` is Communications' to fill; event names/dates come from `assemble_newsletter`.
- On Max's approval, port this structure into the `lib/newsletter.js` engine string (that is what ships) and keep the `.html` reference in sync. Did NOT touch the engine yet.
- Not yet tested against live CRM content via `assemble_newsletter` (it renders the old structure); do that during the engine port.
