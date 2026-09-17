# Azani UI

Azani Kenya kids clothing storefront for ages 2–12 — Next.js App Router consuming the
`azani-api` Medusa v2 backend. The catalogue is organised by garment type, with audience, age,
size, colour, availability, price, sale status and sorting as discovery filters.

The storefront calls the clothing-specific Medusa routes for catalogue discovery:

- `GET /store/clothing-products`
- `GET /store/clothing-products/:id`
- `GET /store/clothing-categories`

Existing cart, customer, checkout and order flows continue to use Medusa's standard store routes.

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
