# Azani UI Elevation — Handoff for Remaining Work

> Self-contained handoff to continue the storefront elevation from a **fresh session / worktree**.
> Pairs with [`ui-elevation-plan.md`](./ui-elevation-plan.md) (the research, critique, WCAG audit, token targets,
> the full **E1–E23 journey**, and the **refined build prompt** in §7). This doc adds: **per-item actionable specs
> for what's left**, the **dev/preview setup**, the **design-system reference**, and the **gotchas** so you don't
> re-discover them.

---

## 0. Status — what's shipped, what's left

Shipped on `main` via **PR #45** (foundations + brand + M-Pesa checkout + policy pages) and **PR #46** (hero + discovery + checkout UX + richer cards). Baseline: **278 tests · typecheck · lint green.**

| Phase | Done | Partial | Untouched |
|---|---|---|---|
| 0 Foundations | E1 shipping SSOT · E2 tokens · E3 policy pages · E4 country | **E5** (`<Button>`/`buttonVariants` done; **`<Input>` + full CTA migration not**) | — |
| 1 Brand | E6 raspberry · E7 type · E8 announce bar | — | — |
| 2 Home/hero | E9 hero rebuild | — | **E10** social-proof band + "shop by stage/age" |
| 3 Discovery | E11 sort · E12 facets | **E13** (discount% + option-count done; **ratings, color swatches, labelled add-to-cart, single-badge** not) | — |
| 4 Product detail | — | — | **E14 · E15 · E16 (entire PDP)** ← highest value |
| 5 Cart/checkout | (checkout got M-Pesa flow + T&C + back-nav, off-journey) | — | **E17 cross-sell · E18 stepper/qty polish · E19 payment logos** |
| 6 Nav/responsive | — | — | **E20 mobile-nav accordion · E21 WhatsApp offset/z** |
| 7 A11y/motion | — | **E22** (back-nav + facets at 44px; global pass not) | **E23 motion** |

**Recommended sequence (one PR each):** E14→E15→E16 (PDP) · then E10 · E19 · E13-finish · E17 · E18 · E20 · E21 · E22 · E23 · E5-finish.

---

## 1. Start a session (do this first)

**Stack:** Next 16 (App Router) · React 19 · Tailwind v4 (`@theme` in `globals.css`, no JS config) · TanStack Query · Zod · lucide-react · Vitest + Testing-Library. Backend: Medusa v2 (`azani-api`), hardcoded Kenya/KES/M-Pesa.

```sh
# from a fresh worktree off main
git worktree add ../azani-feature -b feat/<name> main   # or your normal flow
cd ../azani-feature && npm install
```

**`.env.local`** (not committed; create it):
```
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_mock_dev
```

**Dev loop (two processes):**
```sh
npm run mock:medusa     # bundled mock Medusa on :9000  (scripts/mock-medusa-server.mjs)
npm run dev             # next dev — MUST end up on :3000 (see CORS gotcha)
```

⚠️ **CORS gotcha:** the mock only sends `Access-Control-Allow-Origin: http://localhost:3000`. `.claude/launch.json` has `autoPort:true`, so if **:3000 is taken**, dev starts on a random port and **all browser fetches CORS-fail (blank data)**. Fix: free :3000, or edit the mock's `send()` to echo the request `Origin`.

**Gates (all must be green before any PR):**
```sh
npm run typecheck && npm run lint && npm test
```

**Mock data facts (so test expectations are right):**
- Seeds **7 top categories × 3 children** (Feeding→Bottles/Formula/Weaning, etc.) and **~9 products**.
- **Every** variant has `calculated_price` with `original_amount = round(amount × 1.12)` → **~11% "discount" on all products** (artificial). So the discount badge shows on everything in the mock; real data is selective.
- Price amounts are **major KES units** (e.g. `8490` → "KSh8,490.00").
- Category filtering, cart, shipping-options, cart/complete are all supported by the mock; the M-Pesa STK provider-side states (`session.data.status` canceled/failed) are **not** simulated — verify those against `azani-api` staging.

---

## 2. Design system reference

**Tokens** (`src/app/globals.css`, exposed as Tailwind utilities via `@theme`):

