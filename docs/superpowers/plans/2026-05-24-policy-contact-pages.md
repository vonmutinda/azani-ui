# Policy and Contact Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real Azani policy and contact pages, then link them from the footer.

**Architecture:** Store static content in `src/lib/store-info-pages.ts`, render it through `src/components/store-info-page.tsx`, and keep App Router route files thin. Footer links point at the new static pages.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, lucide-react, Vitest, Testing Library.

**Spec:** [docs/superpowers/specs/2026-05-24-policy-contact-pages-design.md](../specs/2026-05-24-policy-contact-pages-design.md)

---

## File Structure

| Path                                            | Action | Responsibility                                        |
| ----------------------------------------------- | ------ | ----------------------------------------------------- |
| `src/lib/store-info-pages.ts`                   | Create | Typed page registry for policies and contact content. |
| `src/components/store-info-page.tsx`            | Create | Shared server component for static information pages. |
| `src/app/policies/shipping/page.tsx`            | Create | Shipping policy route.                                |
| `src/app/policies/returns/page.tsx`             | Create | Returns and exchanges route.                          |
| `src/app/policies/privacy/page.tsx`             | Create | Privacy policy route.                                 |
| `src/app/policies/terms/page.tsx`               | Create | Terms of service route.                               |
| `src/app/contact/page.tsx`                      | Create | Contact route.                                        |
| `src/components/site-footer.tsx`                | Modify | Replace disabled policy labels with real links.       |
| `src/__tests__/pages/store-info-pages.test.tsx` | Create | Route rendering tests for the new pages.              |
| `src/__tests__/lib/store-info-pages.test.ts`    | Create | Content registry tests.                               |
| `src/__tests__/components/site-footer.test.tsx` | Modify | Footer link coverage.                                 |

---

## Task 1: Write Failing Tests

**Files:**

- Create: `src/__tests__/pages/store-info-pages.test.tsx`
- Create: `src/__tests__/lib/store-info-pages.test.ts`
- Modify: `src/__tests__/components/site-footer.test.tsx`

- [ ] **Step 1: Add tests**

Create tests that import the missing page modules and content registry, then assert expected route content and footer links.

- [ ] **Step 2: Run focused tests**

Run:

```bash
npm test -- src/__tests__/pages/store-info-pages.test.tsx src/__tests__/lib/store-info-pages.test.ts src/__tests__/components/site-footer.test.tsx --maxWorkers=1
```

Expected: fail because the content module and route files do not exist yet.

---

## Task 2: Implement Content and Routes

**Files:**

- Create: `src/lib/store-info-pages.ts`
- Create: `src/components/store-info-page.tsx`
- Create: `src/app/policies/shipping/page.tsx`
- Create: `src/app/policies/returns/page.tsx`
- Create: `src/app/policies/privacy/page.tsx`
- Create: `src/app/policies/terms/page.tsx`
- Create: `src/app/contact/page.tsx`

- [ ] **Step 1: Create content registry**

Define `StoreInfoPageContent`, `policyPages`, `contactPage`, and `allStoreInfoPages`. Use original Azani copy only.

- [ ] **Step 2: Create shared renderer**

Render a compact hero, quick facts, content sections, and a support callout using existing tokens and no nested cards.

- [ ] **Step 3: Create route files**

Each route exports `metadata` and renders `<StoreInfoPage page={...} />`.

- [ ] **Step 4: Run focused tests**

Run the same focused test command. Expected: all focused tests pass.

---

## Task 3: Link Footer

**Files:**

- Modify: `src/components/site-footer.tsx`

- [ ] **Step 1: Replace disabled labels**

Add links to `/policies/shipping`, `/policies/returns`, `/policies/privacy`, `/policies/terms`, and `/contact`.

- [ ] **Step 2: Run footer test**

Run:

```bash
npm test -- src/__tests__/components/site-footer.test.tsx --maxWorkers=1
```

Expected: footer tests pass.

---

## Task 4: Verify and Ship

**Files:** all files touched above.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm run lint
npm run typecheck
npm test -- --maxWorkers=1
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 2: Browser-check pages**

Open `/policies/shipping`, `/policies/returns`, `/policies/privacy`, `/policies/terms`, and `/contact`. Confirm headings render, footer links work, and no horizontal overflow appears.

- [ ] **Step 3: Commit and push**

```bash
git add docs/superpowers/specs/2026-05-24-policy-contact-pages-design.md docs/superpowers/plans/2026-05-24-policy-contact-pages.md src
git commit -m "feat: add policy and contact pages"
git push origin HEAD:develop
```
