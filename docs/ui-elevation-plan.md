# Azani Storefront — UI/UX Elevation Plan & Build Prompt

**Date:** 2026-05-29
**Scope:** Whole storefront — look & feel, brand expression, navigation, product discovery, PDP, cart/checkout, responsiveness, accessibility.
**Method:** Heuristic competitive evaluation + code audit + live visual preview (desktop 1440px & mobile 390px against the bundled mock Medusa server). Frameworks applied: `user-research`, `design-critique`, `accessibility-review`, `design-handoff`.
**References:** [peekaboo.ke](https://www.peekaboo.ke/) (direct KE baby competitor), [kiabi.sa /baby](https://kiabi.sa/collections/unv1000005-baby) (international fashion retailer, baby collection).

> ⚠️ This is an expert heuristic review, **not** primary user research. Before/after launch, validate with 5–8 moderated usability sessions (task: "find and buy newborn diapers for delivery in Nairobi") and a card sort to confirm the category IA. See §8.

---

## 1. Who we're designing for (user-research lens)

| Dimension | Working assumption (validate) |
|---|---|
| Primary user | Kenyan parents & expecting parents (skew mothers 25–40); secondary: gift-buyers (relatives, baby showers) |
| Jobs-to-be-done | "Quickly find safe, age-appropriate baby products and get them delivered fast & cheaply, paying with M-Pesa" |
| Device | **Mobile-first** (majority of KE e-commerce traffic is Android phones on variable connections) |
| Top anxieties | Is it **safe/authentic**? Will delivery be **fast & affordable**? Can I pay with **M-Pesa**? Can I return it? |
| Decision drivers | Price/discount clarity, trust signals, social proof (reviews), delivery cost & speed |

**Implication:** the experience must lead with trust + value + fast discovery, be flawless on a 390px screen, and make M-Pesa/delivery reassurance impossible to miss.

---

## 2. Competitive reference — what they do that we don't

| Pattern | Peekaboo.ke | Kiabi.sa | Azani today |
|---|---|---|---|
| Announcement/utility bar | Hours + **"app → 10% off"** + offers | **"24/7 • Free delivery over 199 SAR"** | 2 static signals only |
| Hero | Full-width lifestyle/promo carousel | Promo + clear collection entry | Overlapping product-card carousel (image-dependent, truncates) |
| Filtering | Deep mega-menu IA | **Availability, Gender, Price, Color ×17, Size, Type ×40 + Sort** | **Category tree only — no sort, price, age, brand** |
| Product card | Image, **age-range**, strike-through + sale price, Add to Cart | Dual-image hover, **color count**, New badge, wishlist | Image, stock, price + strike, "＋" icon; no ratings/age/swatches |
| Promotions | Sale 💥, PAYDAY, up to 50% off | Outlet 70%, "Buy 2 for X" | Generic "New" badge on nearly everything |
| Trust/footer | Policies, social | **Payment logos, returns, size guides, store locator** | Footer present but **Shipping/Returns/Privacy disabled** |
| Brand color use | Strong coral identity | Navy + red accents | **Brand pink barely used — chrome & CTAs read near-black** |

---

## 3. Current-state critique (`design-critique`)

### Overall impression
Clean, modern, competently built Tailwind storefront with a coherent pastel system and good micro-interactions — but it **under-uses its own brand** (the berry-pink `--primary` is nearly absent; CTAs are near-black), the **hero/product-discovery layer is thin** versus competitors, and there are **trust-eroding inconsistencies** (free-shipping threshold differs between pages; dead footer links).

### Usability
| Finding | Severity | Recommendation |
|---|---|---|
| Free-shipping threshold contradicts itself: header/home/checkout say **KSh5,000**, cart computes against **KSh10,000** ("Add KSh8,110…") | 🔴 Critical | Single source of truth constant; reuse everywhere |
| Product filtering is **category-only** — no sort, price, age/stage, or in-stock filter | 🔴 Critical | Add sort + faceted filters (price, age/stage, availability, brand) |
| Footer "Shipping Info / Returns / Privacy" are **disabled placeholders** | 🟡 Major | Ship real policy pages (also a trust/legal need) |
| Hero carousel is an unconventional overlapping-card widget; on mobile it sits **above** the value prop and shows empty/cropped cards with **truncated** titles/prices ("KSh1,750.0") | 🟡 Major | Replace with a real hero (lifestyle/promo + clear CTAs); copy-first on mobile |
| PDP is sparse: no breadcrumbs, **no reviews**, no delivery/returns reassurance, no related products; large empty right column; **omits the strike-through original price** the listing shows | 🟡 Major | Enrich PDP (see E13–E16) |
| Mobile menu renders **all categories + subs expanded** → very long scroll | 🟡 Major | Collapsible accordion |
| "NEW" badge appears on almost every card → loses signal | 🟢 Minor | Reserve for genuinely recent; add Sale/Bestseller badges |
| Floating WhatsApp overlaps menu/CTAs on mobile | 🟢 Minor | Offset, respect safe-area, lower z vs. overlays |

### Visual hierarchy
- **Draws the eye first (desktop):** the hero product-card stack — but it's the weakest, most ambiguous element. The headline should lead.
- **Brand presence:** `--primary` #c24d79 appears only in the "Trusted by…" pill and the "Little One" accent. Every primary action (Shop Now, Add to Cart, Proceed to Checkout, "＋") is `--foreground` near-black → the storefront reads monochrome/generic, not "Azani."
- **Type:** DM Sans display headings are good; body Geist is fine. Scale is a touch flat — hero aside, section headings (`text-xl/2xl`) don't command enough.

### Consistency
| Element | Issue | Fix |
|---|---|---|
| Free-shipping threshold | 5,000 vs 10,000 across pages | One constant |
| Price block | Listing shows original strike-through; PDP doesn't | Same price component on card + PDP |
| Category icon colors | Hardcoded `text-orange-500` etc. (not tokens) | Tokenize accent palette |
| WhatsApp color | Hardcoded `#25D366` | Token (brand-whatsapp) |
| `country_code` default | "et" in one place, "ke" in another | Default "ke" everywhere |
| Inputs | Multiple ad-hoc `INPUT_CLASS` definitions | Shared `<Input/>` / class |

### What works well
- Coherent pastel token system, soft shadows, consistent `rounded-2xl`.
- Solid micro-states: add-to-cart flash, skeletons, empty/error states, toasts.
- Sensible component architecture (React Query, isolated components) — **a great base to elevate, not rebuild.**
- Thoughtful touches: cart free-shipping progress bar, password strength meter, order timeline.

### Priority recommendations
1. **Make the brand visible** — promote `--primary` to the primary action color; reserve near-black for text/secondary.
2. **Rebuild discovery** — real hero + sort & faceted filters + richer product cards.
3. **Fix trust** — one shipping threshold, real policy pages, payment/trust signals, reviews.

---

## 4. Accessibility audit (`accessibility-review`, WCAG 2.1 AA)

| # | Issue | Criterion | Severity | Fix |
|---|---|---|---|---|
| 1 | Touch targets below 44px: header icon buttons `h-9 w-9` (36px), card "＋" `h-8 w-8` (32px), qty steppers | 2.5.5 | 🟡 Major | Min 44×44 interactive area (pad hit-area if visual stays small) |
| 2 | Placeholder/`muted-light` `#a79ba7` on white ≈ **2.6:1** | 1.4.3 | 🟡 Major | Use `--muted` `#6f6571` (≈5.5:1) for any meaningful text |
| 3 | White text on `--primary` `#c24d79` ≈ **4.54:1** — passes but tight; fails for large-but-thin or if lightened | 1.4.3 | 🟡 Major | Use `--primary-hover` `#aa3f69` for text-bearing fills to buy headroom |
| 4 | Desktop nav category links & some icon buttons lack a visible **focus ring** (hover-bg only) | 2.4.7 | 🟡 Major | Add `focus-visible:ring` to all interactive elements |
| 5 | Hero carousel auto-advances every 5s; non-center cards `aria-hidden` but rotation has no pause/stop control surfaced | 2.2.2 | 🟡 Major | Provide pause; respect `prefers-reduced-motion` (already partly done) |
| 6 | Home tabs use `role="tablist"`/`tab` without `tabpanel`/`aria-controls` wiring | 4.1.2 | 🟢 Minor | Complete ARIA tab pattern or use plain buttons |
| 7 | Decorative hero underline SVG not `aria-hidden` | 1.1.1 | 🟢 Minor | `aria-hidden="true"` on decorative SVGs |
| 8 | Cart qty `<input>` relies on visual context, no programmatic label | 3.3.2 | 🟢 Minor | `aria-label="Quantity"` |

**Passing:** body/muted text contrast (~5.5:1), "NEW" badge (~9.9:1), most `focus-visible` rings, alt text on product images, reduced-motion guard on hero animations.

---

## 5. Target visual direction (`design-handoff` tokens)

Keep the stack (Next 16 / React 19 / Tailwind v4 `@theme` in `globals.css`) and the pastel DNA. **Change application, not foundation.**

### Color — promote the brand
| Token | Today | Target use |
|---|---|---|
| `--primary` #c24d79 | badges/accent only | **Primary CTAs** (Shop Now, Add to Cart, Proceed to Checkout), active nav, links-on-hover |
| `--primary-hover` #aa3f69 | hover only | Text-bearing pink fills (contrast headroom), hover |
| `--foreground` #342a33 | all CTAs | **Text + secondary/ghost buttons only** |
| `--secondary` #267cb8 | some CTAs | Informational accents, progress, "New Arrivals" |
| accent yellow/green | promos/status | Keep; **tokenize** the category-icon colors (replace hardcoded `text-orange-500`…) |
| `--brand-whatsapp` `#25D366` | inline literal | New token |

### Type — sharpen hierarchy
- Display (DM Sans): hero `clamp(2.5rem, 6vw, 4rem)`; keep tight tracking. Section H2 → `text-2xl/3xl font-bold`.
- Add a `--text-2xl/3xl` rhythm and consistent section spacing (`py-12 lg:py-16`).

### Components
- **Buttons:** `primary` (pink), `secondary` (blue), `ghost` (foreground/transparent), `danger`. One `<Button>` with size/variant; min-height 44px.
- **Product card:** image (with skeleton + graceful no-image), badge slot (New **or** Sale **or** Bestseller — one), title (2-line clamp), **rating + count**, optional **age/stage chip**, optional **color swatches**, price block (shared with PDP), **labelled Add-to-Cart** (icon+text on ≥sm). Wishlist visible on mobile, hover/focus on desktop (already so) — ensure focus reveals it.
- **Header:** richer utility bar (delivery threshold • M-Pesa • support hours), bolder/higher-contrast nav, search more prominent (consider always-visible field on desktop), 44px targets.
- **PDP:** breadcrumbs · gallery · price (with original) · trust row (delivery estimate to Nairobi, returns, M-Pesa) · variant selector with **availability per option** · qty · Add to Cart (pink) · accordion (description/specs/delivery) · ratings/reviews · related products.

---

## 6. The itemised elevation journey

Phased so each phase ships independently and de-risks the next. **Effort:** S < 0.5d · M ~1–2d · L ~3d+. **Impact:** H/M/L.

### Phase 0 — Foundations & quick trust fixes *(do first; unblocks everything)*
| # | Item | Why | Where | Effort | Impact |
|---|---|---|---|---|---|
| E1 | Single free-shipping constant; reuse on home, header, cart, checkout | Kills the 5k-vs-10k contradiction | `lib/site-config.ts`, `cart/page.tsx`, `checkout/page.tsx`, `page.tsx` | S | H |
| E2 | Tokenize colors: category-icon palette + `--brand-whatsapp`; remove hardcoded `text-orange-500`, `#25D366` | Theming, consistency | `globals.css`, `category-icon.tsx`, `floating-whatsapp.tsx` | S | M |
| E3 | Ship real policy pages (Shipping, Returns, Privacy, FAQ) and link footer | Trust + legal; remove dead links | `app/(content)/…`, `site-footer.tsx` | M | H |
| E4 | Default `country_code` → "ke" everywhere | Correctness | checkout/account address forms | S | M |
| E5 | Shared `<Button>` + `<Input>` primitives (variant/size, 44px min) | Consistency + a11y base | `components/ui/*` | M | M |

### Phase 1 — Brand expression *(the "dramatic" visual lift)*
| # | Item | Why | Where | Effort | Impact |
|---|---|---|---|---|---|
| E6 | Promote `--primary` to primary CTA color; near-black → text/secondary only | Makes it feel like *Azani*, not generic | global button usage, `product-card.tsx`, `page.tsx`, cart/checkout | M | H |
| E7 | Sharpen type scale & section rhythm (hero clamp, bolder H2s, consistent vertical spacing) | Hierarchy & polish | `globals.css`, section components | M | M |
| E8 | Richer utility/announcement bar (delivery threshold • M-Pesa accepted • support hours), with optional dismissible promo strip | Match competitors; lead with value | `site-header.tsx` | S | M |

### Phase 2 — Home & hero
| # | Item | Why | Where | Effort | Impact |
|---|---|---|---|---|---|
| E9 | Replace overlapping-card carousel with a real hero: lifestyle/promo visual + headline + dual CTA; **copy-first on mobile**; fix text truncation | Strong first impression; not image-fragile | `page.tsx` (`HeroCarousel`) | L | H |
| E10 | Add a merchandised promo row + "Shop by stage/age" entry + social-proof band (reviews, as data allows) | Discovery + trust | `page.tsx` | M | M |

### Phase 3 — Product discovery
| # | Item | Why | Where | Effort | Impact |
|---|---|---|---|---|---|
| E11 | Add **Sort** (featured, price ↑/↓, newest) + results/sort bar | Table-stakes discovery | `products/page.tsx`, `medusa-api.ts` | M | H |
| E12 | Faceted filters: price range, age/stage, availability (in-stock), brand | Competitors all have this | `filter-sidebar.tsx`, `products/page.tsx` | L | H |
| E13 | Richer product card: rating+count, age/stage chip, color swatches, **labelled** Add-to-Cart, single meaningful badge | Conversion + parity | `product-card.tsx` | M | H |

### Phase 4 — Product detail
| # | Item | Why | Where | Effort | Impact |
|---|---|---|---|---|---|
| E14 | Breadcrumbs + per-option availability (disable/mark sold-out variants) | Orientation + fewer dead ends | `product-detail.tsx` | M | M |
| E15 | Buy-box trust row: delivery estimate to Nairobi, returns, M-Pesa; show original/strike price (match card) | Reassurance + consistency | `product-detail.tsx` | M | H |
| E16 | Reviews/ratings + "You may also like" (related) + spec/description accordion | Social proof + cross-sell + fills empty column | `product-detail.tsx` | L | H |

### Phase 5 — Cart & checkout
| # | Item | Why | Where | Effort | Impact |
|---|---|---|---|---|---|
| E17 | Cart cross-sell ("Add these too") + clearer M-Pesa/delivery summary | AOV + reassurance | `cart/page.tsx` | M | M |
| E18 | Mobile checkout stepper legibility; numeric qty input hardening; per-step validation copy | Fewer drop-offs | `checkout/page.tsx`, `cart/page.tsx` | M | M |
| E19 | Payment/trust logos (M-Pesa, Visa/Mastercard) in footer + checkout | Trust at point of payment | `site-footer.tsx`, `checkout/page.tsx` | S | M |

### Phase 6 — Navigation & responsiveness
| # | Item | Why | Where | Effort | Impact |
|---|---|---|---|---|---|
| E20 | Mobile nav → collapsible accordion (collapsed by default, expand on tap) | Long-scroll fix | `site-header.tsx` | M | M |
| E21 | Floating WhatsApp: offset from CTAs, respect `safe-area-inset`, lower z below overlays/toasts | Avoid occlusion | `floating-whatsapp.tsx`, `toast.tsx` | S | M |

### Phase 7 — Accessibility & motion polish
| # | Item | Why | Where | Effort | Impact |
|---|---|---|---|---|---|
| E22 | 44px targets, focus-visible on all interactive els, fix `muted-light` text, complete tab ARIA, `aria-hidden` decorative SVGs, hero pause control | WCAG 2.1 AA | global | M | H |
| E23 | Tasteful motion: card hover lift, image zoom (have it), staggered reveal, button press — all `prefers-reduced-motion`-guarded | Premium feel | `globals.css`, components | S | M |

---

## 7. The refined build prompt

> Paste into a fresh Claude Code session **on this repo**. Execute phase-by-phase, opening a PR per phase. It assumes the bundled mock server for visual verification.

```text
ROLE: Senior product designer + front-end engineer elevating the Azani storefront
(Next.js 16 App Router, React 19, Tailwind v4 with @theme in src/app/globals.css,
TanStack Query, Medusa v2). Kenya-only: KES "KSh", +254, M-Pesa, Nairobi delivery.

GOAL: Dramatically elevate look & feel, brand expression, usability, responsiveness,
and navigation — to match/beat peekaboo.ke and kiabi.sa/baby — WITHOUT a rewrite.
Keep the existing stack, component architecture, and pastel token DNA. Change how
the system is APPLIED, and add the missing discovery/trust layers.

NON-NEGOTIABLE CONSTRAINTS:
- Mobile-first (design & verify at 390px before desktop). Audience: Kenyan parents on Android.
- WCAG 2.1 AA: ≥44px touch targets, focus-visible on every interactive element,
  text contrast ≥4.5:1, respect prefers-reduced-motion.
- All colors/spacing via tokens in globals.css — no hardcoded hex or one-off Tailwind colors.
- Don't break existing tests; add tests for new logic. Run typecheck + lint + vitest before each PR.
- Verify every visual change in the preview (mock server: `npm run mock:medusa`; .env.local →
  NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000) at 390px AND 1440px. Screenshot proof.

DESIGN DIRECTION:
- Make the brand visible: promote --primary (#c24d79; use --primary-hover #aa3f69 for
  text-bearing fills for contrast headroom) to THE primary action color (Shop Now, Add to
  Cart, Proceed to Checkout, active nav). Demote near-black --foreground to text + secondary/
  ghost buttons. Keep --secondary blue for info/accents.
- Sharpen hierarchy: fluid hero headline (DM Sans, clamp), bolder section H2s, consistent
  section spacing. Soft shadows + rounded-2xl stay.
- Lead with trust + value (delivery threshold, M-Pesa, returns, reviews) — like the competitors.

EXECUTE IN PHASES (one PR each; stop after each for review):

PHASE 0 — Foundations & trust fixes
- Single free-shipping threshold constant in lib/site-config.ts; reuse in home, header trust
  bar, cart progress bar, checkout (currently 5,000 vs 10,000 — make them agree).
- Tokenize the category-icon color palette and the WhatsApp green (#25D366) into globals.css;
  remove hardcoded text-orange-500 etc. and the inline hex.
- Default address country_code to "ke" everywhere.
- Add shared <Button> (variants: primary/secondary/ghost/danger; sizes; min-h-11) and <Input>
  primitives; refactor existing ad-hoc usages.
- Create real content pages (Shipping, Returns, Privacy, FAQ) and wire the footer links
  (remove the disabled placeholders).

PHASE 1 — Brand expression
- Apply the new button variants site-wide (primary = pink). Audit every CTA.
- Implement the type scale + section rhythm.
- Upgrade the utility/announcement bar: delivery threshold • M-Pesa accepted • support hours,
  with an optional dismissible promo strip.

PHASE 2 — Home & hero
- Replace the overlapping-card HeroCarousel with a real hero: strong headline + subcopy +
  dual CTA + a lifestyle/promo visual (graceful fallback when images are missing). Copy-first
  stacking on mobile. Fix the title/price truncation. Keep autoplay optional + pausable +
  reduced-motion safe.
- Add a merchandised promo row, a "Shop by stage/age" entry, and a social-proof/reviews band.

PHASE 3 — Product discovery
- Add Sort (featured, price asc/desc, newest) and a results+sort bar on /products.
- Add faceted filters: price range, age/stage, in-stock availability, brand (wire to
  medusa-api query params; keep category tree).
- Enrich ProductCard: rating + count, age/stage chip, color swatches (when variants have
  color), a single meaningful badge (New OR Sale OR Bestseller), and a LABELLED Add-to-Cart
  (icon+text ≥sm). Share the price component with the PDP.

PHASE 4 — Product detail
- Add breadcrumbs; disable/mark sold-out variant options; show original/strike price
  (match the card). Add a buy-box trust row (delivery estimate to Nairobi, returns, M-Pesa).
- Add ratings/reviews, a description/specs/delivery accordion, and a "You may also like"
  related-products row (fills the empty right column).

PHASE 5 — Cart & checkout
- Cart cross-sell + clearer M-Pesa/delivery summary; harden numeric qty input.
- Improve mobile checkout stepper legibility and per-step validation copy.
- Add payment/trust logos (M-Pesa, Visa, Mastercard) to footer + checkout.

PHASE 6 — Navigation & responsiveness
- Mobile nav → collapsible accordion (collapsed by default).
- Reposition floating WhatsApp: offset from CTAs, respect safe-area-inset, z-index below
  overlays/toasts.

PHASE 7 — Accessibility & motion polish
- Enforce 44px targets and focus-visible everywhere; replace muted-light meaningful text;
  complete the tab ARIA pattern; aria-hidden decorative SVGs; add hero pause control.
- Add tasteful, reduced-motion-guarded motion (card hover lift, staggered reveals, button press).

ACCEPTANCE PER PHASE:
- Screenshots at 390px and 1440px showing before→after.
- No console errors / failed requests in preview.
- typecheck + lint + vitest green.
- A short note on which competitor pattern each change closes the gap on.

DELIVER: a brief changelog per PR mapping changes to items E1–E23 in docs/ui-elevation-plan.md.
```

---

## Build log

**2026-05-29 — Phase 0 (trust fixes) + Phase 1 (brand color)**

- **E1 ✅** Free-shipping single source of truth — new tested `lib/shipping.ts` (`FREE_SHIPPING_THRESHOLD` + `qualifiesForFreeShipping`/`freeShippingRemaining`/`freeShippingProgress`/label helpers), value in `site-config.ts`. Wired header trust bar, home, cart progress bar (was the 10,000 bug), checkout (×4). 13 new unit tests (TDD).
- **E4 ✅** Address `country_code` default `"et"` → `"ke"` (account, ×2).
- **E6 ✅** Brand-color rollout — `--primary` set to **Raspberry `#d6336c`** (chosen from A/B/C swatches). Promoted the brand token to ~20 primary CTAs across home, products, PDP, cart, checkout, login, account, verify, reset-password, wishlist, error, google-callback (previously near-black `--foreground`). Header Cart button, active toggles/pagination, count badges and the avatar intentionally kept neutral.
- **E8 ✅** Announcement bar enriched — added **"Pay with M-Pesa"** (Smartphone icon) alongside the delivery promise and "Safe & certified products". (Support hours / dismissible promo strip deferred — need real business content.)
- **E7 ✅** Typography — hero headline now fluid `clamp(2.25rem, 6vw, 4rem)`; home section H2s bumped to `text-2xl sm:text-3xl` for stronger hierarchy. (Promo H3s left smaller to preserve heading hierarchy; full section-spacing rhythm deferred.)
- **E2 ✅** Tokenized the WhatsApp brand green into `--whatsapp` / `--color-whatsapp` (removed the hardcoded `#25D366` ×4 in `floating-whatsapp.tsx`). Category-icon palette deliberately kept on Tailwind's design-system colors — the variety aids scannability.
- **Gates:** typecheck ✅ · lint ✅ · 255/255 tests ✅ · visually verified (hero, products grid, cart threshold, trust bar) at 1280–1360px.
- **E5 ✅ (primitive + initial adoption)** Added `src/components/ui/button.tsx` — `buttonVariants({variant,size,fullWidth,className})` + `<Button>` (10 TDD tests). Touch-target height now lives in one place (ready to bump to 44px AA in E22). Migrated 7 CTAs (products empty-state, wishlist ×2, login ×4 incl. the full-width submit) off duplicated class strings onto `buttonVariants()`. Remaining CTAs (verify/reset-password/error/google-callback + in-flow hero/card/PDP/cart/checkout) still use inline token classes — **mechanical follow-up**, no visual inconsistency since the helper reproduces the same look. `<Input>` primitive still pending.
- **Phase 1 COMPLETE** (E6 + E7 + E8). **Phase 0:** E1 ✅ E2 ✅ E4 ✅ E5 ✅(primitive) — only **E3** (policy pages — needs real business copy) outstanding.
- **Gate after E5:** typecheck ✅ · lint ✅ · 265/265 tests ✅ · login submit verified in preview.
- **Pending next:** **Phase 2 — hero rebuild (E9/E10)** is the next high-visibility step. Also outstanding: finish E5 CTA migration (mechanical), `<Input>` primitive, E3 (blocked on business copy). Nothing committed yet.

## Branch reconciliation — keeping `develop`'s checkout functionality on our UI

`develop` has diverged from `main` (our base) in three ways: (1) a full **HeroUI UI migration** — incompatible with the Tailwind UI we're elevating, so we do **not** take it; (2) substantial **M-Pesa checkout functionality**; (3) **policy/contact pages** (`src/lib/store-info-pages.ts` — real copy that satisfies **E3**). Goal: keep (2) and optionally (3) **without** importing (1).

**Phase A — UI-agnostic functional layer ✅ (ported, gate green @265 tests)**
- `src/lib/medusa-api.ts`: completed-cart detection in `getCart`/`getOrCreateCart` (drops a stale completed cart → fixes "stuck on a finished cart"); `initializePaymentSession({ providerId, data })` so M-Pesa Express can route to `pp_mpesa_mpesa` with the payer phone (backward-compatible — defaults to `pp_system_default`).
- `src/types/medusa.ts`: `MedusaCart.completed_at`; payment-session `data.{status,resultDesc}` (the canceled/failed signal).

**Phase B — checkout component behaviors ✅ (ported onto our Tailwind checkout; gate green @269 tests):**
From develop's `feat/fix` commits, all currently living in its HeroUI `checkout/page.tsx`; must be re-applied onto **our** Tailwind checkout:
1. Route M-Pesa Express to `pp_mpesa_mpesa` with `data.mpesa_phone` (uses the Phase-A hook).
2. Bound the STK-Push wait with **timeout UX**.
3. Surface **canceled / failed** M-Pesa outcomes (from `payment_session.data.status`).
4. **15s** cart/complete poke interval (Daraja rate limit); react when the poke itself places the order.
5. Paybill number from **env**; use order **`display_id`** as the Paybill account number.
6. Cart: discard a stored cart once completed (largely covered by Phase A's `getCart`).
> These are interdependent (routing to `pp_mpesa_mpesa` requires the cancel/fail/timeout/poke handling), so port as one cohesive change with its own verification against the mock STK flow.

**Phase B done (2026-05-29):** all six behaviors re-implemented in our Tailwind checkout — provider routing (with a new regression test asserting `pp_mpesa_mpesa` + payer phone), 15s poke that also finalizes when it completes the order, captured-status finalize (pre-existing), canceled/failed outcome screen, slow(≥60s)/timeout(≥90s) escalation with an elapsed counter, Paybill from `NEXT_PUBLIC_AZANI_PAYBILL_NUMBER` + `display_id` account no. Verified: typecheck · lint · **269 tests** (5 checkout + 3 new discount) · clean checkout load (no console errors). **Caveat:** provider-side `data.status` (canceled/failed) and capture are driven by the real Daraja backend — the local mock doesn't simulate them, so validate those terminal states against `azani-api` in staging.

**Also pulled:** `getProductDiscountPercent()` (+3 tests) and `.env.example` Paybill entry.

**E3 — policy & contact pages ✅** Brought develop's `store-info-pages.ts` content (real shipping/returns/privacy/terms + contact copy, already referencing KSh5,000) + its thin route pages (`/policies/{shipping,returns,privacy,terms}`, `/contact`) verbatim, but wrote our **own Tailwind `StoreInfoPage` renderer** (breadcrumb, raspberry eyebrow, quick-fact cards, bullet sections, contact-method cards) instead of develop's HeroUI one. Footer's dead Shipping/Returns/Privacy placeholders replaced with real links + Terms + Contact. Content test brought (2 tests). Verified: 271 tests · typecheck · lint · shipping policy page renders on-brand at 1280px. This closes the only E3 blocker (no invented policy terms — it's develop's real copy).

**Also available to pull from develop (non-checkout, optional):** `getProductDiscountPercent()` helper (`formatters.ts`) for E13 richer cards; `store-info-pages.ts` policy copy for **E3**.

## 8. Validation & success metrics

- **Pre-build:** 5–8 moderated mobile usability tests (find→buy newborn diapers, pay M-Pesa); open card sort (15–30 ppl) to confirm category IA.
- **Instrument:** funnel (home→PLP→PDP→cart→purchase), filter/sort usage, search usage, mobile vs desktop conversion, add-to-cart rate, WhatsApp clicks.
- **Targets:** ↑ PDP→cart rate, ↑ filter adoption, ↓ mobile bounce on home, ↑ mobile conversion, 0 AA violations in axe scan.
- **Re-test** the same tasks post-Phase 3 and post-Phase 5.
