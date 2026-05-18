# Azani Content, Imagery, and Merchandising Guidelines

Azani is a baby boutique for Kenyan parents and gift buyers. The store should feel warm,
practical, polished, and specific to baby care, without becoming cute for its own sake.
Every homepage, PLP, PDP, checkout, account, and merchandising update should help a parent
quickly answer: Is this product right for my baby, is it available, how will it arrive, and
what happens after I pay?

Kiabi can be used as a benchmark for retail maturity, hierarchy, and polish only. Do not copy
Kiabi copy, imagery, composition, icon treatments, category language, campaign naming, or
visual assets.

## Core Content Principles

- Lead with the parent need before the product category: feeding, sleep, bath time, travel,
  gifting, nursery setup, or daily restocking.
- Keep claims specific and provable. Replace broad claims like "trusted by parents" with
  evidence such as "M-Pesa confirmation before order creation", "delivery fee shown at
  checkout", or "packaging checked before dispatch".
- Use calm, helpful retail language. Avoid panic, exaggerated urgency, and medical promises.
- Write for scanning. Product cards and checkout states should use short lines; PDPs can carry
  the practical detail.
- Use Kenya-specific context where it is useful: KSh pricing, Nairobi delivery windows, M-Pesa,
  Paybill instructions, and local support channels.
- Keep baby language mature. "Little one" is acceptable in hero or campaign copy, but product
  and checkout copy should stay direct.

## Product Image Standards

### Product Cards

- Use a 4:5 media well for PLP and repeated cards. This matches the current
  `ProductCard` aspect ratio and gives enough vertical room for bottles, diapers, clothing,
  strollers, and nursery products.
- Use `object-cover` only when the product is safely centered with breathing room. If the image
  crops product information, packaging, straps, wheels, sizing labels, or care claims, replace
  the asset rather than adjusting the card per product.
- Keep product card backgrounds light, quiet, and product-first: warm white, very pale grey,
  pale product-media tint, or a clean tabletop.
- Product card fallbacks should be factual and low-emotion: "No image" or "Image coming soon".
  Do not invent product detail in fallback copy.
- The first image must identify the product without needing the PDP. For bundles, show the
  full bundle, not a single item unless the title says it is a single item.

### Product Detail Pages

- Use a 4:5 primary gallery frame for PDP imagery. The current PDP uses the same product-media
  ratio, which keeps page rhythm consistent between PLP and PDP.
- The first PDP image should be a clear packshot or product-led lifestyle shot. Secondary images
  may show scale, use, packaging detail, variant color, safety label, or bundle contents.
- Prefer 1600 x 2000 source files for PDP primary images and at least 1200 x 1500 for product
  card sources. Export as optimized JPG or WebP unless transparency is required.
- Use `object-cover` for approved catalog assets and thumbnails. Use `object-contain` only for
  carousel or packshot contexts where preserving full packaging matters more than filling the
  frame.
- Avoid text-heavy images. Product facts belong in PDP content so they remain accessible,
  searchable, and editable.
- When an image fails, keep the PDP usable. The current fallback pattern, "Image coming soon"
  plus "Product details are still available below", is the right tone.

### Crops and Backgrounds

- Center the product with 8-12 percent breathing room on each side for small goods and at least
  15 percent for large gear such as car seats, strollers, high chairs, and bassinets.
- Clothing should show shape, closure, and texture. Folded clothing is acceptable for cards,
  but PDP secondary images should include scale or worn/flat-lay context.
- Feeding, diapering, and bath products should make packaging legible where parents rely on
  size, count, scent, age range, or skin-sensitivity cues.
- Baby gear should show the full product silhouette first. Do not crop wheels, handles, harnesses,
  legs, or canopies in the first image.
- Backgrounds may support a category mood but must not compete with the product. No dark nurseries,
  heavy blur, bokeh, oversized props, or decorative color fields behind catalog products.

### Remote Hosts and Staging Validation

Product imagery must be validated before release, especially when assets come from Medusa,
Railway, S3, MinIO, or a new staging host.

1. Confirm every image host is allowed by `next.config.ts` or `NEXT_PUBLIC_IMAGE_HOSTS`.
2. In staging, load homepage, PLP, PDP, cart, checkout, account orders, and wishlist surfaces
   with representative product images.
3. Check browser console and network logs for blocked image domains, 403 responses, mixed
   content, oversized files, or failed Next image optimization.
4. Visually inspect desktop and mobile breakpoints for the 4:5 card crop, PDP primary crop,
   thumbnail crops, cart/order thumbnails, and checkout summary thumbnails.
5. Confirm broken or missing images fall back to the approved fallback states without layout
   shift or blank media wells.
6. Verify staging assets are real product or campaign assets. Unsplash or stock placeholders are
   acceptable for local mocks only and must not ship as release-candidate merchandising imagery.

