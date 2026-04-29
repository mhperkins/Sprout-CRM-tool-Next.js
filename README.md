# Sprout Society CRM

Relationship management tool for Sprout Society Inc. Built with React + Vite.  
All data stored locally in your browser via `localStorage` — no backend, no database, no accounts.

---

## Run Locally

**Requirements:** Node.js 18+ (download at nodejs.org if needed)

```bash
# 1. Install dependencies (one time only)
npm install

# 2. Start the dev server
npm run dev
```

Then open **http://localhost:5173** in your browser.

Your data persists between sessions — it lives in your browser's localStorage under `sprout_crm_*` keys.

---

## Deploy to Vercel

**Option A — Vercel CLI (fastest)**
```bash
npm install -g vercel
vercel
```
Follow the prompts. Done. Vercel auto-detects Vite.

**Option B — GitHub + Vercel dashboard**
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import your repo
3. Vercel auto-detects Vite — click Deploy

No environment variables needed. Build command: `npm run build`. Output dir: `dist`.

> **Note on multi-device use:** Since data lives in localStorage, it's per-browser.  
> If you want to share data across devices, the next step would be adding a Supabase backend  
> (use the Import JSON module in the meantime to move profiles between sessions).

---

## Project Structure

```
sprout-crm/
├── index.html          ← HTML entry point
├── package.json        ← Dependencies
├── vite.config.js      ← Vite config
├── src/
│   ├── main.jsx        ← React root
│   └── CRMManager.jsx  ← The entire CRM app (all modules)
└── README.md
```

---

## Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | Health overview, overdue contacts, upcoming actions, tier distribution |
| **Contacts** | All individuals — filterable, searchable, detail panel with touchpoint log |
| **Organizations** | All orgs — linked contacts, financial tracking, touchpoint log |
| **Outreach Log** | Unified feed of all touchpoints across every record |
| **Social & Email** | Instagram + newsletter content calendar and pipeline |
| **Import JSON** | Paste Claude-generated JSON profiles to add contacts/orgs instantly |
| **Settings** | Org identity, communications setup, primary contact |

---

## Seed Data

The app loads with three Brooklyn Org contacts pre-filled:
- **Donna Lennon** — Program Manager, BKO Microgrant (Tier A, Warm)
- **Dr. Jocelynne Rainey** — Brooklyn Org, role TBD (Tier B, Cold — needs research)
- **Sabrina Hargrave** — Brooklyn Org, role TBD (Tier B, Cold — needs research)

---

## Tier / Cadence System

| Tier | Contact Cadence | Badge Color |
|------|----------------|-------------|
| A    | Every 30 days  | Fuchsia     |
| B    | Every 90 days  | Cyan        |
| C    | Every 180 days | Gray        |

The Dashboard flags anyone overdue. Health score (0–100%) reflects time since last touchpoint vs. cadence limit.

---

*Sprout Society Inc. · EIN 83-1298420 · 449 Troutman St, Brooklyn NY 11237*
