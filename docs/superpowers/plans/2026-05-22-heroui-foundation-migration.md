# HeroUI Foundation Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt HeroUI v3 as Azani UI's shopper-facing component foundation without redesigning checkout, account, or the full storefront.

**Architecture:** Add HeroUI's package and CSS first, then map existing Azani tokens into HeroUI semantic variables so the brand stays intact. Migrate only repeated low-risk primitives in the first slice: toasts, product cards, filters, product-list chips, empty states, and pagination.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, `@heroui/react`, `@heroui/styles`, React Query, Vitest, Testing Library.

---

## File Structure

- Modify: `package.json` and `package-lock.json` for HeroUI dependencies.
- Modify: `src/app/globals.css` for `@heroui/styles` import and token mapping.
- Modify: `src/components/toast.tsx` to preserve the existing `useToast().showToast(message, type)` API while rendering with HeroUI Toast.
- Modify: `src/components/product-card.tsx` to use HeroUI `Card`, `Button`, and `Chip`.
- Modify: `src/components/filter-sidebar.tsx` to use HeroUI `Button`, `Chip`, and `Drawer` for mobile filters.
- Modify: `src/app/products/page.tsx` to use HeroUI controls for active filters, empty state action, and pagination.
- Modify tests under `src/__tests__/components` and `src/__tests__/pages/products.test.tsx` only where DOM details change while behavior stays the same.

## Task 1: Install HeroUI And Map Azani Theme

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Install HeroUI v3 packages**

Run:

```bash
npm install @heroui/react @heroui/styles
```

Expected: `package.json` gains `@heroui/react` and `@heroui/styles`; `package-lock.json` updates.

- [ ] **Step 2: Import HeroUI styles after Tailwind**

In `src/app/globals.css`, change the first lines to:

```css
@import "tailwindcss";
@import "@heroui/styles";
```

Expected: Tailwind remains first; HeroUI styles load before local token overrides.

- [ ] **Step 3: Extend `:root` with HeroUI semantic tokens**

In `src/app/globals.css`, keep the existing Azani tokens and add these variables inside `:root` after `--danger`:

```css
  --surface: var(--card);
  --surface-foreground: var(--foreground);
  --surface-secondary: #fff7fb;
  --surface-secondary-foreground: var(--foreground);
  --surface-tertiary: #edf7ff;
  --surface-tertiary-foreground: var(--foreground);
  --overlay: #ffffff;
  --overlay-foreground: var(--foreground);
  --default: #f5eef4;
  --default-foreground: var(--foreground);
  --accent: var(--primary);
  --accent-foreground: #ffffff;
  --warning: var(--accent-yellow);
  --warning-foreground: var(--accent-yellow-ink);
  --danger-foreground: #ffffff;
  --separator: var(--border);
  --focus: var(--primary);
  --link: var(--secondary);
  --backdrop: rgba(52, 42, 51, 0.42);
  --field-background: #ffffff;
  --field-foreground: var(--foreground);
  --field-placeholder: var(--muted);
  --field-border: var(--border);
  --field-border-width: 1px;
  --field-radius: var(--radius);
```

Expected: Existing `bg-card`, `text-primary`, and other Tailwind aliases still work while HeroUI components receive matching semantic variables.

- [ ] **Step 4: Add HeroUI token aliases to `@theme inline`**

In `src/app/globals.css`, add these entries inside the existing `@theme inline` block:

```css
  --color-surface: var(--surface);
  --color-surface-foreground: var(--surface-foreground);
  --color-surface-secondary: var(--surface-secondary);
  --color-surface-secondary-foreground: var(--surface-secondary-foreground);
  --color-surface-tertiary: var(--surface-tertiary);
  --color-surface-tertiary-foreground: var(--surface-tertiary-foreground);
  --color-overlay: var(--overlay);
  --color-overlay-foreground: var(--overlay-foreground);
  --color-default: var(--default);
  --color-default-foreground: var(--default-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-danger-foreground: var(--danger-foreground);
  --color-separator: var(--separator);
  --color-focus: var(--focus);
  --color-link: var(--link);
  --color-backdrop: var(--backdrop);
  --color-field: var(--field-background);
  --color-field-foreground: var(--field-foreground);
  --color-field-placeholder: var(--field-placeholder);
  --color-field-border: var(--field-border);
  --radius-field: var(--field-radius);
```

