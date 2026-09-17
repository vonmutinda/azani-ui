# Kids clothing pivot — local verification

Scope: clothing only for ages 2–12, implemented across azani-ui and azani-api. No production changes or real payments were made.

## Local setup

- UI: `/Users/vonmutinda/code/azani-ui`, branch `codex/kids-clothing-pivot`, http://localhost:3000.
- API: `/Users/vonmutinda/code/azani-api-clothing`, isolated worktree based on `74cdb14`, branch `codex/kids-clothing-pivot`, http://localhost:9000.
- Original API checkout was preserved. The worktree retains the existing Jenga implementation from its baseline.
- Isolated PostgreSQL database: `azani_functional_test_20260917`; Redis database 2. Environment credentials remain in ignored local files.

## Catalogue and migration evidence

The migration was reviewed in dry-run mode before applying locally. It retired 22 legacy products to draft, created six missing garment categories, and promoted the existing Bottoms category out of the legacy Clothing parent. No products or orders were deleted. The original order with display ID 1 remains present. Canonical categories are presented in garment order, and empty departments stay hidden.

Three deliberately labelled QA garments were seeded: a unisex top, a girls' dress, and a boys' jacket. The top has one available size/colour and one sold-out combination. These are synthetic fixtures with no commercial photography or invented height measurements. All seven categories exist; three are populated.

A repeat fixture apply kept all three products. A repeat migration dry run reported zero category or product changes. Local audit reports and the pre-migration database backup are in `/tmp/azani-clothing-*` and `/tmp/azani-before-clothing-20260917.dump` respectively; they are local artifacts, not deployment inputs.

## Live API checks

- Clothing list/detail return hydrated options, categories, prices and availability.
- Girls includes unisex; exact size/colour matches, pagination and invalid-age rejection passed.
- A legacy product detail returns 404. Inline cart creation, line addition, nonzero quantity updates and completion reject legacy products. Line removal remains possible.
- Two synthetic orders (display IDs 2 and 3) completed via the local manual-payment provider, including address, shipping, size and colour. This does not verify M-Pesa settlement or email delivery.
- Positive eligible-variant cart addition continued to pass after sales-channel guard changes.

## Browser checks

- Desktop catalogue, explicit size/colour selection, disabled sold-out options, fit guide, add-to-cart, variant labels in cart and checkout.
- Retired Bath & Diapering URL displays the pivot explanation and a clothing link.
- Mobile filter drawer selects ages 9–12 and returns the matching jacket. At an effective CSS width of 388 pixels, the page has no horizontal overflow; price and Choose size remain readable.
- Temporary viewport override was reset after verification.

## Release inputs and existing gates

Before production launch, import the real assortment, supplier size/height guidance, photography, prices and stock. Review the production migration mapping and open carts/payments separately; the supplied maintenance scripts are restricted to the named local test database.

The earlier functional test report records existing free-shipping enforcement and payment-provider configuration issues. Those remain launch gates; this pivot does not redesign payments or shipping. No real M-Pesa, Google login or outbound email was exercised.

## Final automated verification

- Storefront: 353 tests across 30 files; ESLint, TypeScript and production build passed.
- Backend: 127 tests across 15 suites; ESLint, TypeScript and backend/admin builds passed.
- Development mock: six contract tests passed.
- Independent review findings were resolved: stale variants, insufficient stock, API errors distinguished from retirement, complete filter clearing, category-request error isolation, sales-channel guards and customer/tax pricing context.
- Final live catalogue pricing and inline cart creation passed after the last backend changes.