## Category, Campaign, and Merchandising Imagery

Category and campaign imagery should show the shopping mission, not generic baby atmosphere.
Use images that help parents understand what the section contains.

- Feeding: bottles, pump parts, bibs, high chair tray, weaning bowls, or formula packaging,
  staged cleanly and brightly.
- Bath and diapering: diapers, wipes, bath support, towels, or changing essentials with dry,
  hygienic styling. Avoid bathtub glamour shots where the product is unclear.
- Nursery: bedding, crib sheets, night lights, bassinets, monitors, or storage scenes with
  the product visible and the room calm.
- Baby gear: full stroller, car seat, carrier, or high chair silhouettes with enough space to
  judge scale.
- Clothing: bodysuits, sleepwear, socks, shoes, and occasion outfits with fabric detail and
  easy-to-read sizing context.
- Toys and books: safe play setup with the toy or book dominant. Avoid cluttered playroom stock.
- Mom and maternity: nursing pillows, maternity basics, self-care items, and feeding support
  handled respectfully and practically.

Campaign images should have one clear retail job: launch a collection, explain a seasonal need,
promote a bundle, or route a parent to a category. Do not use campaigns as decoration. If the
campaign cannot name the product family and the parent need, it is not ready.

## Voice and Copy Rules

### Hero and Campaign Copy

Hero copy should establish Azani as a practical, curated baby boutique. Keep the headline short,
then let the subcopy explain the parent benefit.

Use:

- Headline: "Baby essentials for every new routine"
- Subcopy: "Curated feeding, diapering, nursery, clothing, and gear picks for Kenyan families."
- CTA: "Shop essentials" or "See new arrivals"
- Campaign label: "Newborn setup"
- Campaign headline: "Build a calm first-month kit"
- Campaign body: "Start with diapers, wipes, swaddles, bottles, and bath basics that are easy to
  restock."

Avoid:

- "Everything your little one needs" when the page cannot prove the breadth.
- "Trusted by 10,000+ parents" unless that number is sourced and current.
- Any phrase copied from Kiabi or another retailer.

### Category Intro Copy

Category intros should describe what the parent can solve in that category and name the product
types they will see.

Use:

- Feeding: "Bottles, weaning tools, bibs, pumps, and food-time basics for everyday feeds."
- Bath and diapering: "Diapers, wipes, bath supports, towels, and changing essentials for quick
  daily care."
- Nursery: "Sleep, storage, bedding, monitors, and night-time helpers for a calmer room."
- Clothing: "Soft bodysuits, sleepwear, socks, shoes, and occasion outfits organized by stage."

Avoid:

- "Find exactly what you need" as the only category support.
- Generic lines such as "Shop our amazing range" or "Discover the best products".

### Product-Card Microcopy

Product-card copy must help a shopper decide quickly without crowding the card.

Use:

- Badges: "New", "Sale", "Low stock", "Bundle", "Restock"
- Availability: "In stock", "Only 3 left", "Out of stock", "Max in cart"
- Price display: `KSh2,590.00` with a struck original price only when the discount is real.
- Quick-add labels: "Quick add Pampers Premium Care Diapers" and "Pampers Premium Care Diapers is
  out of stock"

Avoid:

- Cute filler such as "So adorable!" or "Baby approved".
- Pressure copy such as "Hurry!!!" or "Last chance" unless inventory logic proves it.
- Long benefit claims in cards. Move those to PDP overview or campaign copy.

### Product Detail Copy

PDP copy should move from decision support to care confidence.

Use:

- Overview: "Soft overnight diapers with breathable layers, stretchy sides, and wetness
  indicators for everyday use."
- Essentials: "Category: Bath and diapering", "Brand: Pampers", "Selected option: Size 3 -
  48 Count", "SKU: PAMPERS-2"
- Care and use: "Check the label and product packaging before first use."

Avoid:

- Medical, developmental, or safety claims that are not directly supported by supplier
  documentation.
- Vague benefits such as "premium quality" without explaining the material, count, fit, feature,
  or dispatch check.

### Trust and Service Messaging

Trust copy must be attached to a real operational behavior.

Use:

- "Packaging checked before dispatch"
- "Delivery options shown before payment"
- "M-Pesa order created after captured payment"
- "WhatsApp help for sizing, stock, and delivery questions"
- "Free shipping on orders over KSh5,000"
- "Same-day express delivery, KSh500, where available"

Avoid:

- "Certified and tested" unless certification documents are available and the claim names what is
  certified.
- "Expert support" unless Azani can identify the support channel, coverage, or source of advice.
- "Trusted by parents" without review count, order count, or another current evidence source.

### Promo Copy

Promo copy should state the offer, eligible products, and the condition.

Use:

- "Free shipping over KSh5,000"
- "Newborn bundle: diapers, wipes, and swaddles from KSh4,990"
- "Feeding restock: save on bottle and bib bundles this week"
- "New clothing arrivals in 0-3, 3-6, and 6-9 months"

Avoid:

- "Huge sale" without a discount or eligible product set.
- "Best prices" unless there is a documented price comparison policy.
- Decorative campaign labels that do not connect to a shopping task.

### Checkout Reassurance Copy

Checkout copy should explain what is happening now, what the shopper must do next, and when an
order will be created.

Use:

- Address: "You can use a saved address or enter a different delivery address."
- Shipping: "Your order qualifies for free shipping."
- M-Pesa Express pending: "Enter your M-Pesa PIN on +254... Your order will be created after
  payment is captured by M-Pesa."
- Manual Paybill: "Keep this order number as your Paybill reference. We only dispatch after
  payment is confirmed."
- Confirmation: "Your payment was confirmed, so your order has been created."

Avoid:

- "Order placed" before captured M-Pesa Express payment.
- "Payment successful" for manual Paybill before ops has reconciled the payment.
- Reassurance that hides a required action, such as Paybill account number entry.

### Empty States

Empty states should be helpful, specific, and action-oriented.

Use:

- Empty cart: "Your cart is empty. Add essentials to your cart and we'll keep checkout quick."
- Empty checkout: "No items to checkout. Add products to your cart first."
- Empty wishlist, signed in: "Your wishlist is empty. Save products while comparing sizes,
  bundles, and restocks."
- Empty wishlist, guest: "Save products as a guest, or sign in to keep them synced to your
  account."
- No PLP results: "No products found. Try adjusting your filters or search terms."

Avoid:

- Blame language such as "You made an invalid search."
- Dead-end empty states with no link or recovery action.
- Overly playful copy when the shopper is trying to solve a practical care need.

### Error States

Error states should name the problem plainly, protect trust, and offer a next action.

Use:

- Product load error: "We couldn't load products. Check your connection and try loading this
  browse view again."
- Address error: "Failed to save address. Check your details and try again."
- Shipping error: "No shipping methods available. Please go back and verify your address."
- Cart stock error: "Some items in your cart are no longer available in the requested quantity.
  Return to your cart to adjust them before checking out."
- Add-to-cart error: "Failed to add to cart. Please try again."

Avoid:

- Raw backend errors unless they are already safe, readable, and action-oriented.
- Jokes or cute language in payment, stock, or address errors.
- Generic "Something went wrong" without a recovery path when the UI can offer one.

## Do Not Do This

- Do not copy Kiabi copy, visuals, category language, section layouts, merchandising treatments,
  or campaign names. Kiabi is inspiration for quality and maturity only.
- Do not use generic dark, blurred, or stock-like baby imagery where the product cannot be
  inspected.
- Do not use decorative backgrounds, icons, patterns, or color fields that compete with product
  imagery.
- Do not make vague trust claims without evidence. Claims must tie to delivery policy, payment
  behavior, support channel, certification, review count, or operational process.
- Do not use placeholder marketplace images, Unsplash scenes, or supplier-watermarked images in a
  release candidate.
- Do not crop packaging, size counts, harnesses, safety labels, or bundle contents out of the
  first product image.
- Do not turn baby-boutique copy into novelty voice. Parents need calm, clear help.

## First Release Candidate Asset Gaps

The current `public/` folder contains only generic starter SVGs and the Azani logo. The mock
Medusa server still uses remote Unsplash URLs, which are useful for local testing but not release
candidate merchandising assets. Before the first release candidate, Azani needs:

- Product packshots for every launch SKU, with first images approved at 4:5 crop.
- PDP secondary images for top launch products: packaging detail, scale, variant, bundle contents,
  or use context.
- Category imagery for Feeding, Bath and Diapering, Nursery, Baby Gear, Clothing, Toys and Books,
  and Mom and Maternity.
- Homepage campaign assets for at least: newborn setup, feeding restock, bath and diapering
  restock, clothing arrivals, and baby gear travel.
- Checkout/order thumbnail validation using real Medusa thumbnails, not only mock images.
- Logo-safe social preview image and favicon assets beyond the default Next.js starter files.
- Documented image-host decision for release: production S3/Medusa host, Railway MinIO host, or
  CDN host, with the final domain added to image configuration.
- Evidence source for any trust claims, including delivery windows, support channel coverage,
  product checks, and certification language.

## Contributor Checklist

Before adding a new section, category, or product:

1. Name the parent need the section solves.
2. Confirm the product image crop works in product card, PDP, cart, checkout, account, and
   wishlist contexts.
3. Use real operational proof for trust copy.
4. Keep category and campaign copy specific to the assortment.
5. Validate image hosts and fallbacks in staging before release.
6. Check copy against the "Do not do this" rules above.
7. Add unresolved asset needs to the release-gate issue instead of hiding them in vague TODOs.