Expected: Tailwind utility classes can address both existing Azani tokens and HeroUI semantic tokens.

- [ ] **Step 5: Verify setup**

Run:

```bash
npm run typecheck
npm run test -- src/__tests__/components/toast.test.tsx
```

Expected: Typecheck passes; existing toast tests still pass because no component code has changed yet.

- [ ] **Step 6: Commit setup**

Run:

```bash
git add package.json package-lock.json src/app/globals.css
git commit -m "feat: add HeroUI foundation theme"
```

## Task 2: Replace Toast Rendering With HeroUI Compatibility Adapter

**Files:**

- Modify: `src/components/toast.tsx`
- Modify: `src/__tests__/components/toast.test.tsx`

- [ ] **Step 1: Tighten toast behavior test before changing implementation**

In `src/__tests__/components/toast.test.tsx`, change the dismiss lookup to accept HeroUI's close button accessible name while preserving the dismissal requirement:

```tsx
const dismissBtn = screen.getByRole("button", { name: /dismiss|close/i });
await user.click(dismissBtn);
```

Expected: The test still fails if a visible toast cannot be dismissed.

- [ ] **Step 2: Run the targeted test before implementation**

Run:

```bash
npm run test -- src/__tests__/components/toast.test.tsx
```

Expected: PASS before implementation; this confirms the test is not weakened to a false positive.

- [ ] **Step 3: Replace custom toast queue with HeroUI adapter**

Replace `src/components/toast.tsx` with this structure:

```tsx
"use client";

import { createContext, useCallback, useContext } from "react";
import { Check, Info, ShoppingBag, X } from "lucide-react";
import { Toast, toast as heroToast } from "@heroui/react";

type ToastType = "success" | "error" | "info" | "cart";

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_MAP: Record<ToastType, "success" | "danger" | "accent"> = {
  success: "success",
  error: "danger",
  info: "accent",
  cart: "accent",
};

const ICON_MAP: Record<ToastType, React.ElementType> = {
  success: Check,
  error: X,
  info: Info,
  cart: ShoppingBag,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const Icon = ICON_MAP[type];
    const show = type === "success" ? heroToast.success : type === "error" ? heroToast.danger : heroToast.info;

    show(message, {
      indicator: <Icon aria-hidden="true" className="size-4" />,
      timeout: 3000,
      variant: VARIANT_MAP[type],
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast.Provider
        className="z-[100]"
        maxVisibleToasts={4}
        placement="bottom end"
        width="min(28rem, calc(100vw - 2rem))"
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
```

Expected: Call sites do not change; `ProductCard` can keep calling `showToast(message, "cart")`.

- [ ] **Step 4: Format and run toast tests**

Run:

```bash
npm run format:check -- src/components/toast.tsx src/__tests__/components/toast.test.tsx
npm run test -- src/__tests__/components/toast.test.tsx
```

Expected: Formatting passes; toast tests pass.

- [ ] **Step 5: Commit toast migration**

Run:

```bash
git add src/components/toast.tsx src/__tests__/components/toast.test.tsx
git commit -m "refactor: render toasts with HeroUI"
```

## Task 3: Migrate Product Card Primitives

**Files:**

- Modify: `src/components/product-card.tsx`
- Test: `src/__tests__/components/product-card.test.tsx`

- [ ] **Step 1: Add a behavior test for disabled quick add**

In `src/__tests__/components/product-card.test.tsx`, add this test:

```tsx
it("does not add unavailable products to the cart", async () => {
  const user = userEvent.setup();
  const unavailableProduct = {
    ...mockProduct,
    variants: [
      {
        ...mockProduct.variants![0],
        inventory_quantity: 0,
        allow_backorder: false,
      },
    ],
  };

  renderWithProviders(<ProductCard product={unavailableProduct} />);

  await user.click(screen.getByLabelText("Out of stock"));
  expect(mockAddToCart).not.toHaveBeenCalled();
});
```

Expected: The test captures the existing disabled-state behavior before the HeroUI `Button` migration.

- [ ] **Step 2: Run product-card tests before implementation**

Run:

```bash
npm run test -- src/__tests__/components/product-card.test.tsx
```

Expected: PASS before implementation.

- [ ] **Step 3: Import HeroUI primitives**

In `src/components/product-card.tsx`, add:

```tsx
import { Button, Card, Chip } from "@heroui/react";
```

