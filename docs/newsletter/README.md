# Sprout Society Newsletter

Low-effort, regular sends. The goal is brand visibility, not a magnum opus. Fill the brackets, send, done.

## Templates

| File | When to use |
|------|-------------|
| `01-monthly-roundup.html` | The main monthly send. Recaps + upcoming events + membership CTA + member spotlight. |
| `02-quick-hit.html` | A fast between-issues send. One recap, one upcoming event, one CTA. ~60 seconds to fill. |
| `event-recap-template.md` | Fill-in form for capturing each event's recap blurb. |
| `spotlight-template.md` | Fill-in form for capturing a member spotlight blurb. |

The two `.html` files are 600px, table-based, inline-styled HTML that render in Gmail, Apple Mail, Outlook, and Mailchimp.

## Recommended workflow (Mailchimp, free tier)

Free up to 500 contacts, gives you a hosted unsubscribe link (legally required for bulk email), and open tracking.

1. **One-time setup:** Mailchimp → Templates → *Create* → *Code your own* → paste `01-monthly-roundup.html`. Save as "Sprout Monthly". Repeat for the quick-hit. The `*|UNSUB|*` and `*|LIST:ADDRESS|*` tokens are Mailchimp merge tags — they auto-fill on send. Leave them.
2. **Each issue:** Campaigns → *Replicate* last month's → swap the bracketed text → *Send*. No building from scratch.

### Gmail fallback (no signup)

For a one-off, paste the rendered HTML into a Gmail draft (the Gmail MCP `create_draft` tool can do this) and BCC the list. Caveats: no unsubscribe link, no tracking, and Gmail caps at ~500 recipients/day. Fine under 100, but Mailchimp is the better home.

## Filling it in

- Replace everything in `[BRACKETS]`.
- Each recap, upcoming event, and spotlight is a self-contained block marked with HTML comments (`<!-- RECAP BLOCK -->`). Copy a block to add one, delete it to remove one.
- Section header accent colors rotate through the brand palette on purpose: cyan `#73C4D6`, fuchsia `#E10098`, acid `#C6C902`, banana `#FAD100`. Keep the rotation for visual rhythm.
- The spotlight photo is optional — delete that `<td>` if you don't have one.

## Pulling content from the CRM

You already track events and contacts. To draft an issue fast:

- **Recaps:** recent `sprout_events` with `status = completed` → name + a line each.
- **Upcoming:** `sprout_events` with future `event_date`.
- **Spotlight:** pick an engaged contact (e.g. Pat). The MCP `search_contacts` tool can surface candidates by relationship status.

A future enhancement (not built): a CRM button that auto-assembles a draft from this data. For now the templates are pure fill-in by design.

## Brand palette

| Color | Hex | Use |
|-------|-----|-----|
| Black | `#030000` | Header/footer bars, primary text |
| Off-white | `#F7F7F6` | Page background |
| Acid green | `#C6C902` | Logo text on dark, accents |
| Fuchsia | `#E10098` | Membership CTA, accents |
| Cyan | `#73C4D6` | Accents, links on dark |
| Banana | `#FAD100` / `#FEF4C1` | Spotlight panel |
