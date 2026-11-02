# Sprout CRM: App Streamline and Redesign Plan

Brief for the redesign conversation. Max called this on 2026-11-02 after a read-only audit. Nothing here is built yet. Start with the wireframe protocol for any new screen: Max calls the structure before code.

## Why

- 3,609 of 3,975 contacts came from the 2026-06-09 email import. Only 1 has a logged touchpoint. 2,211 contacts have no name.
- Prospects = 455 contacts: 347 email-grab subscribers (no Instagram), 95 IG outreach accounts added 2026-11-02, 13 researched in June. Max: "unmanageable."
- The current Outreach page shows briefs, sprints, a deliverables log, and a touchpoint log. It does no outreach. `sprout_outreach_docs` has 1 row, last edited 2026-07-07.
- 13 sidebar items. Members appears in three places (Contacts tab, Orgs tab, Members page).
- `components/CRMManager.jsx` is 6,460 of about 18,300 lines.

## Decisions Max has made

- **No contact records get deleted in this redesign.** This covers every row in `sprout_contacts`, including the email import and the 95 IG contacts. Records can be re-labeled, filtered, or shown in a different view, but they stay in the table. Treat `sprout_orgs` the same way.
- **Outreach gets rebuilt to work like the Impact Survey.** "They are very similar functions."
- **The Prospects list can go away** in favor of that Outreach page.
- **The Day Board needs a redesign**, as part of this larger redesign. It is not being cut. Only 4 of 33 tasks are marked done, the last on 2026-10-22, so find out what Max actually uses before redesigning it.
- **Newsletter: remove in-app Send to list, keep Test send, the editor, and Copy HTML.** Campaign Monitor is the send channel. Test send still uses `app/api/send` (Gmail, test mode), so that route stays with the list mode removed.
- **The redesign happens in a separate conversation from the DM sends.**
- **All Instagram DMs come from @sproutsocietyorg**, signed Max, Community Manager.

## Max's calls in the redesign conversation (2026-11-02)

- **Day Board:** not in use. It becomes a checklist of activities plus upcoming events that match the Sprout Google calendar exactly. Max's personal calendar is hidden by default with a toggle.
- **Emails:** the daily recap and weekly summary go. New: a Monday morning overview and 24-hour reminders, covering everything on the Sprout calendar, not just CRM events.
- **People:** one page with tabs.
- **Outreach:** lean, three tabs (Send, Results, Messages). "Follows us?" is a saved Yes/No. No first-name slot. Survey DMs stay on Impact Survey because those people are already participants. Add to CRM is the only move into Contacts.
- **History:** every Outreach button writes a dated entry to the person's comm log (`touchpoints`).
- **Arts in Bushwick and Big Vision NYC:** stay on Organizations. Max is not reaching out to orgs yet; if that starts, it goes through a person, in normal outreach.
- **Corrections to this brief (live data, 2026-11-02):** Contacts opens on 259, not 366: 232 community, 26 donors, and Jess McAvoy, who carries the import tag. Prospect orgs are 38 and active orgs 8, not 8 prospect orgs.

- **Final calls on the wireframes:** both approved. The 35 org accounts leave Outreach, so it holds 110 people. The 5 orgs already messaged keep that history. The 24-hour reminder is one morning email the day before, listing all of the next day's events.

## After this redesign

- **Event spaces:** designate a space on each event, Main or Back. Queer Social uses Main and 12 Step uses Back, so overlapping events like Friday 11/13 are fine. Max: not important right now.

## Recommendations (Max has not yet ruled on these individually)

### 1. Outreach page, modeled on `components/SurveyView.jsx`

- **Who to reach:** one list with Instagram, name, type, batch, status (To message, Messaged, Replied, Interested, Added).
- **Send:** per-person Copy message and Mark sent.
- **Messages:** editable templates. Reuse `app/api/outreach-rewrite` for AI rewrites.
- **Results:** counts and replies by batch.
- **Rule for new accounts:** a person added to Outreach after this build becomes a CRM contact only when they respond, the same pattern as Showcase Accept.
- Replaces the **DM Plan** tab of the [IG triage sheet](https://docs.google.com/spreadsheets/d/1smxB08OiOqqqr_sDAlZY7tt6wCKKxcbf11SvHFigeKY/edit). Migrate its status and Sent values.
- The 122 prospects added 2026-11-02 stay in the CRM. They carry the tag `ig_outreach_2026_11` (95 contacts, 27 orgs), so Outreach can link to those records and the main Contacts view can leave them out.

### 2. Split Contacts, remove the Prospects bucket

- **Contacts:** opens on people we have actually dealt with (about 366 today).
- **Mailing list:** a separate view for the 3,609 imported contacts, tag `email_list_import_2026_06_09`. Delete nothing. Donor gift history stays.
- The 347 email-grab prospects show under Mailing list. The 13 researched prospects and 8 prospect orgs stay in the CRM and link into Outreach.
- `segment` is enforced by Zod, the UI constants, `app/api/send`, and the CSV export. Change them together.
- High tier, contact data surface: take a backup first.

### 3. Delete dead code (about 900 lines)

- `DashboardView` in `CRMManager.jsx` (165 lines, unused).
- Old `OutreachView`, `EditableDoc`, `TableBlock`, `lib/md.js`, `app/api/outreach`, and `sprout_outreach_docs`, once #1 ships. The `.md` files stay in `virtual-agency/`.
- `PostSchema` and `showContactsModal`.

### 4. Sidebar: 13 items to 8

Day Board · People (Contacts, Organizations, Members, Mailing list) · Events · Inbox (Showcase applications, Get Involved, /submit list, gallery) · Outreach · Impact (Surveys, Grant Metrics) · Newsletter · Settings (Import JSON moves here).

### 5. Forms and event page

- Fold `/submit` into `/showcase`. Keep `/submit` as a redirect: a tracked QR points there.
- Remove Event Communications (2 entries across 22 events, 172 lines).
- Combine the event side panel and full event page.

## Keep

Event portal, program form, Impact Survey, Grant Metrics, event media. Get Involved, the gallery form, and coming-soon have no submissions yet, but they are new or barely promoted.

## Suggested order

1. Delete the dead code that nothing depends on (`DashboardView`, `PostSchema`, `showContactsModal`) and the newsletter Send to list.
2. Wireframe Outreach, then build it.
3. Split Contacts and remove Prospects.
4. Redesign the Day Board and merge the sidebar. Wireframe first.

## Open questions

- What does Max use the Day Board for: calendar, tasks, or hours?
- Should People be one page with tabs, or stay separate pages?
- Does the "Follows us?" check belong on the Outreach page?