Expected: Existing imports remain except native button usage will be replaced.

- [ ] **Step 4: Convert the card shell and badges**

Replace the outer `<article>` with:

```tsx
<Card
  role="article"
  className="group border-border/50 bg-card hover:border-border relative flex flex-col overflow-hidden rounded-2xl border p-0 transition duration-300"
  variant="default"
>
```

Replace the closing `</article>` with `</Card>`.

Replace the `New` badge span with:

```tsx
<Chip className="bg-accent-yellow text-foreground text-2xs font-bold tracking-wider uppercase" size="sm">
  New
</Chip>
```

Expected: Product card layout and `New` text remain visible.

- [ ] **Step 5: Convert wishlist and quick-add buttons to HeroUI Button**

Replace the wishlist `<button>` with:

```tsx
<Button
  isDisabled={wishlistMutation.isPending}
  isIconOnly
  aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
  className={`border-border/50 focus-visible:ring-primary/30 bg-card h-10 w-10 rounded-full border transition disabled:opacity-50 ${
    isWishlisted ? "text-primary" : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
  }`}
  title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
  variant="ghost"
  onPress={() => wishlistMutation.mutate()}
>
  <Heart className="h-3.5 w-3.5" fill={isWishlisted ? "currentColor" : "none"} />
</Button>
```

Replace the quick-add `<button>` with:

```tsx
<Button
  isDisabled={cartMutation.isPending || !availability.canPurchase || justAdded}
  isIconOnly
  aria-label={maxedOut ? "Max quantity in cart" : availability.canPurchase ? "Add to cart" : "Out of stock"}
  className={`h-8 w-8 rounded-full text-white transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 ${
    justAdded
      ? "bg-accent-green-bold scale-110"
      : maxedOut
        ? "bg-muted cursor-default opacity-60"
        : "bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 disabled:opacity-40"
  }`}
  title={maxedOut ? "Max quantity in cart" : availability.canPurchase ? "Add to cart" : "Out of stock"}
  variant="ghost"
  onPress={() => {
    if (!quickAddVariant || !availability.canPurchase) return;
    if (maxedOut) {
      showToast("Maximum quantity already in cart", "info");
      return;
    }
    cartMutation.mutate(quickAddVariant.id);
  }}
>
  {justAdded ? (
    <Check className="h-4 w-4 animate-[pop_0.3s_ease-out]" strokeWidth={3} />
  ) : maxedOut ? (
    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
  ) : (
    <Plus className="h-4 w-4" strokeWidth={2.5} />
  )}
</Button>
```

Remove the old `handleAddToCart` and `handleWishlistToggle` functions if they are no longer referenced.

Expected: The card still links to product details, wishlist toggles still work, and quick add still calls the cart mutation only when purchaseable.

- [ ] **Step 6: Run product-card checks**

Run:

```bash
npm run test -- src/__tests__/components/product-card.test.tsx
npm run typecheck
```

Expected: Product-card tests and typecheck pass.

- [ ] **Step 7: Commit product card migration**

Run:

```bash
git add src/components/product-card.tsx src/__tests__/components/product-card.test.tsx
git commit -m "refactor: migrate product card controls to HeroUI"
```

## Task 4: Migrate Filter Drawer And Product List Controls

**Files:**

- Modify: `src/components/filter-sidebar.tsx`
- Modify: `src/app/products/page.tsx`
- Test: `src/__tests__/components/filter-sidebar.test.tsx`
- Test: `src/__tests__/pages/products.test.tsx`

- [ ] **Step 1: Add a mobile drawer behavior test**

In `src/__tests__/components/filter-sidebar.test.tsx`, add:

```tsx
it("opens and closes the mobile filter drawer", async () => {
  const user = userEvent.setup();

  renderWithProviders(<FilterSidebar {...defaultProps} />);

  await user.click(screen.getByRole("button", { name: /filters/i }));
  expect(screen.getByRole("dialog", { name: /filters/i })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /close filters/i }));
  expect(screen.queryByRole("dialog", { name: /filters/i })).not.toBeInTheDocument();
});
```

Expected: This test may fail before implementation if the current overlay has no dialog role; that is the intended accessibility gap.

- [ ] **Step 2: Run filter tests and capture the expected failure**

Run:

```bash
npm run test -- src/__tests__/components/filter-sidebar.test.tsx
```

