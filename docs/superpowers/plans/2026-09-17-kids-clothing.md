# Kids Clothing Implementation Plan

> Execute task-by-task with test-first changes and independent review.

**Goal:** Deliver clothing-only discovery and safe local migration for ages 2–12.
**Architecture:** Medusa owns eligibility and complete-result filtering; Next.js consumes its clothing endpoints and existing commerce APIs.
**Spec:** ../specs/2026-09-17-kids-clothing-design.md

## Global constraints

- Whole KES, existing auth and payment lifecycle preserved.
- No deleting historical products/orders, no production mutations.
- Size/colour/age availability must match the same variant, before pagination.
- No invented supplier measurements or commercial inventory.

## Task 1 — Medusa catalogue and migration

- [x] Add failing tests for clothing eligibility, unisex audiences, age overlap, same-variant facets, pagination and retired-cart guards.
- [x] Implement the spec endpoints and middleware/hooks using installed Medusa APIs.
- [x] Add idempotent dry-run migration and local-only QA clothing fixtures; document import metadata and commands.
- [x] Run backend unit/type checks and live contract probes; independently review.

## Task 2 — Storefront content and garment navigation

- [x] Replace category model/icons and legacy redirects; test clothing-only taxonomy and retired handles.
- [x] Update header/footer/home/metadata/store information to ages 2–12 and audience/age/New In/Sale links.
- [x] Retain visual styling; hide unpopulated garment departments; avoid unsupported quality claims.
- [x] Run relevant tests and lint; independently review.

## Task 3 — Shopping integration

- [x] Wire client wrappers to clothing catalogue/detail/category endpoints, add audience/age/size/colour facets and server pagination/sorting.
- [x] Require explicit clothing option choice, show available sizes and truthful fit information.
- [x] Render variant labels through cart/checkout/orders; safely handle retired cart/wishlist entries.
- [x] Update realistic mocks, test suite and docs for the new contract.

## Task 4 — Verification and handoff

- [x] Run full UI tests/typecheck/build/lint and backend tests/checks.
- [x] Apply migration/QA fixtures only to isolated local DB, verify APIs and browser journeys at desktop/mobile widths.
- [x] Review combined diff, resolve actionable issues, record remaining external gates.
