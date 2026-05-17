# Azani Design Foundation

This foundation gives Azani a restrained baby-boutique visual language before individual pages are redesigned. It is intentionally small: tokens live in `src/app/globals.css`, and reusable primitive classes are available globally for shared surfaces, controls, state labels, empty states, and loading states.

## Token Intent

- `background`, `surface`, `surface-soft`, and `product-surface` keep the store warm and practical without turning the UI into a beige-only palette.
- `primary` is a muted rose for brand emphasis and wishlist-style moments.
- `secondary` and `trust` are teal tones for confidence, delivery, account verification, and helpful information.
- `accent-warm`, `promo`, and `warning` carry warm retail moments such as promos, must-haves, low-stock states, and seasonal emphasis.
- `success`, `danger`, and `warning` are semantic state tokens. Use them for status meaning, not decoration.
- `border`, `border-hover`, and `focus` standardize separators, card edges, and visible keyboard focus.
- Card radius tokens are capped at `0.5rem` so product and checkout surfaces feel crisp, not pillowy. Rounded pills and circular icon controls are still allowed where the shape communicates the control type.

## Primitive Usage

- Use `az-btn` with `az-btn-primary`, `az-btn-secondary`, `az-btn-warm`, `az-btn-outline`, or `az-btn-ghost` for commands.
- Use `az-icon-button` for square icon-only controls, and keep `aria-label` or `title` on icon-only actions.
- Add `az-focus` to interactive elements that do not use `az-form-field`.
- Use `az-pill` with `az-pill-neutral`, `az-pill-promo`, or `az-pill-trust` for counts, badges, filters, and small status labels.
- Use `az-status-success`, `az-status-warning`, `az-status-danger`, or `az-status-muted` for stock, product, checkout, and payment labels.
- Use `az-product-card` for product-card containers and `bg-product-media` for product imagery wells.
- Use `az-surface` for standalone panels such as summaries, sidebars, and checkout steps. Do not place `az-surface` inside another card-like surface unless the inner surface is a form field or clearly separate repeated item.
- Use `az-empty-state` for empty carts, no-results views, and unavailable product states.
- Use `az-skeleton` for loading blocks instead of ad hoc `bg-border/40 animate-pulse` classes.
- Use `az-form-field` for text inputs and selects so border, background, and focus behavior stay consistent.

## Avoid

- Do not redesign whole pages as part of token adoption. Later issues should keep layout changes separate from foundation consumption.
- Do not copy Kiabi branding, imagery, copy, or exact layouts.
- Do not create palettes dominated by only purple, beige, brown, or dark slate.
- Do not introduce cards inside cards for page sections. Use full sections, simple panels, or repeated item cards.
- Do not use `rounded-2xl` or larger radii for cards in new work. Use the radius token or existing primitives.
- Do not use status colors as decorative accents. If a color communicates success, warning, danger, trust, or promo, the UI state should match that meaning.

## How Later Issues Should Consume This

Start from the global tokens and primitive classes before adding page-specific classes. If a new page redesign needs a new state or primitive, add the smallest reusable token or class in `globals.css`, document the intent here, and migrate at least one existing shared surface to prove it works.

Page redesign issues should focus on composition, hierarchy, imagery, and merchandising while reusing this foundation for buttons, badges, product labels, cards, form fields, empty states, and skeletons.
