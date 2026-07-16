# Sprout Society TV Slides

In-space screen collateral: the slides that loop on the TV at events.

**These six files are the source of truth.** Iterate on them individually. They get
recombined into one looping deck once the content is final.

| File | Slide | Accent | QR points at |
|------|-------|--------|--------------|
| `01-welcome.html` | Welcome | acid | (none, logo slide) |
| `02-story.html` | Founding story + impact stats | fuchsia | givebutter.com/sproutspacedonors |
| `03-sprout-n-tell.html` | Sprout N Tell | fuchsia | the sign-in / program page |
| `04-sprout-by-day.html` | Co-working | cyan | givebutter.com/sproutmembership |
| `05-membership.html` | Membership + pricing | banana | givebutter.com/sproutmembership |
| `06-hosting.html` | Hosting the space | cyan | the hosting inquiry form |

## Previewing

`_preview.html` is a contact sheet: all six slides live in iframes at a true 1920x1080,
scaled down, so what you see is what the TV shows. Click a tile to open that slide full
size, then press F11 for fullscreen. Edit a slide and refresh to see the change.

⚠️ **These files live on the Windows box.** Max works from a Mac terminal over SSH, so
opening the file path directly does not work. Serve the folder and reach it over the
network instead:

```bash
# on the Windows box, from this folder
python -m http.server 4000 --bind 0.0.0.0
```

Then from the Mac, either:

- **Same wifi (simplest):** open `http://192.168.50.65:4000/_preview.html`.
  Windows Firewall already has an inbound Allow rule for Python on the Public profile,
  which is the active profile, so this works without touching firewall settings.
- **SSH tunnel (works from anywhere):** in a second Mac terminal, run
  `ssh -N -L 4000:localhost:4000 maxwe@192.168.50.65`, then open
  `http://localhost:4000/_preview.html` on the Mac.

The Windows LAN IP can change on reconnect. Re-check with `ipconfig` if it stops resolving.
Keep to one server instance at a time (see the single-instance protocol in memory).

Each slide is designed at 16:9 and sized in `vw` units, so it scales to any screen width
(verified at 1920x1080).

## What's inside

Each file is fully self-contained: the logo and its QR code are inlined as base64. The
only network dependency is the Lato webfont, which falls back to a system sans offline.
Each file carries a copy of the same `<style>` block, so a CSS change made for the whole
set has to be applied to all six (or just tell Claude Code to do it).

## Recombining them

Mechanical, so keep the structure intact: **don't rename classes, and don't put a literal
slide `<section ...>` tag inside an HTML comment** (a comment containing one silently
poisoned the original split). The recombine lifts one `<style>` block plus each file's
`<section class="slide ...">`, drops the `on` class, and adds back the loop chrome:

- 12s per slide, 0.9s cross-fade, infinite wrap
- progress bar + dot position indicator in the footer
- space pauses, arrows step, F toggles fullscreen, click/tap advances

## Copy + facts

Copy comes from `../../../Communications/foundational-language.md` (mission, founding
story, verified stats). Per the Comms/Design handoff, Design lays out the words but does
not originate the facts. **Only the whitelisted numbers** (5,000+ served, 50+ programs,
$120K to 32 artists) may appear. Pricing comes from `public/sprout-sign-in.html`; event
dates come from the CRM (`sprout-crm` MCP `list_events`).

## Open items

- **The Sprout N Tell date is hardcoded** in `03-sprout-n-tell.html` (currently Vol. 3,
  Friday July 24). One-line edit per volume, marked with a comment. Vol. 4 is 2026-08-28.
- **`04-sprout-by-day.html`'s QR points at membership**, since co-working runs through a
  day pass. Swap it if a Sprout By Day interest-form URL turns up.
- **Accent rotation deviates from the brand rule** (cyan -> fuchsia -> acid -> banana).
  Colors were picked semantically instead, so 02 and 03 are both fuchsia. Unreconciled.
- **Not served over HTTP.** Open from disk. Do NOT rename `public/` to organize marketing
  files: it is a reserved Next.js folder whose name is not configurable, and renaming it
  404s the live kiosk page that the printed event QR flyers point at.
