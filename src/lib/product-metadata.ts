import type { MedusaProduct } from "@/types/medusa";

export const BRAND_FILTERS = ["Azani Baby", "Pampers", "WaterWipes", "Chicco", "Momcozy", "Molfix"];

export const AGE_STAGE_FILTERS = [
  "Newborn+",
  "0-6 months",
  "6-12 months",
  "Toddler",
  "Parent care",
];

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

export function matchesMetadataFacet(
  product: MedusaProduct,
  facet: "brand" | "age_stage",
  value?: string | number,
): boolean {
  if (value === undefined || value === "") return true;
  const expected = String(value).toLowerCase();
  const actual = facet === "brand" ? getProductBrand(product) : getProductAgeStage(product);
  return actual?.toLowerCase() === expected;
}
