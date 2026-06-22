# Sprout Society Sign-In Kiosk — Setup

A standalone HTML sign-in page that feeds every entry into a Google Sheet. No server, no hosting bill. Works as a tablet kiosk or a hosted link.

**Files:**
- `../public/sprout-sign-in.html` — the page (name/email → optional donation → membership/hosting/donate tabs). **Lives in the app's `public/` folder so it deploys to Vercel** at `https://sprout-crm-tool-next-js.vercel.app/sprout-sign-in.html`.
- `apps-script.gs` — the tiny script that writes rows into your Sheet
- `SETUP.md` — this file

**Live URL:** https://sprout-crm-tool-next-js.vercel.app/sprout-sign-in.html (this is what the QR code points to). Static files in `public/` bypass the CRM login wall, so the public can reach it without signing in.

---

## Part 1 — Make the Sheet write rows (~5 min)

1. Create (or open) the Google Sheet you want sign-ins to land in.
2. **Extensions → Apps Script.** Delete any starter code.
3. Paste the entire contents of **`apps-script.gs`**. Save (💾).
4. **Deploy → New deployment.**
   - Click the gear ⚙️ → **Web app**.
   - **Execute as:** Me.
   - **Who has access:** **Anyone** (this is what lets the kiosk post; it does not expose your Sheet — only the append script).
   - **Deploy.** Authorize when prompted (it's your own script).
5. Copy the **Web app URL** (ends in `/exec`).

> To verify: paste that URL in a browser. You should see `{"ok":true,"service":"sprout-signin",...}`.

---

## Part 2 — Point the page at your Sheet (~1 min)

1. Open **`sprout-sign-in.html`** in a text editor.
2. Near the top, in the `CONFIG` block, set:
   ```js
   SCRIPT_URL: "https://script.google.com/macros/s/AKfy.../exec",
   ```
   (the URL you copied).
3. Save. Open the HTML file in a browser and do a test sign-in. A new row should appear in the **Sign-ins** tab.

That's it — sign-ins now flow into your Sheet. The donation buttons and the Membership / Hosting / Donate tabs are already wired to your live Givebutter and Google Form links.

---

## Part 3 (optional) — "Continue with Google" button

The page works without this; it just adds a one-tap autofill from a Google account.

1. Go to **console.cloud.google.com** → your "Sprout Workspace MCP" project (or any project) → **APIs & Services → Credentials**.
2. **Create credentials → OAuth client ID → Web application.**
3. Under **Authorized JavaScript origins**, add the origin where the page will run:
   - Tablet/local file use: this won't have an origin — skip the Google button, or host the page (below).
   - Hosted: e.g. `https://your-domain` or your Vercel URL.
4. Copy the **Client ID** into `CONFIG.GOOGLE_CLIENT_ID` in the HTML.

> The Google button only renders when the page is served over `http(s)` from an authorized origin. Opened as a bare `file://` it stays hidden and name/email entry is used — which is fine for a kiosk.

---

## Hosting options

- **Tablet kiosk:** just open the `.html` file in the browser, full-screen it. Tap "Done — sign in someone new" between guests.
- **Shareable link:** drop `sprout-sign-in.html` into the Next.js app's `public/` folder and it serves at `/sprout-sign-in.html`, or host on any static host (Netlify drop, GitHub Pages, etc.).

---

## What you can change in CONFIG (top of the HTML)

| Key | Purpose |
|-----|---------|
| `SCRIPT_URL` | **Required.** Your Apps Script web app URL. |
| `GOOGLE_CLIENT_ID` | Optional. Enables the Google button. |
| `DONATE_URL` | Givebutter donation campaign (default `sproutspacedonors`). |
| `MEMBERSHIP_URL` | Givebutter membership page. |
| `HOSTING_FORM` / `HOSTING_NONMEMBER_FORM` | The event/hosting Google Forms. |

The Sheet columns are **Timestamp · Name · Email · Source** (`Source` = `kiosk` or `google`).
