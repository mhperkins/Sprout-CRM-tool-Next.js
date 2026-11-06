# Events page redesign (plan, 2026-11-06)

**Status:** planned, not started. Wireframe first (Wireframe Protocol), then build in a worktree.

## Why

The client side changed a lot in early November: `/book` asks for dates on a calendar, and each host's portal is a short page of dropdown bars (Your dates, Event details, Links, Our logos, Files, More details). Our side did not change with it. The CRM event page shows 11 tiles on every event (a Floorwork rehearsal rental gets the same Program, Gallery and Checklist tiles as a Sprout N Tell), plus a status strip, a pending banner and a dates row. The Events list carries 5 stat boxes, the hosting-form link, the Booking requests card, filters and the calendar. It reads as bloated.

## What is used today (27 events, checked 2026-11-06)

| Piece | Events using it |
|---|---|
| Host portal | 13 |
| Notes | 17 |
| Outcomes | 7 |
| Checklist | 6 |
| Links | 6 |
| Media | 5 |
| Program (participant form) | 3, all Sprout N Tell nights |
| Communications log | 2 |
| Gallery entries on an event | 0 |
| Guest media uploads | 0 |
| Recap | 0 |

## Max's calls

1. **Match the client portal's dropdown bars.** The CRM event page becomes the same kind of page as the host's portal: native `<details>` bars (the `Fold` pattern in `components/EventPortal.jsx`), in the portal's order, so staff see what the host sees. Not a grid of tiles, not tabs.
2. **Cut Communications.** Remove the tile, its popup and the dashboard/strip "awaiting reply" count. Keep the `comms[]` data on the 2 events that have it (no data deletion); `EventSchema.comms` stays so nothing is stripped on save.

## Recommended structure (to wireframe, not yet approved)

**Event page, top to bottom**
- Header: name, status, every booking date with Waiting / On calendar / Declined, host name, and the action for the stage (Approve onto the calendar / Decline for a request).
- Bars, in portal order:
  1. **Dates** (the client's "Your dates"): every slot, approve/decline waiting ones inline, plus the event's own date/time/repeat.
  2. **Host & details** (portal "Event details" + "More details"): the host's answers, the shared More details box, our notes, portal link (copy/open).
  3. **Links & files** (portal "Links" + "Files"): one list, merging Links, Media and Guest media.
  4. **People**.
  5. Sprout-run events only: **Checklist**, **Program**, **Gallery**.
  6. Past events only: **Outcomes** (headcount, rental fee, etc.).
- Show by event type (`outcomes.hosted_by`: sprout / partner / rental) and stage (pending, upcoming, completed). A rental like Floorwork goes from 11 tiles to about 4 bars.

**Events list**
- One **Needs you** section at the top: the Booking requests card and pending events merged.
- Calendar stays the main view, list second.
- Stat boxes cut to the ones that lead somewhere (Requests, Checklist overdue).
- The hosting-form link becomes a small Share button.

## Open questions for the wireframe

- Are Program and Gallery only ever for Sprout N Tell nights, or do other Sprout events use them? (Asked, not answered.)
- Which bars open by default per stage (likely: Dates on a request, Checklist on upcoming, Outcomes on past)?
- Does the Edit Event page (separate tabbed editor) fold into the bars, or stay as its own screen?
- Lean vs full version of the wireframe (Max chose lean for the first event dashboard).

## Constraints to respect

- `onUpdateEvent` saves the whole event object; keep the stale-tab protections (approval refreshes via `onEventChanged`, server writes are read-modify-write).
- Tile bodies were plain render functions so inline inputs keep focus; the bars must do the same (no nested components that remount).
- Every Approve path goes through `approveEvent` (`lib/bookingDb.js`) so it writes to the Sprout HQ Google Calendar.
- MVP floor: usable at 390px, one obvious primary action, visible feedback, empty states, labeled inputs.
