# Social Links + Floating WhatsApp Design

**Date:** 2026-05-12
**Status:** Approved
**Scope:** Add Instagram / Facebook / TikTok links to the site footer and a fixed-position WhatsApp redirect button that floats on every route.

## Goals

1. Surface Azani's social presence (Instagram, Facebook, TikTok) in the footer so customers can follow the brand.
2. Provide a one-tap path from any page to a WhatsApp conversation with the shop, mimicking the affordance of a live-chat widget but without an in-page chat surface.
3. Keep all contact details (phone, email, social URLs, WhatsApp number) in one configurable place so non-engineers can update them via environment variables.

## Non-goals

- Real social URLs or a production WhatsApp number — env vars ship with placeholder defaults.
- An in-page chat widget. The floating button is a redirect to WhatsApp; there is no embedded chat surface, no message persistence, no server.
- Per-route visibility rules for the floating button. It is visible everywhere.
- A reusable `SocialIcons` component shared across surfaces. Deferred until a second consumer exists (YAGNI).
- A new icon dependency (`react-icons` or similar). Trademark icons (TikTok, WhatsApp) ship as inline SVGs.

## Architecture

### New module: `src/lib/site-config.ts`

Single source of truth for contact info, social URLs, and WhatsApp parameters. All values read from `NEXT_PUBLIC_*` environment variables with sensible placeholder fallbacks so the app renders out-of-the-box.

```ts
export const siteConfig = {
  contact: {
    phone: process.env.NEXT_PUBLIC_AZANI_PHONE ?? "+254700000000",
    phoneDisplay: process.env.NEXT_PUBLIC_AZANI_PHONE_DISPLAY ?? "+254 700 000 000",
    email: process.env.NEXT_PUBLIC_AZANI_EMAIL ?? "hello@azani.shop",
    location: "Nairobi, Kenya",
  },
  social: {
    instagram: process.env.NEXT_PUBLIC_AZANI_INSTAGRAM_URL ?? "https://instagram.com/azani",
    facebook: process.env.NEXT_PUBLIC_AZANI_FACEBOOK_URL ?? "https://facebook.com/azani",
    tiktok: process.env.NEXT_PUBLIC_AZANI_TIKTOK_URL ?? "https://tiktok.com/@azani",
  },
  whatsapp: {
    // wa.me requires digits only, no leading '+'
    number: (process.env.NEXT_PUBLIC_AZANI_WHATSAPP_NUMBER ?? "254700000000").replace(/\D/g, ""),
    prefillMessage: "Hi Azani, I'd like to ask about...",
  },
} as const;
```

**Why a config module:** the existing footer hardcodes contact info. As soon as we add three more URLs + a WhatsApp number, scattering them is worse than centralising them. This module also lets the floating button reuse the phone number without prop-drilling.

### Footer changes: `src/components/site-footer.tsx`

The footer remains a server component. Two edits:

1. Replace the three hardcoded contact rows (phone, email, location) with `siteConfig.contact.*`.
2. Add a "Follow us" block below the contact info inside the existing brand column (column 1 of the 4-column grid). Layout:

   ```
   Follow us
   [Instagram] [Facebook] [TikTok]
   ```

   Each icon is a ~36px circular button: 9×9 (Tailwind `h-9 w-9`), rounded-full, neutral background (`bg-primary-light` / `bg-secondary-light` / `bg-muted-light/20` for the three platforms respectively), with the icon coloured to the platform accent (primary pink / secondary blue / foreground). Hover state lifts the background to its `*-hover` variant.

   Icons:
   - **Instagram:** `Instagram` from `lucide-react`
   - **Facebook:** `Facebook` from `lucide-react`
   - **TikTok:** inline SVG, single path, ~24×24 viewBox (lucide does not ship a TikTok icon due to trademark)

   Each icon wrapped in an anchor: `target="_blank"`, `rel="noopener noreferrer"`, `aria-label="Follow Azani on {Platform}"`.

### New component: `src/components/floating-whatsapp.tsx`

Server component. It renders a static `<a>` with no interactivity, state, or effects, so `'use client'` is not required. Mounted once in the root layout.

**Structure:**

- Fixed-position anchor: `fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50`
- 56px circle (`h-14 w-14`), background `#25D366` (WhatsApp brand green), inline white WhatsApp glyph SVG inside
- Soft pulse ring: an absolutely-positioned sibling `<span>` with `animate-ping bg-[#25D366]/40 rounded-full`, wrapped in `motion-safe:` so users with `prefers-reduced-motion: reduce` get a static button
- Optional "Talk to us" label visible on `md+` screens, hidden on mobile to avoid covering page content. Implementation: a flex-row pill with the circle + a `hidden md:inline` `<span>` containing the text, or two stacked elements. Pick whichever produces cleaner Tailwind — both are acceptable.

**Href:**

