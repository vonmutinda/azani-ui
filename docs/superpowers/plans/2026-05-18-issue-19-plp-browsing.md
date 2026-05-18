# Issue 19 PLP Browsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade product cards, product listing browsing, filters, sorting, and category navigation for issue #19 without touching PDP, cart, checkout, or account flows.

**Architecture:** Keep the existing Medusa API, category, formatter, wishlist, and cart contracts. Improve `ProductCard` as the shared compact ecommerce card used by PLP grids and homepage rails, then make `/products` query-driven for category, search, sort, and page state. Preserve category tree behavior in `FilterSidebar` while making desktop/mobile controls predictable.

**Tech Stack:** Next.js App Router, React 19, TanStack Query, Tailwind CSS v4 utility classes, Vitest, Testing Library.

---

### Task 1: Product Card States

**Files:**

- Modify: `src/__tests__/components/product-card.test.tsx`
- Modify: `src/components/product-card.tsx`

- [ ] Write failing tests for sale pricing, long-title stability attributes, low-stock/out-of-stock labels, wishlist toggle, successful quick add, and max-in-cart blocking.
- [ ] Run `npm test -- src/__tests__/components/product-card.test.tsx` and confirm the new assertions fail before implementation.
- [ ] Update `ProductCard` with a stable media slot, compact content hierarchy, image fallback without broken icons, sale/original price handling, visible stock labels, wishlist icon button, and quick-add button that respects inventory and current cart quantity.
- [ ] Re-run `npm test -- src/__tests__/components/product-card.test.tsx` and confirm it passes.

### Task 2: Filter Sidebar And Category Tree

**Files:**

- Modify: `src/__tests__/components/filter-sidebar.test.tsx`
- Modify: `src/components/filter-sidebar.tsx`
- Modify: `src/lib/categories.ts`

- [ ] Write failing tests for mobile filter open/close, child category selection, active child expansion, and clear behavior preserving shareable filter keys.
- [ ] Run `npm test -- src/__tests__/components/filter-sidebar.test.tsx` and confirm the new assertions fail before implementation.
- [ ] Update `FilterSidebar` with stable desktop filter content, mobile drawer behavior, category tree selection, active filter count, and clear controls.
- [ ] Re-run `npm test -- src/__tests__/components/filter-sidebar.test.tsx` and confirm it passes.

### Task 3: Products Page PLP

**Files:**

- Modify: `src/__tests__/pages/products.test.tsx`
- Modify: `src/app/products/page.tsx`

- [ ] Write failing tests for category header text, sort control query behavior, empty state recovery action, and product request params.
- [ ] Run `npm test -- src/__tests__/pages/products.test.tsx` and confirm the new assertions fail before implementation.
- [ ] Update `/products` with category/search header copy, sort select, shareable query state, loading skeletons, empty state recovery, active chips, pagination preservation, and category descendant filtering.
- [ ] Re-run `npm test -- src/__tests__/pages/products.test.tsx` and confirm it passes.

### Task 4: Verification, Browser QA, PR, And Staging

**Files:**

- Check: `next.config.ts`
- Check: `scripts/mock-medusa-server.mjs`
- Check: screenshots under `docs/screenshots/`

- [ ] Run `npm run typecheck`.
- [ ] Run `npm test -- src/__tests__/components/product-card.test.tsx src/__tests__/components/filter-sidebar.test.tsx src/__tests__/pages/products.test.tsx`.
- [ ] Start the mock Medusa server and Next dev server.
- [ ] Browser-check `/products`, a top-level category URL, an empty filter state, sort behavior, mobile filter open/close, image natural dimensions, wishlist, and quick add.
- [ ] Capture desktop PLP, mobile PLP/filter, and empty-state screenshots for the PR.
- [ ] Push `codex/issue-19-plp-browsing` and open a PR against `develop` mentioning issue #19, verification, screenshots, scope boundaries, and no promotion to `main`.
- [ ] Confirm Railway staging deployment for the PR and repeat the required staging checks before considering the issue complete.
