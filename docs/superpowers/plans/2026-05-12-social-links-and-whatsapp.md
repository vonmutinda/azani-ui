# Social Links + Floating WhatsApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Instagram / Facebook / TikTok links to the footer and a fixed-position WhatsApp redirect button visible on every route.

**Architecture:** Centralise all contact and social info in `src/lib/site-config.ts` (env-var-driven with placeholder defaults). Footer (server component) renders the social icon row using lucide-react + an inline TikTok SVG. A new `FloatingWhatsApp` server component mounts once in the root layout and renders a static `<a>` to `wa.me/<number>?text=<prefill>`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, lucide-react 0.564, Vitest 4 + @testing-library/react.

**Spec:** [docs/superpowers/specs/2026-05-12-social-links-and-whatsapp-design.md](../specs/2026-05-12-social-links-and-whatsapp-design.md)

---

## File Structure

| Path                                                  | Action | Responsibility                                                                                                                         |
| ----------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/site-config.ts`                              | Create | Single export `siteConfig` with contact / social / whatsapp fields, all backed by `NEXT_PUBLIC_*` env vars with placeholder fallbacks. |
| `src/components/floating-whatsapp.tsx`                | Create | Server component. Fixed-position anchor → `wa.me`. Inline WhatsApp glyph SVG. Reads `siteConfig.whatsapp`.                             |
| `src/__tests__/components/floating-whatsapp.test.tsx` | Create | Vitest unit test asserting href, aria-label, target, rel.                                                                              |
| `src/components/site-footer.tsx`                      | Modify | Swap hardcoded contact info to `siteConfig`. Add "Follow us" row with three social icon links (Instagram, Facebook, TikTok).           |
| `src/app/layout.tsx`                                  | Modify | Mount `<FloatingWhatsApp />` after `<SiteFooter />`.                                                                                   |

Each file has one job; nothing depends on anything new before the task that creates it.

---

## Task 1: Create `siteConfig` module

**Files:**

- Create: `src/lib/site-config.ts`

- [ ] **Step 1: Create the file**

Write `src/lib/site-config.ts`:

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

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: exits 0 with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/site-config.ts
git commit -m "feat(config): add siteConfig for contact, social, whatsapp"
```

---

## Task 2: Write failing test for `FloatingWhatsApp`

**Files:**

- Create: `src/__tests__/components/floating-whatsapp.test.tsx`

- [ ] **Step 1: Write the test**

