# Scraping our Instagram through the browser

How Claude pulls @sproutsocietyorg's follow list and researches profiles using Claude in Chrome. Proven on 2026-09-29 (1,026 follows pulled, 131 new accounts triaged).

## 1. Connect the browser

Claude Code can only use Chrome when the Claude in Chrome tools are attached to the session. Having the extension installed is not enough.

1. Chrome is open on the machine running Claude Code, with the Claude in Chrome extension signed in to the same Claude account, and Instagram logged in as @sproutsocietyorg.
2. In the VS Code extension, type `/chrome`. If it shows **Extension: Not detected**, click **Reconnect extension**.
3. Send a message containing **`@browser`** (for example `@browser go`). That attaches the tools.

A Claude Code restart drops the connection. Send `@browser resume` to reattach.

## 2. Pull the following list, newest first

Claude opens its own tab on instagram.com and runs this in the page:

```js
const h = {
  'x-ig-app-id': '936619743392459',
  'x-requested-with': 'XMLHttpRequest',
  'x-csrftoken': document.cookie.match(/csrftoken=([^;]+)/)[1],
};
const r = await fetch('/api/v1/friendships/8091488399/following/?count=100&order=date_followed_latest',
  { headers: h, credentials: 'include' });
```

- `8091488399` is @sproutsocietyorg's account id.
- `order=date_followed_latest` is required. Without it Instagram returns a ranking, not follow order.
- The whole list came back in one response. If a `next_max_id` comes back, page with `&max_id=` and wait 6 to 9 seconds between pages.

## 3. What not to do

| Don't | Why |
|---|---|
| Call `/api/v1/users/web_profile_info/` | Returns 429 (too many requests) and stays blocked for hours |
| Scroll the Following popup to load more | It stalls at about 12 accounts once anything has been rate-limited |
| Run a long JavaScript loop and wait on it | The tool times out at 45 seconds. Start it in the background and check a `window` variable |

## 4. Set the date cutoff

Instagram shows follow order, not follow dates. Find accounts whose timing we already know (event performers, showcase applicants, CRM records) and see where they sit in the list. On 2026-09-29, "the last 3 months" was about the top 170. For exact dates, download the account's data export (Settings → Your activity → Download your information → Followers and following, JSON).

## 5. Check against the CRM

Match every handle against the full contact and org records (`data::text ilike '%handle%'`), then match display names against first and last names. Many CRM records have no Instagram handle stored, so the name pass catches people the handle pass misses.

## 6. Triage, then research

1. Put the new accounts on a triage sheet in hello@'s Drive (handle, display name, best-guess type, any signal, profile link, a Keep column).
2. Max marks the keepers.
3. Claude visits only the keepers' profiles (bios load only on a real page visit), researches them, and emits records per [ig-deep-dive-json-contract.md](ig-deep-dive-json-contract.md).
4. `check_existing` on each, merge anyone already in the CRM, import the rest as prospects.