| Token | Value | Use |
|---|---|---|
| `primary` / `primary-hover` / `primary-light` | `#d6336c` / `#c2255c` / `#fff1f6` | **Primary CTAs**, active nav, link hover (AA on white: 4.6:1) |
| `secondary` / `-hover` / `-light` | `#267cb8` / `#1f699f` / `#edf7ff` | Info accents, "New Arrivals", progress |
| `foreground` | `#342a33` | Text + ghost/secondary buttons (no longer the CTA fill) |
| `muted` / `muted-light` | `#6f6571` / `#a79ba7` | Secondary text / hints (⚠️ `muted-light` ~3:1 — body-text use fails AA; see E22) |
| `border` / `border-hover` | `#d8ced6` / `#b8adb7` | Borders |
| `card` / `background` | `#ffffff` / `#fefcfd` | Surfaces |
| `accent-yellow(-ink/-light)` · `accent-green(-bold/-light)` · `success(-ink)` · `danger` · `whatsapp` | see file | Status, promos, WhatsApp `#25d366` |
| radii | `--radius-sm…xl` 0.5–1.25rem; cards `rounded-2xl` | |
| fonts | `font-heading` = DM Sans (h1/h2); body = Geist Sans; Geist Mono | hero uses `text-[clamp(2.25rem,6vw,4rem)]`; section H2 `text-2xl sm:text-3xl` |

**Reusable patterns already in the codebase — use these, don't reinvent:**
- `@/components/ui/button` → `<Button variant size fullWidth className>` **and** `buttonVariants({…})` (returns a class string for `<Link>`/`<a>`). Variants: `primary|secondary|ghost|danger`; sizes `sm|md|lg`. **Touch height lives here** — bump to `min-h-11` in E22 and it propagates.
- **Back-link pattern** (`src/app/checkout/page.tsx` → `BACK_LINK_CLASS`): `ArrowLeft` icon (`aria-hidden`) + text, `min-h-11`, `focus-visible:ring-foreground/25`. Reuse for any "go back" control.
- **Faceted-filter pattern** (`src/components/filter-sidebar.tsx`): native `<input>` wrapped in `<label>`, `<fieldset>/<legend>` for radio groups, `accent-primary`, 44px rows. Reuse for new facets.
- Money: **always** `@/lib/formatters` (`getProductPrice`, `getProductOriginalPrice`, `getProductDiscountPercent`, `getVariantAvailability`, `getVariantPrice`) and `@/lib/shipping` (`freeShippingThresholdLabel`, etc.). Never hardcode `"Ksh"`.

**Conventions (the PR self-review checklist — reviewers enforce these):**
- `"use client"` only when hooks/state/effects/browser APIs are needed.
- Tailwind **tokens, not hex**. Decorative SVGs get `aria-hidden="true" focusable="false"`. lucide for icons (inline SVG only for trademark logos).
- Icon-only interactive els get `aria-label`. `focus-visible:ring-2 …` on the **element itself**. Touch targets **≥44px**. `motion-safe:` gate animations.
- Public env = `NEXT_PUBLIC_AZANI_*`, documented in `.env.example`, `||` fallback (not `??`).
- Medusa calls only via `@/lib/http.ts` + `@/lib/medusa-api.ts` — never fetch from components.
- New remote image host → add to `next.config.ts` `remotePatterns`.
- Tests: role/label queries (`getByRole`/`getByLabelText`); `renderWithProviders` only when Toast/QueryClient needed; read shared values from source (`siteConfig.*`) not literals.
- **Red-flag files (sign-off needed):** `lib/http.ts`, `lib/medusa-api.ts`, `next.config.ts`, `app/account/*` auth.

---

## 3. Competitor benchmark (reference targets)

- **Peekaboo.ke** (direct KE): "Download app → 10% off" bar · deep mega-menu (NEW IN · Feeding · Nursery · Travel · Toys · Diapering · Fashion · Bath & Skin · Sale 💥 · Gift Registry) · "open 9am–7pm" bar · **prominent "20k 5★ Reviews!" band with Google-review cards** · 9 category-icon shortcuts · Best Sellers · cards: sale price + strikethrough (~31% off) + "Add To Cart".
- **Kiabi.sa /baby** (intl): "24/7 · Free Delivery over 199 SAR" bar · left-sidebar facets (Availability · Gender · Price · Color×18 · Size×60+ · Type×45+) · Sort (Featured/Relevance/Price↑↓/New) · 4-up grid · **dual-image-hover cards** with New badge + **"N Colors"** + price · **payment logos (Tabby/Tamara/Mada/Visa/Apple Pay)** · rich footer.