Write `src/__tests__/components/floating-whatsapp.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import { siteConfig } from "@/lib/site-config";

describe("FloatingWhatsApp", () => {
  it("renders an anchor to wa.me with the configured number and encoded prefill message", () => {
    render(<FloatingWhatsApp />);
    const link = screen.getByRole("link", { name: /chat with us on whatsapp/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toMatch(new RegExp(`^https://wa\\.me/${siteConfig.whatsapp.number}\\?text=`));
    expect(href).toContain(encodeURIComponent(siteConfig.whatsapp.prefillMessage));
  });

  it("has an aria-label", () => {
    render(<FloatingWhatsApp />);
    expect(screen.getByLabelText("Chat with us on WhatsApp")).toBeInTheDocument();
  });

  it("opens in a new tab with safe rel attributes", () => {
    render(<FloatingWhatsApp />);
    const link = screen.getByRole("link", { name: /chat with us on whatsapp/i });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
```

- [ ] **Step 2: Run the test, expect failure**

Run: `npx vitest run src/__tests__/components/floating-whatsapp.test.tsx`
Expected: FAIL — module `@/components/floating-whatsapp` cannot be resolved (file doesn't exist yet).

---

## Task 3: Implement `FloatingWhatsApp`

**Files:**

- Create: `src/components/floating-whatsapp.tsx`

- [ ] **Step 1: Write the component**

Write `src/components/floating-whatsapp.tsx`:

```tsx
import { siteConfig } from "@/lib/site-config";

const WA_GREEN = "#25D366";

export function FloatingWhatsApp() {
  const href = `https://wa.me/${siteConfig.whatsapp.number}?text=${encodeURIComponent(
    siteConfig.whatsapp.prefillMessage,
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-5 bottom-5 z-50 flex items-center gap-2 sm:right-6 sm:bottom-6"
    >
      <span className="relative flex h-14 w-14 items-center justify-center">
        <span
          aria-hidden="true"
          className="absolute inline-flex h-full w-full rounded-full bg-[#25D366]/40 motion-safe:animate-ping"
        />
        <span
          className="relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg ring-1 ring-black/5 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          style={{ backgroundColor: WA_GREEN }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7 fill-white"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
          </svg>
        </span>
      </span>
      <span className="bg-foreground/85 hidden rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-md md:inline-block">
        Talk to us
      </span>
    </a>
  );
}
```

- [ ] **Step 2: Run the test, expect pass**

Run: `npx vitest run src/__tests__/components/floating-whatsapp.test.tsx`
Expected: PASS — 3/3 tests green.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/floating-whatsapp.tsx src/__tests__/components/floating-whatsapp.test.tsx
git commit -m "feat(components): add FloatingWhatsApp button"
```

---

## Task 4: Mount `FloatingWhatsApp` in the root layout

**Files:**

- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add the import**

In `src/app/layout.tsx`, add after the existing `SiteFooter` import:

```tsx
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
```

The full import block at the top of the file should read:

```tsx
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { DM_Sans, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
```

- [ ] **Step 2: Render the component after `<SiteFooter />`**

Inside the existing flex column, replace:

```tsx
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
```

with:

```tsx
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <FloatingWhatsApp />
          </div>
```

- [ ] **Step 3: Typecheck and run all tests**

Run: `npm run typecheck && npm test`
Expected: typecheck exits 0; all tests pass.

- [ ] **Step 4: Smoke-test in the browser**

Run: `npm run dev`
Open: `http://localhost:3000`
Verify:

- A green circular WhatsApp button is fixed at the bottom-right corner of the viewport.
- On `md+` screens, a "Talk to us" pill is visible next to the circle.
- Hover scales the circle slightly; a soft pulse ring emanates from it (unless `prefers-reduced-motion: reduce` is set).
- Clicking the button opens `wa.me/...` in a new tab.
- Navigating between routes (e.g. `/`, `/products`, `/cart`) keeps the button visible.
  Stop the dev server (Ctrl-C).

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(layout): mount FloatingWhatsApp on every route"
```

---

## Task 5: Update footer — use `siteConfig` and add social icon row

**Files:**

- Modify: `src/components/site-footer.tsx`

- [ ] **Step 1: Add the `siteConfig` import and new lucide icons**

Replace the existing import block at the top of `src/components/site-footer.tsx`:

```tsx
import Link from "next/link";
import Image from "next/image";
import { Heart, Mail, MapPin, Phone } from "lucide-react";
```

with:

```tsx
import Link from "next/link";
import Image from "next/image";
import { Facebook, Heart, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
```

- [ ] **Step 2: Swap the three hardcoded contact rows to read from `siteConfig`**

Replace:

```tsx
<div className="text-muted space-y-2 text-xs">
  <div className="flex items-center gap-2">
    <Phone className="text-primary h-3.5 w-3.5" /> +254 700 000 000
  </div>
  <div className="flex items-center gap-2">
    <Mail className="text-secondary h-3.5 w-3.5" /> hello@azani.shop
  </div>
  <div className="flex items-center gap-2">
    <MapPin className="text-accent-green h-3.5 w-3.5" /> Nairobi, Kenya
  </div>
</div>
```

with:

```tsx
<div className="text-muted space-y-2 text-xs">
  <div className="flex items-center gap-2">
    <Phone className="text-primary h-3.5 w-3.5" /> {siteConfig.contact.phoneDisplay}
  </div>
  <div className="flex items-center gap-2">
    <Mail className="text-secondary h-3.5 w-3.5" /> {siteConfig.contact.email}
  </div>
  <div className="flex items-center gap-2">
    <MapPin className="text-accent-green h-3.5 w-3.5" /> {siteConfig.contact.location}
  </div>
</div>
```

- [ ] **Step 3: Add the "Follow us" social row**

Immediately after the closing `</div>` of the contact-rows block from Step 2, and still inside the brand column's outer `<div className="space-y-4">`, insert:

```tsx
<div>
  <h4 className="text-foreground mb-2 text-xs font-bold tracking-wide uppercase">Follow us</h4>
  <div className="flex items-center gap-2">
    <a
      href={siteConfig.social.instagram}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Follow Azani on Instagram"
      className="bg-primary-light text-primary hover:bg-primary inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:text-white"
    >
      <Instagram className="h-4 w-4" />
    </a>
    <a
      href={siteConfig.social.facebook}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Follow Azani on Facebook"
      className="bg-secondary-light text-secondary hover:bg-secondary inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:text-white"
    >
      <Facebook className="h-4 w-4" />
    </a>
    <a
      href={siteConfig.social.tiktok}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Follow Azani on TikTok"
      className="bg-foreground/5 text-foreground hover:bg-foreground hover:text-background inline-flex h-9 w-9 items-center justify-center rounded-full transition"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 fill-current"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
      </svg>
    </a>
  </div>
</div>
```

- [ ] **Step 4: Typecheck and run all tests**

Run: `npm run typecheck && npm test`
Expected: typecheck exits 0; all tests pass.

- [ ] **Step 5: Smoke-test in the browser**

Run: `npm run dev`
Open: `http://localhost:3000`
Verify:

- The footer's brand column shows phone `+254 700 000 000`, email `hello@azani.shop`, and location `Nairobi, Kenya` (same as before — sourced from defaults).
- Below the contact info, a "FOLLOW US" label is visible with three circular icon buttons: pink Instagram, blue Facebook, dark TikTok.
- Hovering each icon inverts the background to the platform colour.
- Clicking each icon opens its respective placeholder URL in a new tab.
- The footer layout still looks correct on mobile and `lg+` screens.
  Stop the dev server (Ctrl-C).

- [ ] **Step 6: Commit**

```bash
git add src/components/site-footer.tsx
git commit -m "feat(footer): add social icon row and route contact info through siteConfig"
```

---

## Final verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites green; `floating-whatsapp.test.tsx` shows 3 passing.

- [ ] **Step 2: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Confirm git log**

Run: `git log --oneline -5`
Expected: five new commits (config, FloatingWhatsApp component+test, layout mount, footer update — possibly four if test+component were committed together as in Task 3).

---

## Notes for the implementer

- **Test isolation:** The floating-whatsapp test imports `siteConfig` and asserts against `siteConfig.whatsapp.number` and `siteConfig.whatsapp.prefillMessage`. Because the test reads the same module the component reads, the assertion stays correct whether env vars are set or fall back to defaults. Do not hardcode `"254700000000"` in the test.
- **No mocks:** `FloatingWhatsApp` has no providers, hooks, or network calls. Use bare `render` from `@testing-library/react`, not `renderWithProviders`.
- **Lint-staged hook:** Commits run `eslint --fix` and `prettier --write` on changed files plus `tsc --noEmit`. If a commit fails, fix the underlying error and create a new commit — never `--amend` or `--no-verify`.
- **TikTok SVG:** kept inline because `lucide-react` does not provide a TikTok glyph (trademarked logo). Same rationale for the WhatsApp glyph in `FloatingWhatsApp`.
- **`as const` on `siteConfig`:** narrows literal types and prevents accidental mutation. Don't remove it.
