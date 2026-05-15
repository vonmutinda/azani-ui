# Azani Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current text-only Azani logo with the approved compact cloud-shop mark and Trebuchet-style wordmark.

**Architecture:** This is a static asset update. The existing header and footer already consume `/logo.svg`, so the implementation only needs to replace `public/logo.svg` while preserving a wide SVG viewBox and accessible title/label metadata.

**Tech Stack:** Next.js 16, SVG, existing `next/image` consumers in `src/components/site-header.tsx` and `src/components/site-footer.tsx`.

---

### Task 1: Replace Logo SVG

**Files:**

- Modify: `public/logo.svg`
- Verify: `src/components/site-header.tsx`
- Verify: `src/components/site-footer.tsx`

- [x] **Step 1: Confirm current consumers**

Run:

```bash
rg -n 'logo\\.svg|alt="Azani"' src public
```

Expected: `public/logo.svg` is consumed by the site header and footer image components.

- [x] **Step 2: Replace the SVG**

Replace `public/logo.svg` with a deterministic SVG using the approved T3 direction:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 100" role="img" aria-labelledby="azani-logo-title">
  <title id="azani-logo-title">Azani</title>
  <g transform="translate(28 15)">
    <path d="M9 22c8-11 24-10 31 2 7-5 18-1 20 9h6c5 0 9 4 9 10 0 11-11 19-31 19C21 62 6 53 6 38c0-6 1-10 3-16Z" fill="#FFF9E5" stroke="#C24D79" stroke-width="5.2" stroke-linejoin="round"/>
    <path d="M26 33h30" stroke="#267CB8" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M32 43h20" stroke="#93D8BB" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="28" cy="60" r="4.5" fill="#342A33"/>
    <circle cx="63" cy="60" r="4.5" fill="#342A33"/>
  </g>
  <path fill="#342A33" d="..." />
</svg>
```

Use Trebuchet MS Bold path outlines for the wordmark when FontTools is available, so the final asset does not depend on the browser loading a font.

- [x] **Step 3: Run formatting check**

Run:

```bash
npm run format:check -- public/logo.svg
```

Expected: PASS.

- [x] **Step 4: Run validation**

Run:

```bash
npm run typecheck
npm run test -- src/__tests__/pages/home.test.tsx
```

Expected: both commands PASS.

- [x] **Step 5: Visual check in the app**

Run:

```bash
npm run dev
```

Open the local app and inspect the header and footer. Expected: the mark and wordmark have a small visible gap, no clipping, and readable header-size type.

- [x] **Step 6: Commit implementation**

Run:

```bash
git add public/logo.svg docs/superpowers/plans/2026-05-15-azani-logo.md
git commit -m "style: update Azani logo"
```
