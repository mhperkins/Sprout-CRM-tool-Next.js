# Instagram Outreach Protocol

How Sprout runs Instagram DM outreach from @sproutsocietyorg. Read this first in any conversation that continues the outreach. Last updated 2026-11-19.

## The rules

- **Every DM goes from @sproutsocietyorg**, signed "Max / Community Manager". Confirm the logged-in account first: the `ds_user_id` cookie must be `8091488399`.
- **Only message accounts that follow us.** Org or person, either is fine.
- **Show Max each batch before sending.** He cuts people by name. Send only after he says go.
- **About 15 cold DMs a day.** More than that risks Instagram flagging the account. Follow-ups to people who already responded do not count toward this.
- **Never send the cold intro to someone we already know**: past artists or vendors, people in the CRM as attendees, anyone with an existing DM thread, or a second account of someone already messaged. Those go on the sheet as "Not sending" with a note.
- **People on hold until Max decides:** Max Sibner (@adventureskept, past artist, stays off outreach), Cenny Ray (@cennyray, Max reaches out personally; CRM next action 11/16), @robstanleytunes, Lucas James McCain (@foulmistress), and every row marked HELD on the sheet.
- No em dashes in any message. Use they/them in any CRM note.

## Where things live

- **DM Plan tab** of the triage sheet: https://docs.google.com/spreadsheets/d/1smxB08OiOqqqr_sDAlZY7tt6wCKKxcbf11SvHFigeKY/edit (read and write it as hello@sproutsociety.org). Columns: A Batch, B Label, C Instagram, D Name, E Type, F Follows us?, G Survey link, H Note, I Skip (X), J Sent (date).
- **Message templates:** `sprout_outreach_messages` table (Outreach page in the CRM). The cold intro is row `omsg_first_hello`.
- **CRM:** contacts and orgs from earlier scrapes carry the tag `ig_outreach_2026_11`.

## The messages

**Cold intro** (new follow-backs, from Batch 6 on):

> Hi! Thanks for following Sprout Society. We're a nonprofit community space in Bushwick where artists, musicians, and neighbors come together through shows, workshops, and our Sprout N Tell music and art showcase.
>
> We'd love to learn more about what you do. Would you be up for a quick 20-minute video chat sometime in the next couple of weeks?
>
> Max
> Community Manager

**Follow-up to someone who liked an earlier outreach DM:**

> Hi again! Thanks for the love on our last message. If you're interested we'd really like to get to know you and learn more about what you do. Would you be up for a quick 20-minute video chat sometime in the next couple of weeks?
>
> Max
> Community Manager

**Follow-up to someone who wrote back** (swap in their first name):

> Hi [Name]! Thanks for writing back. We'd really like to get to know you and learn more about what you do. Would you be up for a quick 20-minute video chat sometime in the next couple of weeks?
>
> Max
> Community Manager

Batches 1 to 5 got an older, longer message with the /get-involved link and the Discord invite. Video chats are scheduled in the DMs (no booking link).

## Status as of 2026-11-19

