# Bagisto UI

Modern headless storefront built with Next.js App Router that consumes Bagisto Laravel shop APIs.

## Features

- Product listing and search
- Product details page
- Cart (add/remove/update quantity)
- Coupon apply/remove
- Checkout flow scaffold (address, shipping, payment, place order)
- Customer login
- Wishlist page
- API proxy route to bridge Bagisto session cookies

## Tech Stack

- Next.js
- React Query
- TypeScript
- Tailwind CSS

## Prerequisites

- Bagisto backend running locally (default: `http://127.0.0.1:8000`)
- Node.js 20+

## Environment

Copy `.env.example` to `.env.local` and adjust if needed.

```bash
cp .env.example .env.local
```

Variables:

- `BAGISTO_BACKEND_URL` - Base URL of Bagisto backend used by Next.js proxy route.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## API Integration Notes

- Frontend calls `/api/bagisto/*` (Next.js route handler).
- Route handler forwards requests to `${BAGISTO_BACKEND_URL}/api/*`.
- Bagisto session cookies are persisted as prefixed cookies in Next.js to support customer endpoints.

## Next Steps

- Add dedicated auth/register/logout pages if you expose these backend APIs.
- Add CMS content blocks from Bagisto.
- Add complete checkout forms for all Bagisto address/payment permutations.
