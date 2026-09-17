import { MedusaProductCategory } from "@/types/medusa";

export type Category = {
  slug: string;
  name: string;
  icon: string;
  description?: string;
  children?: Category[];
};

/** Canonical garment categories exposed by the clothing catalogue. */
export const CLOTHING_CATEGORY_HANDLES = [
  "tops",
  "bottoms",
  "dresses-jumpsuits",
  "sets-outfits",
  "knitwear-outerwear",
  "sleepwear",
  "underwear-socks",
] as const;

export type ClothingCategoryHandle = (typeof CLOTHING_CATEGORY_HANDLES)[number];

/** Compatible former garment handles that can preserve a shopper's destination. */
export const LEGACY_CATEGORY_ALIASES = {
  "tops-t-shirts": "tops",
  "dresses-outfits": "dresses-jumpsuits",
  "sleepwear-pajamas": "sleepwear",
  "socks-shoes": "underwear-socks",
} as const satisfies Record<string, ClothingCategoryHandle>;

/** Known former departments that no longer belong in the clothing-only store. */
export const RETIRED_CATEGORY_HANDLES = [
  "feeding",
  "bath-diapering",
  "nursery",
  "baby-gear",
  "toys-books",
  "mom-maternity",
  "bottles-sippy-cups",
  "breast-pumps-milk-storage",
  "bottle-warmers-sterilizers",
  "baby-formula",
  "baby-food-snacks",
  "weaning-essentials",
  "high-chairs-booster-seats",
  "diapers-pull-ups",
  "wipes",
  "diaper-bags-changing-mats",
  "diaper-rash-skin-care",
  "bath-tubs-seats",
  "soaps-shampoos-wash",
  "towels-washcloths",
  "potty-training",
  "cribs-bassinets",
  "mattresses-bedding",
  "swaddles-sleep-sacks",
  "monitors-night-lights",
  "nursery-decor-storage",
  "strollers",
  "car-seats",
  "baby-carriers-wraps",
  "travel-bags-accessories",
  "playmats-activity-gyms",
  "baby-walkers-bouncers",
  "safety",
  "newborn-layette-sets",
  "bodysuits-onesies",
  "hats-accessories",
  "rattles-teethers",
  "stuffed-animals-soft-toys",
  "bath-toys",
  "ride-ons-bikes-cars",
  "building-stacking-toys",
  "books-learning",
  "pacifiers-soothers",
  "nursing-tops-bras",
  "nursing-pillows",
  "breast-care",
  "postpartum-recovery",
  "maternity-wear",
  "mom-self-care",
] as const;

const CLOTHING_CATEGORY_HANDLE_SET = new Set<string>(CLOTHING_CATEGORY_HANDLES);
const RETIRED_CATEGORY_HANDLE_SET = new Set<string>(RETIRED_CATEGORY_HANDLES);

export function resolveClothingCategoryHandle(handle: string): ClothingCategoryHandle | undefined {
  if (CLOTHING_CATEGORY_HANDLE_SET.has(handle)) return handle as ClothingCategoryHandle;
  return LEGACY_CATEGORY_ALIASES[handle as keyof typeof LEGACY_CATEGORY_ALIASES];
}

export function isRetiredCategoryHandle(handle: string): boolean {
  return RETIRED_CATEGORY_HANDLE_SET.has(handle);
}

/** Icon mapping for the canonical garment handles. */
const CATEGORY_ICONS: Record<string, string> = {
  tops: "shirt",
  bottoms: "layout",
  "dresses-jumpsuits": "sparkles",
  "sets-outfits": "gift",
  "knitwear-outerwear": "cloud",
  sleepwear: "moon",
  "underwear-socks": "footprints",
};

/** Compatibility name used by existing category-tree consumers. */
export const TOP_LEVEL_HANDLES: readonly string[] = CLOTHING_CATEGORY_HANDLES;

export function getCategoryIcon(handle: string): string {
  return CATEGORY_ICONS[handle] ?? "shirt";
}

/** Convert Medusa categories to our local Category shape for navigation */
export function toCategory(cat: MedusaProductCategory): Category {
  return {
    slug: cat.handle,
    name: cat.name,
    icon: getCategoryIcon(cat.handle),
    description: cat.description,
    children: cat.category_children?.map(toCategory),
  };
}

/** Flatten categories into a flat list */
export function flattenCategories(
  cats: Category[],
  parent?: string,
): { slug: string; name: string; parent?: string }[] {
  const result: { slug: string; name: string; parent?: string }[] = [];
  for (const cat of cats) {
    result.push({ slug: cat.slug, name: cat.name, parent });
    if (cat.children) {
      result.push(...flattenCategories(cat.children, cat.slug));
    }
  }
  return result;
}

export function findCategory(slug: string, cats: Category[]): Category | undefined {
  for (const cat of cats) {
    if (cat.slug === slug) return cat;
    if (cat.children) {
      const found = findCategory(slug, cat.children);
      if (found) return found;
    }
  }
  return undefined;
}

export function resolveToMainAndSub(
  slug: string,
  topCategories: Category[],
): { main: string; sub: string | undefined } | undefined {
  for (const top of topCategories) {
    if (top.slug === slug) return { main: top.slug, sub: undefined };
    if (top.children && findCategory(slug, top.children)) {
      return { main: top.slug, sub: slug };
    }
  }
  return undefined;
}

// ── Multi-select category filtering ─────────────────────────────────
// The `category` query param holds a comma-joined list of handles, so the
// listing can filter by several (sub)categories at once.

/** Parse the `category` param into a list of handles. */
export function parseCategoryParam(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((handle) => handle.trim())
    .filter(Boolean);
}

/** Serialise selected handles back to a param value (undefined clears it). */
export function serializeCategoryParam(handles: string[]): string | undefined {
  const cleaned = handles.filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(",") : undefined;
}

/** Find a Medusa category anywhere in the tree by its handle. */
export function findMedusaCategory(
  categories: MedusaProductCategory[],
  handle: string,
): MedusaProductCategory | undefined {
  for (const cat of categories) {
    if (cat.handle === handle) return cat;
    const match = cat.category_children
      ? findMedusaCategory(cat.category_children, handle)
      : undefined;
    if (match) return match;
  }
  return undefined;
}

/** A category id plus all of its descendant ids. */
export function collectCategoryIds(cat: MedusaProductCategory): string[] {
  const ids = [cat.id];
  for (const child of cat.category_children ?? []) {
    ids.push(...collectCategoryIds(child));
  }
  return ids;
}

/**
 * Resolve selected handles to the deduped union of their subtree ids — what we
 * pass to `getProducts({ category_id })` for a server-side OR across categories.
 * Selecting a parent therefore includes its children. Unknown handles are skipped.
 */
export function resolveCategoryIds(
  categories: MedusaProductCategory[],
  handles: string[],
): string[] {
  const ids = new Set<string>();
  for (const handle of handles) {
    const node = findMedusaCategory(categories, handle);
    if (!node) continue;
    for (const id of collectCategoryIds(node)) ids.add(id);
  }
  return [...ids];
}