| Batch | State |
|---|---|
| Survey 1, 2 | Sent 11/3 |
| Outreach 1 to 5 | Sent 11/2 to 11/9 (old message). Holds in 3 and 4 need Max's call: SPARŚA, Asylum Arts, ARTYARDBKLYN, ivyhousestudio, Daria Tennikova, Lisa Sniderman (Aoede), and Ashley Dreyfus in 5. |
| Responders | 7 got the video-chat follow-up on 11/19: Alexis Viele (replied), and Rsri, Fabian Guhl, Lauren Wax, zinnergy, QTs QommuniT, Gianna Alessi (liked). Noted in column H. |
| Outreach 6 | 14 sent 2026-11-19 (new video-chat intro). Cenny Ray cut. |
| Outreach 7 | Approved by Max 11/19: 10 to send on his trigger (EveryThai, Zep, Charles R. Bullard cut as businesses; Tina Demel and Paty don't follow us). |
| Outreach 8 to 10 | Queued from the 9/29 scrape. Not shown to Max yet. |
| Outreach 11 to 14 | 58 new follow-backs added 11/19. Not shown to Max yet. |

When someone agrees to a chat, log it in the CRM (touchpoint + next action) and note it in column H.

## How to send (Claude in Chrome)

1. Load the Chrome tools in one ToolSearch call; if they do not load, Chrome is not connected (`/chrome`, then a message with `@browser`).
2. Open a new tab on `https://www.instagram.com/<handle>/`.
3. Run the send script below with that handle and message. Before sending, it checks the profile, opens the chat, makes sure no one has written to us there yet, pastes the text, checks it matches exactly, sends, and confirms the box cleared.
4. Write the date in column J (or a note in column H for follow-ups).

Gotchas:
- **Paste, never type.** Typing a newline sends early. The script pastes with a synthetic ClipboardEvent into `div[role="textbox"]`.
- **Define the script inline every time.** Instagram's CSP sometimes blocks `eval`, so a helper saved in localStorage can fail on one page load and work on the next.
- **Do not rely on an `h2` for the handle.** Some profiles render it in a `span`. Check `location.pathname` plus a visible element with the exact handle.
- If the Message button is missing, wait and retry; the page may still be loading. Private accounts have no Message button: use the inbox New message flow (sent as a message request).
- The "existing thread" guard: a brand-new chat shows a "View profile" link. If it is missing, someone has already messaged in that thread. Stop and check before sending the cold intro.

Cold intro send script (set `handle` and `MSG`):

```js
const handle = 'HANDLE';
const MSG = `...message...`;
const w = ms => new Promise(r => setTimeout(r, ms));
let out;
await w(2500);
const okPage = location.pathname.replace(/\//g,'') === handle && [...document.querySelectorAll('h1,h2,span')].some(e => e.innerText.trim() === handle);
if (!okPage) out = {stop: 'profile mismatch'}; else {
  let box = document.querySelector('div[role="textbox"]');
  if (!box) {
    let mb; for (let i=0; i<10 && !mb; i++) { mb = [...document.querySelectorAll('div[role=button],button')].find(b => b.innerText.trim()==='Message'); if (!mb) await w(500); }
    if (mb) { mb.click(); for (let i=0;i<20;i++){ await w(500); box = document.querySelector('div[role="textbox"]'); if (box) break; } await w(3000); }
  }
  if (!box) out = {stop: 'no textbox'};
  else if (![...document.querySelectorAll('a,div[role=button]')].some(e => e.innerText.trim()==='View profile' && e.offsetParent)) out = {stop: 'existing thread, check first'};
  else {
    box.focus(); const dt = new DataTransfer(); dt.setData('text/plain', MSG);
    box.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true})); await w(800);
    if (box.innerText.replace(/\s+/g,' ').trim() !== MSG.replace(/\s+/g,' ').trim()) out = {stop: 'text mismatch'};
    else { const sb = [...document.querySelectorAll('div[role=button]')].find(b => /^Send$/i.test(b.innerText.trim()) || b.getAttribute('aria-label')==='Send');
      if (!sb) out = {stop: 'no send button'}; else { sb.click(); await w(2500); out = {sent: document.querySelector('div[role="textbox"]').innerText.trim()===''}; } }
  }
}
out
```

For a follow-up, swap the "View profile" guard for two checks on the chat pane text (walk 12 parents up from the textbox): it must contain our earlier message ("Thanks for following Sprout Society" or "Thank you for following Sprout Society") and must not already contain "20-minute".

## Logging every send and response (do this every time)

Three places must agree. Update all three in the same pass, never just one.

| Place | On a send | On a response |
|---|---|---|
| **DM Plan sheet** | Date in column J | Short note in column H: what they said, any meeting date/time, contact details given |
| **Outreach page** (`sprout_outreach_accounts`, matched by `handle`) | `status='messaged'`, `sent_at`, history line `Instagram DM sent from @sproutsocietyorg (Outreach).` | `status` = `replied` (wrote back) or `interested` (wants to talk / meeting set), `reply` (one-line summary), `replied_at`, history line `Instagram reply (<Status>): <summary>` |
| **Contact record** (row's `contact_id`) | Touchpoint with the same text as the history line | Touchpoint with the summary; fill email/phone/website if given; `relationship_status` cold/cool → warm; next action via `create_or_update_contact` or `set_next_action` (never raw SQL, so the dual-field rule holds) |

The history and touchpoint text mirrors what the Outreach page buttons write (`LOG` in `lib/outreach.js`), so the page and the CRM read the same either way. A like with no words is a response too: status `replied`, then the "liked" follow-up message.

### The response check (run at the start of every outreach session, before sending anything new)

1. Open the Primary inbox and collect thread previews (see "Finding who responded" below). Also check the **Requests** tab.
2. For each thread whose last message is theirs, open the chat and read the whole thread, not just the preview. Pull out: what they want, any date and time agreed, how they want to meet, contact details, and the name they go by.
3. Resolve relative dates against today ("next Tuesday" said on Thu 11/19 = Tue 11/24) and state the resolved date back to Max.
4. Log it in all three places above.
5. **Meeting agreed or offered:** two contact next actions: the prep step the day before (send the video link, or confirm a visit) and the meeting itself. Then put both on the **Day Board**: insert `sprout_tasks` rows (category `outreach`, hours 1, kind `follow_up`, `week_start` = that week's Monday, `day` = the date, `action_key` = `ind:<contact id>:<next action id>` so the board's sync never duplicates them). The board only syncs the current week, so a task for a later week must be inserted directly. Put the sheet note in caps (VIDEO CHAT / VISIT ...) so it stands out.
6. **Needs an answer from us:** draft the reply, show Max, send only on his go. Max sometimes replies himself in the app: read the thread first so we never answer twice.
7. Report to Max: who responded, what was agreed, what needs his answer.

## Finding who responded

The web inbox API (`/api/v1/direct_v2/inbox/`) returns 404. Instead:
1. Open `https://www.instagram.com/direct/inbox/` (Primary tab) and scroll the thread list, collecting each row's text.
2. A thread where they responded shows their action as the preview ("Liked a message", or their text). A thread still showing "You: Hi there! ..." or "You: Hi! ..." has no response.
3. Match display names back to the sheet. Leave out survey and past-participant threads (Girlypop, Natalya Ixchel, Queer Social, Buzzkill, and similar).
4. Open the profile's chat to read the full thread before writing a follow-up.

## Refreshing the follow-backs (do this regularly)

1. In an instagram.com tab, fetch `/api/v1/friendships/8091488399/following/?count=100&order=date_followed_latest` (headers `x-ig-app-id: 936619743392459`, `x-requested-with: XMLHttpRequest`, `x-csrftoken` from the cookie). Page with `max_id` if needed.
2. Everything above the first handle already on the DM Plan is new. Max Sibner sits near the top and is a SKIP row, not a cutoff.
3. Check each one follows us: `/api/v1/friendships/8091488399/followers/?count=12&query=<handle>`, about 1 second apart. Run long loops in the background and poll, since one call over 45 seconds times out. (`show_many` 404s on the web.)
4. Check against the CRM by Instagram handle AND by display name (`execute_sql` on `sprout_contacts` / `sprout_orgs`).
5. Append new rows after the last row: "Outreach N" batches of up to 15, newest first, Type "New follow-back (date)", Follows us "Yes". Excluded people go in "Not sending" rows with a note and an X in column I.
6. Never call `web_profile_info` (rate limited for hours) and never rely on scrolling the followers popup.

Related: `docs/guides/instagram-browser-scrape.md` (the original scrape playbook).