Expected: Existing tests pass; the new dialog-role test fails before the Drawer migration.

- [ ] **Step 3: Import HeroUI controls in filter sidebar**

In `src/components/filter-sidebar.tsx`, add:

```tsx
import { Button, Chip, Drawer } from "@heroui/react";
```

Expected: Native buttons can be migrated incrementally.

- [ ] **Step 4: Convert filter buttons to HeroUI Button and Chip**

Use `Button` with `variant="ghost"` or `variant="secondary"` for category, clear, expand, and mobile filter actions. The mobile trigger should preserve the visible text and count:

```tsx
<Button className="border-border text-foreground shadow-sm lg:hidden" variant="secondary" onPress={() => setMobileOpen(true)}>
  <SlidersHorizontal className="h-4 w-4" />
  Filters
  {activeFilterCount > 0 && (
    <Chip color="default" size="sm" variant="primary">
      {activeFilterCount}
    </Chip>
  )}
</Button>
```

For category selection, use `onPress={() => onSelect(isActive ? undefined : cat.slug)}` instead of `onClick`.

Expected: Existing category selection tests continue to pass.

- [ ] **Step 5: Replace the custom mobile overlay with controlled HeroUI Drawer**

Replace the `mobileOpen && <div className="fixed ...">` block with:

```tsx
<Drawer.Backdrop isOpen={mobileOpen} onOpenChange={setMobileOpen} variant="blur">
  <Drawer.Content className="w-80 max-w-[85vw]" placement="right">
    <Drawer.Dialog aria-label="Filters" className="h-full">
      <Drawer.CloseTrigger aria-label="Close filters" />
      <Drawer.Header>
        <Drawer.Heading>Filters</Drawer.Heading>
      </Drawer.Header>
      <Drawer.Body>{content}</Drawer.Body>
    </Drawer.Dialog>
  </Drawer.Content>
</Drawer.Backdrop>
```

Expected: The mobile filter panel has dialog semantics, closes with the close trigger, and keeps the same content.

- [ ] **Step 6: Convert product-list chips and empty-state actions**

In `src/app/products/page.tsx`, import:

```tsx
import { Button, Chip } from "@heroui/react";
```

Replace active filter `<span>` wrappers with `Chip` while preserving remove buttons and labels. Replace empty-state and pagination native buttons with `Button` using `onPress`.

Expected: Active filters remain removable; pagination still pushes the selected page query param.

- [ ] **Step 7: Run filter and products tests**

Run:

```bash
npm run test -- src/__tests__/components/filter-sidebar.test.tsx src/__tests__/pages/products.test.tsx
npm run typecheck
```

Expected: The new drawer test passes; product page behavior remains unchanged.

- [ ] **Step 8: Commit filter and products migration**

Run:

```bash
git add src/components/filter-sidebar.tsx src/app/products/page.tsx src/__tests__/components/filter-sidebar.test.tsx src/__tests__/pages/products.test.tsx
git commit -m "refactor: migrate product filters to HeroUI"
```

## Task 5: Final Verification And Browser Review

**Files:**

- Verify all changed files from Tasks 1-4.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm run test -- src/__tests__/components/product-card.test.tsx src/__tests__/components/filter-sidebar.test.tsx src/__tests__/components/toast.test.tsx src/__tests__/pages/products.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full static checks**

Run:

```bash
npm run lint
npm run typecheck
npm run format:check
```

Expected: all commands PASS.

- [ ] **Step 3: Run the app locally**

Run:

```bash
npm run dev
```

Expected: Next dev server starts. If port 3000 is busy, use the port printed by Next.

- [ ] **Step 4: Browser-check homepage and products**

Open the local app in a browser and verify:

- `/` renders with the existing Azani visual language.
- `/products` renders the product grid without card size regressions.
- Mobile width opens and closes the filter drawer.
- Category selection updates the products URL.
- Active filter chips can be removed.
- Wishlist and add-to-cart actions still show toasts.
- Toasts appear near the bottom end and can be dismissed.

Expected: No blank screens, console runtime errors, overlapping mobile text, or unreachable controls.

- [ ] **Step 5: Confirm clean working tree**

Run:

```bash
git status --short
```

Expected: No output. If this prints files, inspect them with `git diff` and either commit the task-specific fix with an exact message before re-running verification or leave the files uncommitted only when the user explicitly requested that.
