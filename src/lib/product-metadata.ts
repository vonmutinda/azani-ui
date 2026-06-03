import type { MedusaProduct } from "@/types/medusa";

// Canonical ordering for the facet lists. These are *fallbacks* — the listing
// derives the options it actually shows from the loaded products (see
// `collectFacetOptions`) so we never offer a brand/stage with no matching
// product, and never miss one that exists. The canonical order is reused to
// keep the sidebar stable regardless of fetch order.
export const BRAND_FILTERS = ["Azani Baby", "Pampers", "WaterWipes", "Chicco", "Momcozy", "Molfix"];

export const AGE_STAGE_FILTERS = [
  "Newborn+",
  "0-6 months",
  "6-12 months",
  "Toddler",
  "Parent care",
];

type Facet = "brand" | "age_stage";

function facetValue(product: MedusaProduct, facet: Facet): string | null {
  return facet === "brand" ? getProductBrand(product) : getProductAgeStage(product);
}

function readString(product: MedusaProduct, keys: string[]): string | null {
  for (const key of keys) {
    const value = product.metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function readNumber(product: MedusaProduct, keys: string[]): number | null {
  for (const key of keys) {
    const value = product.metadata?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

export function getProductBrand(product: MedusaProduct): string | null {
  return readString(product, ["brand", "maker", "manufacturer"]);
}

export function getProductAgeStage(product: MedusaProduct): string | null {
  return readString(product, ["age_stage", "ageStage", "stage", "age_range"]);
}

export function getProductBadge(product: MedusaProduct): string | null {
  return readString(product, ["badge", "merch_badge", "label"]);
}

export function getProductRating(product: MedusaProduct): {
  rating: number;
  reviewCount: number;
} | null {
  const rating = readNumber(product, ["rating"]);
  if (rating == null) return null;
  return {
    rating,
    reviewCount: readNumber(product, ["review_count", "reviewCount", "reviews"]) ?? 0,
  };
}

export function getProductColorCount(product: MedusaProduct): number | null {
  const explicit = readNumber(product, ["color_count", "colour_count", "colorCount"]);
  if (explicit != null && explicit > 0) return explicit;
  const colorOption = product.options?.find((option) => /colou?r/i.test(option.title));
  return colorOption?.values?.length ? colorOption.values.length : null;
}

export function isRecentlyCreated(product: MedusaProduct): boolean {
  if (!product.created_at) return false;
  return Date.now() - new Date(product.created_at).getTime() < 30 * 24 * 60 * 60 * 1000;
}

/** Parse a comma-joined facet param (e.g. "Pampers,Chicco") into a list of values. */
export function parseFacetParam(value?: string | number | null): string[] {
  if (value == null) return [];
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Serialise selected facet values back to a param (undefined clears it). De-dupes, preserves order. */
export function serializeFacetParam(values: string[]): string | undefined {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique.length > 0 ? unique.join(",") : undefined;
}

/**
 * OR-match a product against a list of selected facet values (case-insensitive).
 * An empty/absent selection matches everything.
 */
export function matchesMetadataFacet(
  product: MedusaProduct,
  facet: Facet,
  values?: string[],
): boolean {
  if (!values || values.length === 0) return true;
  const actual = facetValue(product, facet)?.toLowerCase();
  if (!actual) return false;
  return values.some((value) => value.trim().toLowerCase() === actual);
}

/**
 * Build the facet options to show for a set of products: the values actually
 * present, ordered by the canonical list first, then any extras alphabetically.
 * `ensure` keeps currently-selected values visible even if absent from the set.
 */
export function collectFacetOptions(
  products: MedusaProduct[],
  facet: Facet,
  ensure: string[] = [],
): string[] {
  const canonical = facet === "brand" ? BRAND_FILTERS : AGE_STAGE_FILTERS;
  const present = new Set<string>();
  for (const product of products) {
    const value = facetValue(product, facet);
    if (value) present.add(value);
  }
  for (const value of ensure) {
    const trimmed = value.trim();
    if (trimmed) present.add(trimmed);
  }
  const ordered: string[] = [];
  for (const value of canonical) {
    if (present.delete(value)) ordered.push(value);
  }
  // Anything present that isn't in the canonical list, alphabetically.
  ordered.push(...[...present].sort((a, b) => a.localeCompare(b)));
  return ordered;
}
