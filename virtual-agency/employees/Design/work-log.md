# Web & Graphic Designer — Work Log

> Append-only ledger of small, one-off deliverables (a single graphic, a quick flyer, a slide) that don't merit their own sprint file.
> Planned, multi-task design work belongs in `sprints/`. Per-issue intake from Communications belongs in `briefs/`.
> Newest entries on top.

---

## 2026-07-16 — Sprout Society TV slideshow (in-space screen loop)

**Ask (Max):** Update the HTML shown on the TV at Sprout N Tell, and add more slides advertising the different facets of Sprout Society, ideally as a looping slide show.

**Delivered:** `deliverables/tv-slides/` — **six standalone slide files** (`01-welcome` … `06-hosting`) plus a `README.md`. **Format: 16:9, sized in `vw` units so it scales to any TV (verified at 1920x1080).**

**Shipped as one looping deck first, then split at Max's request** so each slide can be iterated on in isolation and recombined once the content is final. The six files are now the source of truth; the combined deck was deleted rather than kept alongside them, to avoid the mirrored-copy drift this project keeps hitting. Recombine spec is in the README.

**The original was not recoverable.** Searched the repo, git history, other project folders, Downloads, and published artifacts. `sign-in-kiosk/welcome-flyer.html` is the printable QR flyer, not a TV slide. Built fresh per Max's call.

**Slides (in loop order):** Welcome · Founding story · Sprout N Tell · Sprout By Day · Membership · Hosting.

**Design decisions:**
- **QR code on every slide.** Nobody can click a TV, so each slide carries a scannable code to the thing it advertises (donate / sign-in + program / membership / hosting form). QR blocks are pinned to a fixed `19vw` width so the code lands at an identical x on every slide, otherwise a longer caption shifts it and it visibly jumps during the cross-fade.
- **Runs itself.** 12s per slide, 0.9s cross-fade, infinite wrap, progress bar + dot position indicator. Open and press F11. Optional keys: space pauses, arrows step, F toggles fullscreen. Click/tap advances for a touch display.
- **Self-contained.** Logo and all four QR codes are inlined as base64 data URIs. Only external dep is the Lato webfont; offline it falls back to a system sans and everything else still renders.
- Dark (ink) and light (paper) slides alternate to give the loop rhythm.

**Copy source:** `../Communications/foundational-language.md` (mission, founding story, verified stats). Per the Comms/Design handoff, Design did not originate the facts. **No invented numbers:** only the whitelisted 5,000+ served / 50+ programs / $120K to 32 artists. Pricing came from the live `public/sprout-sign-in.html` CONFIG; the next Sprout N Tell date came from the CRM (`list_events`).

**Verified:** all 6 slides screenshotted at 1080p; zero overflow; each QR decoded and confirmed to match its caption's URL; all 4 destination URLs return 200. In deck form: loop wrapped past the last slide back to 0, exactly one slide visible at rest. After the split: all 6 files re-verified standalone (visible, no broken images, no JS errors, no leftover deck chrome).

**Two bugs caught by screenshotting rather than trusting the code** (both from the slide being a `flex-direction:column` container, where children stretch and shrink on the cross axis):
- The logo stretched to 1690px wide against its true 2.12 aspect ratio. Fixed with `align-self:flex-start`.
- The acid rule silently collapsed to **height 0** because it has no content. Fixed with `flex-shrink:0`.
Both are commented in the file. Same family as the `overflow-x:clip` sticky-header fix and the newsletter preview `alignSelf` bug.

**A third bug, caught during the split:** the extractor regex matched a literal `<section class="slide">` sitting inside the deck's own *header comment*, so slide 1's extraction began mid-comment and ran to the first `</section>`. It produced exactly 6 matches by coincidence, so the count assertion passed while slide 1 shipped with comment prose in its body and no `on` class (rendering invisible). Fix: strip HTML comments before extracting, require the opening tag to carry a `dark|light` accent class, and assert each slide is visible and comment-free. **Lesson: don't put a literal slide tag inside an HTML comment in these files**, and a passing count is not a passing parse.

**⚠️ Known limits / open items:**
- **The Sprout N Tell date is hardcoded** (currently Vol. 3, Friday July 24). Needs a one-line edit per volume; marked with a comment in the markup. Vol. 4 is 2026-08-28. Candidate for auto-filling from the CRM later.
- **The Sprout By Day slide's QR points at membership**, since co-working access runs through a day pass. No verified Sprout By Day interest-form URL was on hand and none was invented.
- **Not served over HTTP.** It lives here as a deliverable, not in `public/`, so it has no Vercel URL. Open it from disk. ⚠️ Do NOT rename `public/` to organize marketing files: `public/` is a reserved Next.js folder whose name is not configurable, and renaming it 404s the live kiosk page that the printed event QR flyers point at (confirmed live this session).
- **Accent rotation deviates from the brand rule** (cyan → fuchsia → acid → banana). Colors were picked semantically instead (fuchsia for Sprout N Tell, banana for membership), so slides 2 and 3 are both fuchsia. Flagged for Max, not yet reconciled.

**Next action:** update the Sprout N Tell slide to Vol. 4 (Aug 28) after the July 24 event.

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