```
https://wa.me/${siteConfig.whatsapp.number}?text=${encodeURIComponent(siteConfig.whatsapp.prefillMessage)}
```

This URL scheme is recognised by both the WhatsApp mobile app (deep-links into a chat) and WhatsApp Web (opens a chat in a new tab).

**Attributes:**

- `target="_blank"`
- `rel="noopener noreferrer"`
- `aria-label="Chat with us on WhatsApp"`

### Layout integration: `src/app/layout.tsx`

Add `<FloatingWhatsApp />` after `<SiteFooter />` inside the existing flex column. The button is fixed-position so DOM order doesn't matter visually; keeping it adjacent to the footer keeps page chrome grouped.

```tsx
<main className="flex-1">{children}</main>
<SiteFooter />
<FloatingWhatsApp />
```

## Data flow

1. Build time: Next.js inlines `NEXT_PUBLIC_*` env vars into both server and client bundles.
2. `siteConfig` is imported by `site-footer.tsx` (server) and `floating-whatsapp.tsx` (server or client).
3. No runtime fetches, no client state, no side effects.

## Styling and tokens

- Social icon backgrounds use existing theme tokens (`primary-light`, `secondary-light`, `muted-light`). No new tokens.
- WhatsApp brand green `#25D366` is intentionally a one-off literal in `floating-whatsapp.tsx`, not added to the theme. Reason: it's a third-party brand colour, not a design system colour, and adding it to the theme would invite misuse elsewhere. The site's `--accent-green-bold: #34c759` is close but visibly different and would weaken brand recognition.
- Pulse animation uses Tailwind's built-in `animate-ping`, gated by `motion-safe:`.

## Accessibility

- Every social anchor has an `aria-label` naming the platform.
- Floating button has `aria-label="Chat with us on WhatsApp"`.
- Pulse animation respects `prefers-reduced-motion` via `motion-safe:`.
- Floating button is keyboard-focusable (it's a plain `<a>`); focus ring uses Tailwind's default `focus-visible:ring-2` styling matched to the brand.
- Touch target: 56px exceeds the 44px WCAG 2.1 AA minimum.

## Testing

One new test file: `src/__tests__/components/floating-whatsapp.test.tsx`.

Cases:

1. Renders an `<a>` element with `href` matching `^https://wa\.me/\d+\?text=` and the encoded pre-fill message present in the query string.
2. `aria-label` is `"Chat with us on WhatsApp"`.
3. `target="_blank"` and `rel="noopener noreferrer"` are both set.

No new test file for the footer. The footer currently has no test; we're not adding one just to assert icon presence.

## Environment variables

Documented for ops to set in deployment (no defaults will reach production after these are filled in):

| Variable                            | Example                           | Falls back to                 |
| ----------------------------------- | --------------------------------- | ----------------------------- |
| `NEXT_PUBLIC_AZANI_PHONE`           | `+254712345678`                   | `+254700000000`               |
| `NEXT_PUBLIC_AZANI_PHONE_DISPLAY`   | `+254 712 345 678`                | `+254 700 000 000`            |
| `NEXT_PUBLIC_AZANI_EMAIL`           | `hello@azani.shop`                | `hello@azani.shop`            |
| `NEXT_PUBLIC_AZANI_INSTAGRAM_URL`   | `https://instagram.com/azanishop` | `https://instagram.com/azani` |
| `NEXT_PUBLIC_AZANI_FACEBOOK_URL`    | `https://facebook.com/azanishop`  | `https://facebook.com/azani`  |
| `NEXT_PUBLIC_AZANI_TIKTOK_URL`      | `https://tiktok.com/@azanishop`   | `https://tiktok.com/@azani`   |
| `NEXT_PUBLIC_AZANI_WHATSAPP_NUMBER` | `+254712345678`                   | `254700000000`                |

## File summary

| Path                                                  | Action                                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/lib/site-config.ts`                              | New                                                                         |
| `src/components/site-footer.tsx`                      | Edit — read contact info from `siteConfig`, add "Follow us" social icon row |
| `src/components/floating-whatsapp.tsx`                | New                                                                         |
| `src/app/layout.tsx`                                  | Edit — mount `<FloatingWhatsApp />` after `<SiteFooter />`                  |
| `src/__tests__/components/floating-whatsapp.test.tsx` | New                                                                         |

## Risks and open questions

- **Placeholder URLs ship to prod if env vars unset.** Mitigation: deployment checklist should include all `NEXT_PUBLIC_AZANI_*` vars. Acceptable risk for an early-stage shop.
- **Floating button covers content on small viewports.** 56px in the bottom-right corner can cover product card corners on narrow phones. Acceptable — it's the standard chat-widget placement that users expect. Revisit if user testing shows it blocks important UI (add a route-allowlist or a dismissible state then).
- **WhatsApp green clashes with site palette.** Intentional — brand recognition outweighs palette purity for a CTA-style icon.
