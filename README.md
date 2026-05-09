# Azani UI

Azani Kenya storefront — Next.js App Router consuming the `azani-api` Medusa v2 backend.
Forked from `micro-ui` `main` and hardcoded for Kenya/KES; no env-driven brand config.

## Tech Stack

- Next.js (App Router)
- React Query
- TypeScript
- Tailwind CSS
- Medusa v2 (storefront API)

## Prerequisites

- `azani-api` backend running (default: `http://localhost:9000`)
- Node.js 20+

## Environment

Copy `.env.example` to `.env.local` and fill in the publishable API key from Medusa Admin
(Settings → Publishable API Keys).

```bash
cp .env.example .env.local
```

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Brand identity

Brand strings (currency `KSh`, country `KE`, phone `+254`, store name `Azani`, etc.) are
hardcoded throughout `src/` rather than env-driven. To rebrand or rename, search-and-replace.
