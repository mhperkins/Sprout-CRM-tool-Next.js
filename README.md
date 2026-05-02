<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
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
>>>>>>> c48f1d313cc0bdf421869740769c988e186b19ed
