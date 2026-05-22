# HeroUI Foundation Migration Design

## Context

Azani UI is a Next 16, React 19, and Tailwind CSS v4 storefront. The current UI is built from local Tailwind-styled components in `src/components` and app route files under `src/app`. There is no existing HeroUI dependency, so this is a new HeroUI v3 adoption rather than a v2-to-v3 migration.

The first migration slice should stay small enough to review and stage safely. It should establish HeroUI as the shared component system, prove the API on repeated shopper-facing primitives, and leave checkout/account form-heavy surfaces for later slices.

## Approved Direction

Use a foundation-first migration:

- Install `@heroui/react` and `@heroui/styles`.
- Import HeroUI styles after Tailwind in `src/app/globals.css`.
- Map Azani's current baby-shop palette into HeroUI semantic variables instead of adopting a stock HeroUI theme.
- Convert a small set of repeated primitives and surfaces first: product cards, filter/sidebar controls, active filter chips, product-list empty states, and toast plumbing.
- Keep checkout, account, and larger page redesigns out of this slice.

## HeroUI Constraints

HeroUI v3 must be used as documented by the HeroUI MCP:

- Tailwind CSS v4 is required and already present.
- HeroUI v3 does not need a provider.
- Components should import from `@heroui/react`. Do not add `@heroui-pro/react` in this slice; Pro-only components such as `Sheet` remain out of scope until the project intentionally adopts Pro.
- HeroUI interactive components use `onPress` rather than native `onClick`.
- Compound component APIs must follow the verified docs, for example `Card.Header`, `Card.Content`, `Toast.Provider`, and `Tooltip.Content`.
- Next.js links should continue to use `next/link`; HeroUI link styles can be applied with BEM classes or variants only where useful.

## Theme Design

The Azani theme should remain recognizable: pastel, warm, and baby-shop appropriate, with enough contrast for product browsing and checkout-adjacent actions.

Map existing tokens to HeroUI variables:

- `--background` and `--foreground` keep the current soft page background and dark text.
- `--surface`, `--surface-secondary`, and `--overlay` replace local `--card` usage for cards, sheets, menus, and toasts.
- `--accent` uses Azani pink as the primary brand action color.
- `--link` can use the foreground or secondary blue depending on local readability.
- `--field-*` variables should reflect the existing white fields, soft borders, and muted placeholders.
- `--success`, `--warning`, and `--danger` should preserve the current stock, payment, and error language.

Existing Tailwind aliases such as `text-primary`, `bg-card`, and `border-border` can remain during the first slice to avoid a broad mechanical rewrite. New HeroUI components should prefer HeroUI semantic variants plus targeted class overrides when the brand requires it.

## Component Scope

The first component migration should focus on high-reuse, low-business-risk surfaces:

- `src/components/product-card.tsx`: migrate the shell to HeroUI `Card`, the wishlist and quick-add controls to HeroUI `Button`, and badges/status indicators to HeroUI `Badge` or `Chip` where the API fits.
- `src/components/filter-sidebar.tsx`: migrate clear/filter/category actions to HeroUI `Button`; replace the custom mobile overlay with HeroUI `Drawer`.
- `src/app/products/page.tsx`: migrate active filter chips, empty state action, pagination buttons, and simple icon controls.
- `src/components/toast.tsx`: create a compatibility adapter that preserves the existing `useToast().showToast(message, type)` call site while delegating rendering to HeroUI `Toast.Provider` and `toast`.

The first slice should not migrate checkout, account, login, reset-password, order history, PDP layout, or the full homepage. Those surfaces have more business state and should follow once the foundation is proven.

## Architecture

Keep the adoption thin:

- Avoid wrapping every HeroUI component in local abstractions.
- Add small app-specific adapters only where they preserve existing contracts, such as the toast API or Next.js routing behavior.
- Keep product and category data flow unchanged.
- Keep Medusa API calls, React Query keys, and formatter behavior unchanged.
- Preserve existing tests where they check business behavior; update only interaction details that change from native click handlers to HeroUI press behavior.

## Testing And Validation

Focused verification should include:

- Typecheck.
- Lint.
- Relevant component/page tests for `ProductCard`, `FilterSidebar`, `Toast`, and products page behavior.
- A local browser check of the homepage and `/products` at desktop and mobile widths.
- Manual checks for add-to-cart, wishlist toggle, filter open/close, filter selection, active filter removal, empty state, pagination, and toast dismissal.

Visual acceptance:

- The app still reads as Azani, not a generic dashboard theme.
- Product cards remain dense enough for shopping and do not grow unexpectedly.
- Mobile filters are accessible, dismissible, and do not trap content behind the header.
- Text remains readable and does not overflow on mobile.
- HeroUI focus, disabled, loading, and pressed states are visible and consistent.

## Release Constraints

Keep this work on a feature branch targeting `develop`. Do not merge to `main` directly. The established release flow remains feature branch to `develop`, Railway staging validation, then `main` only after staging sign-off.
