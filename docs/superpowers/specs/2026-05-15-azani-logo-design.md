# Azani Logo Design

## Context

Azani is a baby shop selling essentials across baby care, feeding, clothing, toys, nursery, and maternity categories. The current site uses a pastel palette and a compact sticky header, with the logo appearing as a wide SVG in both the header and footer.

The existing `public/logo.svg` is a text-only `azani` wordmark. The new logo should keep the friendly lowercase brand name while adding a clearer baby-shop cue.

## Approved Direction

Use the T3 "Compact Header" direction from the visual exploration:

- A cloud-shop mark on the left, derived from the B3 cloud/basket concept.
- A Trebuchet-style lowercase `azani` wordmark on the right.
- A small visible gap between the mark and wordmark. They should feel grouped, but they must not touch.
- Compact proportions that work in the current navbar at roughly `h-14` to `h-16`.

## Visual Details

The mark should combine soft baby-shop warmth with ecommerce clarity:

- Cloud-like top contour for softness and baby/nursery association.
- Basket/cart-like base cues for retail clarity.
- Pastel yellow fill with Azani pink outline.
- Blue and mint internal strokes to echo the existing site palette.
- Dark wheels/details using the foreground color.

The wordmark should use a playful Trebuchet-like sans-serif feel:

- Lowercase `azani`.
- Heavy enough to hold up beside the illustrated mark.
- Tighter tracking than default text, but not so tight that letters collide.
- Dark foreground color for readability.

## Asset Requirements

The implementation should replace `public/logo.svg` with a deterministic SVG asset. The SVG should not depend on a web font being loaded to preserve consistent rendering across browser, email preview, and social contexts. If the final lettering cannot be converted to paths in this environment, use a robust fallback stack and keep the visual close to the approved Trebuchet direction.

The asset should preserve the current consumption pattern:

- `src/components/site-header.tsx` continues to render `/logo.svg`.
- `src/components/site-footer.tsx` continues to render `/logo.svg`.
- The viewBox remains wide enough for the combined mark and wordmark.

## Validation

Validate the logo in the existing app surfaces:

- Header desktop and mobile widths.
- Footer placement.
- SVG renders without clipped edges.
- Mark and wordmark keep a small gap at rendered size.
- Type remains readable at the header size.