**To capture rendered pixels of a competitor** (the dev preview can't navigate off-localhost):
```sh
UA="Mozilla/5.0 … Chrome/124 …"
curl -sL -A "$UA" "https://www.peekaboo.ke/" -o public/cmp.html
perl -0pi -e 's/(<head[^>]*>)/$1<base href="https:\/\/www.peekaboo.ke\/">/i' public/cmp.html   # resolve assets
perl -0pi -e 's/<script\b[^>]*>.*?<\/script>//gis' public/cmp.html                              # stop JS redirects
# preview → localhost:3000/cmp.html → screenshot → then: rm public/cmp.html  (never commit it)
```

---

## 4. Remaining items — specs

> Format per item: **Status · Goal/benchmark · Files · Spec · Notes · Tests · Verify · Effort/Impact**

### ⭐ E14 — PDP: breadcrumbs + per-option availability  *(M / M)*
- **Status:** untouched. `product-detail.tsx` renders option pills that are **always enabled**; no breadcrumbs.
- **Goal/benchmark:** orientation + no dead ends (Kiabi/Peekaboo PDPs both do this).
- **Files:** `src/components/product-detail.tsx` (the `{/* Options */}` block ~L274–296 and a new breadcrumb above the title); reuse the breadcrumb markup from `src/components/store-info-page.tsx` (Home › Title pattern).
- **Spec:**
  - **Breadcrumb** (top): `Home › {category.name} › {product.title}` — `<nav aria-label="Breadcrumb">`, `ChevronRight` separators (`aria-hidden`), last crumb `aria-current="page"`, `text-muted` with hover→`text-foreground`. Category links to `/products?category={handle}`.
  - **Per-option availability:** for each option value, compute whether **any in-stock variant** has that value given the *other* selected options. If none → render the pill **disabled** with `line-through`/`opacity-60` + `aria-disabled`, and a small "Sold out" affordance. Use `getVariantAvailability(variant).inStock`. When the current selection becomes invalid after a change, auto-select the first available value.
- **Notes:** the variant-resolution logic already exists (`selectedVariant` memo ~L88). Extend it to a helper `isValueAvailable(optionId, value)` that holds the other selected options fixed.
- **Tests** (`src/__tests__/components/product-detail.test.tsx` — create or extend): breadcrumb renders category + title; an option value with no in-stock variant is `disabled`. Use a fixture with one out-of-stock variant.
- **Verify:** `/products` → click a multi-variant product (opens in-place `ProductDetail`); confirm breadcrumb + that sold-out options are visibly disabled.

### ⭐ E15 — PDP buy-box: trust row + original/strike price  *(M / H)*
- **Status:** untouched. PDP shows a single `price` (no original/strike), no trust row. The **card** already shows original + `-N%` (E13) — PDP must **match**.
- **Files:** `src/components/product-detail.tsx` (price block ~L255; add a trust row under Add-to-Cart ~L358).
- **Spec:**
  - **Price block:** `{price}` bold + `{getProductOriginalPrice(product)}` struck (`text-muted line-through`) + `-{getProductDiscountPercent(product)}%` in `text-primary` — mirror `product-card.tsx` exactly.
  - **Trust row** (under the Add-to-Cart row): 3 inline items with lucide icons → `Truck` "Free delivery over {freeShippingThresholdLabel()}", `Smartphone` "Pay with M-Pesa", `RotateCcw`/`ShieldCheck` "Easy returns" (link `/policies/returns`). `text-muted text-xs`, wraps on mobile. (Same content family as the hero chips — keep wording consistent.)
- **Notes:** keep the existing stock-status line. Don't duplicate the global trust bar wording verbatim — this is point-of-purchase reassurance.
- **Tests:** original price + `-N%` appear when discounted; trust row shows the M-Pesa + delivery items.
- **Verify:** PDP shows strike price + `-11%` + the trust row on a mock product.

### ⭐ E16 — PDP: ratings + related products + spec accordion  *(L / H)*
- **Status:** untouched. The right column ends after Add-to-Cart; description is a flat paragraph.
- **Files:** `product-detail.tsx`; reuse `src/components/star-rating.tsx` (exists). Possibly a new `RelatedProducts` sub-component using `ProductCard`.
- **Spec:**
  - **Ratings:** `<StarRating>` + "(N reviews)" near the title. **Data:** products likely lack review data — read from `product.metadata` if present, else **hide gracefully** (don't fake numbers). A real reviews list is backend-dependent; ship the *display* + an empty state ("No reviews yet").
  - **Accordion** (description / specs / delivery & returns): replace the flat description with a collapsible accordion. Native `<details>/<summary>` is simplest + accessible; or a controlled accordion with `aria-expanded`/`aria-controls`. "Description" open by default. "Delivery & returns" links to the policy pages.
  - **"You may also like":** below the buy-box, a row of 3–4 `<ProductCard>` from the same category (`getProducts({ category_id, limit: 4 })` excluding the current id). Horizontal scroll on mobile (`hide-scrollbar` utility exists).
- **Notes:** this fills the empty space below the fold and adds cross-sell. Keep it data-resilient (related query can return few/none → hide section).
- **Tests:** accordion toggles; related row renders cards; reviews section hides when no data.
- **Verify:** PDP shows accordion + a related-products row.
- **PDP routing note:** the PDP renders **two ways** — in-place from `products/page.tsx` (`onSelect` → `<ProductDetail>`), and as a full page `src/app/products/[id]/page.tsx`. Verify both still work.

### E10 — Home: social-proof band + "shop by stage/age"  *(M / M)*
- **Status:** untouched. Home has hero, category row, featured/new tabs, 2 promo banners, features bar. **No reviews band, no stage/age entry.** (Peekaboo's "20k 5★ Reviews" band is a signature trust element.)
- **Files:** `src/app/page.tsx`.
- **Spec:** add a **social-proof band** (heading "Loved by 10,000+ parents" + a row of review cards using `<StarRating>` — static/curated copy is fine if no review backend; mark clearly as testimonials). Optionally a **"Shop by stage"** entry (Newborn 0–3m / 3–6m / 6–12m / Toddler) linking to `/products?...` — **only if** age maps to data; otherwise skip and note it. Use brand-gradient surfaces like the hero panel.
- **Tests:** band renders heading + cards. **Verify:** home shows the band between the product grid and the features bar.

### E19 — Payment / trust logos  *(S / M)* — quick win
- **Status:** untouched. Footer has policy links; no payment logos. (Kiabi shows them prominently.)
- **Files:** `src/components/site-footer.tsx` + checkout review step (`src/app/checkout/page.tsx`).
- **Spec:** a small "We accept" row — **M-Pesa** (brand asset; lucide has no M-Pesa, use an inline SVG with `aria-hidden`+`focusable=false`, or a `/public` asset registered if remote) + Visa/Mastercard marks. Greyscale, `~24px` tall, `aria-label="Accepted payment methods"`. Add to footer and near the checkout pay button. **Don't** add new remote hosts without `next.config.ts`.
- **Tests:** footer renders the payment-methods group. **Verify:** logos in footer + checkout.

### E13-finish — card: ratings · color swatches · single badge  *(M / M)*
- **Status:** done = `-N%` discount tag + "N options". **Remaining** = `<StarRating>`+count (data permitting), color swatches (needs color option metadata — likely skip until data), and **one** meaningful badge (today "New" shows on most products; make it New **or** Sale **or** Bestseller, single). Add-to-cart is already labelled-ish (icon "+"); E13 wants icon+text on ≥sm — optional.
- **Files:** `src/components/product-card.tsx`. **Tests:** badge precedence (Sale over New); rating hidden without data.

### E17 — Cart cross-sell + clearer M-Pesa/delivery summary  *(M / M)*
- **Files:** `src/app/cart/page.tsx`. **Spec:** an "Add these too" row (related/popular `<ProductCard>`), and a clearer order-summary block (delivery estimate + M-Pesa note). Reuse the free-shipping progress bar already there.

### E18 — Mobile checkout legibility + qty hardening  *(M / M)*
- **Files:** `src/app/checkout/page.tsx`, `src/app/cart/page.tsx`. **Spec:** the mobile stepper is cramped — enlarge/space it; harden numeric qty inputs (`inputMode="numeric"`, clamp on change not just blur); add per-step validation copy. Note: checkout already got T&C + back-nav + M-Pesa flow, so coordinate with that code.

### E20 — Mobile nav → collapsible accordion  *(M / M)*
- **Files:** `src/components/site-header.tsx`. **Spec:** the mobile menu lists all categories + 5 subcats each (long scroll). Make each top category an accordion **collapsed by default**, expanding subcats on tap (`aria-expanded`/`aria-controls`, chevron rotate). Keep search at top.

### E21 — Floating WhatsApp: offset + safe-area + z-index  *(S / M)*
- **Files:** `src/components/floating-whatsapp.tsx`, `src/components/toast.tsx`. **Spec:** the button can occlude bottom CTAs/toasts. Respect `env(safe-area-inset-bottom)`, offset from the bottom CTA on cart/checkout, and ensure toasts (`z-[100]`) render **above** it. (Earlier observed overlap with toasts on mobile.)

### E22 — Accessibility pass (WCAG 2.1 AA)  *(M / H)*
- **Status:** partial — back-nav + facets at 44px; focus rings consistent there. **Remaining (global):** bump **all** CTA pills to `min-h-11` (do it once in `buttonVariants` + migrate remaining inline-class CTAs); audit **`muted-light` used as body text** (~3:1 — fails) and replace with `muted`; complete tab ARIA on the home "Featured/New" tablist (`role="tablist"` exists — verify `aria-controls`/panels); `aria-hidden` on any remaining decorative SVGs; add a **hero pause control** if any auto-animation remains; keyboard-test the mega-menu (a known prior gap). Re-run an `accessibility-review` pass.
- **Tests:** extend where component tests exist; manual keyboard + contrast check.

### E23 — Tasteful motion (reduced-motion-guarded)  *(S / M)*
- **Files:** `src/app/globals.css` + components. **Spec:** card hover lift (`hover:-translate-y-0.5 hover:shadow-md`), staggered reveal on grids, button press (`active:scale-[0.98]`), image zoom (already on cards) — **all** under `motion-safe:` / `@media (prefers-reduced-motion: no-preference)`.

### E5-finish — `<Input>` primitive + complete CTA migration  *(M / M)*
- **Files:** `src/components/ui/` (+ usages). **Spec:** extract `<Input>`/`inputClass` (login, checkout, account all repeat input classes); migrate remaining inline-class CTAs (verify, reset-password, google-callback, account, cart, checkout) onto `buttonVariants()`. Mechanical; pairs naturally with E22's 44px bump.

---

## 5. Gotchas & lessons (so you don't rediscover them)

- **Mock server dies** sometimes mid-session (`lsof -ti :9000` empty) → restart `npm run mock:medusa`. Symptom: products hang on skeletons / `ERR_CONNECTION_REFUSED` in the network panel.
- **Preview screenshots lag / show stale frames** — trust a `preview_eval` DOM read (`document.querySelectorAll('article').length`, `innerText`) over the screenshot. The **viewport resets on navigation** — re-`preview_resize` and do a settle `eval` (scrollTop=0) before screenshotting.
- **React Query timing:** after a fresh navigation the first `eval` often runs before the fetch resolves (0 articles). Wait/poll, then re-check.
- **External Unsplash images** intermittently `net::ERR_BLOCKED_BY_ORB` — cosmetic, the graceful fallback covers it.
- **`updateQuery` semantics** (`products/page.tsx`): it **preserves** `category/q/sort/availability/price` and spreads `newFilters`. To clear a key pass it **explicitly `undefined`**. "Clear all" passing `{}` clears nothing (was a real bug — now fixed in the sidebar; keep this in mind for new filters).
- **Client-side faceting** (E12) filters only the **loaded page**; pagination is hidden while facets are active. Server-side faceting is the production follow-up.
- **Discount on everything** in the mock (11% artificial markup) — don't read that as a bug.
- **New-badge tests** assume `mockProduct` has **no `calculated_price`** (so it's "not discounted"); `getProductDiscountPercent` needs `calculated_price`. Add a discounted fixture (spread `mockProduct`, give `variants[0].calculated_price`) when testing sale UI.
- **Checkout payment flow** (already implemented — read before touching): M-Pesa Express → `pp_mpesa_mpesa` with `data.mpesa_phone`; a **15s cart/complete poke** (Daraja rate limit) that can itself place the order via `applyOrderPlaced`; a captured-status effect; canceled/failed surfaced from `session.data.status`; STK slow(≥60s)/timeout(≥90s) copy; a **popstate guard** that traps Back to the Review step while pending. Touching `checkout/page.tsx` or `medusa-api.ts` is a red-flag area — keep the flow intact.
- **Two PDP entry points** — in-place modal (`products/page.tsx`) and full page (`/products/[id]`). Verify both.
- The plan doc's §5 token table still lists the **old** `--primary #c24d79`; the **shipped** value is **`#d6336c`** (raspberry, chosen from A/B/C swatches).

---

## 6. PR hygiene (matches the `/ship-pr` flow)
1. Branch off `main`; commit conventionally.
2. `npm run typecheck && npm run lint && npm test` — all green.
3. Open PR; **post a self-review** auditing the diff against §2 conventions; list out-of-scope/deferred items.
4. Flag any touch of red-flag files (`lib/medusa-api.ts`, `lib/http.ts`, `next.config.ts`, `app/account/*`).
5. Squash-merge; sync `main`; prune.

Each item above is sized to **one PR**. Start with **E14 → E15 → E16** (the PDP) for the biggest conversion lift.
