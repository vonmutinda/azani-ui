# PDP image gallery + multi-subcategory filtering — design

> Approved 2026-05-30. Two independent features, shipped as **two PRs** (gallery first).
> Continues the storefront elevation (PDP work E14–E16 already merged: #49/#50/#51).

## Context

- **Gallery reference:** the `develop` branch has a richer PDP gallery (larger `object-contain` image, prev/next arrows, an `N / M` counter, per-image loading skeletons + error fallbacks, a thumbnail strip). **`develop` is a different design system (HeroUI — `Button`/`onPress`/`isIconOnly`, `Card`, `az-*` classes, `bg-product-media`).** So we **port the UX pattern into `main`'s conventions** (Tailwind tokens, `lucide`, plain `<button>`s) — not a code copy. `develop`'s thumbnails sit *below* the image; we want a **vertical left rail on desktop**.
- **Filter today:** `src/components/filter-sidebar.tsx` renders a recursive category **tree** but selection is **single-select** (`onSelect` sets one `category` handle). `src/app/products/page.tsx` resolves that handle → category + descendant IDs (`collectCategoryIds`) → `getProducts({ category_id: [...] })` — i.e. category filtering is already **server-side**, and `getProducts` accepts a `category_id` **array** (OR). The gap is purely the single-value UI/URL.

---

## Feature 1 — `ProductGallery`

Extract the gallery from `product-detail.tsx` (already ~560 lines) into a focused, testable unit.

**Component:** `src/components/product-gallery.tsx`
```
<ProductGallery thumbnail={product.thumbnail} images={product.images} title={product.title} />
```
It owns the unique-image list, active index, and load/error state. `product-detail.tsx` drops its inline images block and the `allImages` computation.

**Layout (single markup, responsive via flex `order`):**
- **Desktop (lg+):** vertical thumbnail rail (~72px, left, `lg:flex-col`, vertical scroll) + large main "stage" (right, `flex-1`), image `object-contain` on a subtle surface so the whole product shows.
- **Mobile:** stage on top, horizontal thumbnail strip below (`flex-row`, `overflow-x-auto`, `hide-scrollbar`).

**Browsing affordances (ported from develop):**
- Prev/next arrow buttons overlaying the stage, **wrap-around**, rendered only when `images.length > 1`; `lucide` `ChevronLeft`/`ChevronRight`; `aria-label` "Show previous/next image".
- `N / M` counter overlay (bottom-right).
- Active thumbnail: `border-foreground` + `aria-current="true"`; others `border-border/50`.
- Per-image **loading skeleton** (`animate-pulse` overlay until `onLoad`) and **error fallback** (`ShoppingBag` when a url is in the failed set / `onError`).
- Active index **resets when the product changes** via a React `key={product.id}` at the call site (remounts the gallery → fresh `activeIndex`/state). This keeps the component's own logic to de-dup + wrap only — no product-id-tracking state.

**A11y:** arrows + thumbnails are real `<button>`s with `focus-visible:ring-2`; main image keeps `alt={title}` (existing `getByAltText` test stays green); decorative SVGs `aria-hidden`. Thumbnails ≥44px tappable.

**Logic to TDD:** unique-image de-dup (thumbnail + images, drop falsy/dupes), active-index **wrap-around** (`(i + n) % n`), reset-on-product-change.

**Tests** (`product-gallery.test.tsx`, role/label queries): multi-image → rail + N/M render; click a thumbnail → active image `src`/position changes; next from last → first (wrap); single image → no rail/arrows/counter; failed url → fallback icon. Keep `product-detail.test.tsx` green.

---

## Feature 2 — Multi-subcategory filtering

**URL/state:** `category` becomes **multi-value, comma-joined** (`?category=bottles,weaning`). A parent handle still resolves to its whole subtree server-side, so checking a parent includes its children automatically (no need to also store the children).

**Sidebar (`filter-sidebar.tsx`):** tree rows become **checkboxes** (multi-select) instead of single-select buttons. Each toggles its handle in the selected set; any number across the tree may be checked; expand/collapse chevrons stay. "Clear all" clears the category set (plus the other facets, as today). "All Categories" = none selected.

**Data flow (`products/page.tsx`):**
- Parse `filters.category` → `string[]` of handles.
- Resolve handles → **union of subtree IDs** from the already-loaded `categories` tree (no per-handle fetch), dedup → `getProducts({ category_id: ids })` (server-side OR).
- Header: show the single selected category's name/description when exactly one handle is selected; otherwise "All Products". The "subcategory browser" chips remain meaningful only for the single-selection case (degrade gracefully otherwise).

**Pure logic → `@/lib/categories` (TDD'd):**
- `parseCategoryParam(value?) → string[]` and `serializeCategoryParam(handles) → string | undefined` (undefined when empty, so the key clears).
- `resolveCategoryIds(categories, handles) → string[]` — union of each handle's subtree IDs, deduped, `[]` when a handle is unknown.

**Tests:** lib parse/serialize + resolve (incl. parent→subtree union, dedup, unknown handle); `filter-sidebar.test.tsx` checkbox toggle + multi-select + clear; light `products` wiring (selecting two subcats → `getProducts` called with both IDs). Existing single-select assertions migrate to checkbox/`getByRole("checkbox")` queries.

---

## Delivery & scope

- **Two PRs**, gallery first. Each: TDD where there's logic, `typecheck`/`lint`/`test` green, browser-verify (both PDP entry points / the listing on :3000), self-review against conventions, squash-merge, sync.
- **Conventions:** Tailwind tokens (no hex), `lucide` + `aria-hidden` on decorative SVGs, `aria-label` on icon-only controls, `focus-visible:ring-2`, ≥44px targets, Medusa only via `@/lib/medusa-api`, money via `@/lib/formatters`.

**Out of scope (noted, not built here):** keyboard ←/→ on the gallery stage (nice-to-have; buttons already keyboard-accessible), pinch/zoom, indeterminate "parent partially selected" checkbox state (relying on server-side subtree inclusion instead), and the client-side pagination limitation for the other facets (E12 follow-up). Touch-target/contrast global pass remains E22; motion remains E23.
