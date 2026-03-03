import { MedusaProductCategory } from "@/types/medusa";

export type KokobCategory = {
  slug: string;
  name: string;
  icon: string;
  description?: string;
  children?: KokobCategory[];
};

/** Icon mapping for known category handles */
const CATEGORY_ICONS: Record<string, string> = {
  "baby-care": "baby",
  "potty-training": "baby",
  diapers: "baby",
  wipes: "sparkles",
  towels: "bath",
  formula: "milk",
  bathing: "bath",
  "bath-tubs": "bath",
  "soaps-shampoos": "sparkles",
  "bathing-towels": "bath",
  "grooming-skin-care": "heart",
  aveeno: "heart",
  "johnson-johnson": "heart",
  mustela: "heart",
  "diaper-rash-creams": "heart",
  aquaphor: "heart",
  vaseline: "heart",
  "coconut-oil": "heart",
  "baby-accessories": "star",
  teethers: "star",
  pacifiers: "star",
  nursery: "moon",
  "cribs-beds": "moon",
  basinets: "moon",
  beddings: "moon",
  travelling: "car",
  "baby-carrier": "briefcase",
  "car-seat": "car",
  "changing-mat": "layout",
  "travelling-bag": "briefcase",
  safety: "shield",
  "guards-locks": "shield",
  mom: "heart-handshake",
  breastfeeding: "heart",
  "nursing-tshirts": "shirt",
  "nursing-bras": "heart",
  "nursing-pillow": "cloud",
  "breast-care": "heart",
  "nipple-cream": "heart",
  "breast-pads": "circle",
  postpartum: "heart",
  "adult-diapers": "heart",
  "disposable-underwear": "heart",
  feeding: "utensils",
  "milk-water-bottles": "milk",
  "feeding-chair": "layout",
  weaning: "utensils",
  "breast-pumps": "heart",
  "bottle-warmers": "thermometer",
  "milk-storage": "package",
  "baby-foods": "sparkles",
  cereal: "wheat",
  "pasta-grains": "wheat",
  "toys-games": "gamepad",
  "bathing-toys": "bath",
  floaters: "fish",
  "water-guns": "droplets",
  books: "book",
  "toy-cars": "car",
  bikes: "bike",
  mats: "layout",
  "stuffed-animals": "heart",
  clothing: "shirt",
  "receiving-sets": "gift",
  "diaper-tshirts": "shirt",
  "pajamas-bodysuits": "moon",
  socks: "footprints",
  shoes: "footprints",
  "baby-shirts": "shirt",
  "baby-shorts": "shirt",
  "baby-pants": "shirt",
  dresses: "sparkles",
  hats: "crown",
};

/** Top-level category handles (the 5 main categories in Kokob) */
export const TOP_LEVEL_HANDLES = ["baby-care", "mom", "feeding", "toys-games", "clothing"];

export function getCategoryIcon(handle: string): string {
  return CATEGORY_ICONS[handle] ?? "baby";
}

/** Convert Medusa categories to our local KokobCategory shape for navigation */
export function toKokobCategory(cat: MedusaProductCategory): KokobCategory {
  return {
    slug: cat.handle,
    name: cat.name,
    icon: getCategoryIcon(cat.handle),
    description: cat.description,
    children: cat.category_children?.map(toKokobCategory),
  };
}

/** Flatten categories into a flat list */
export function flattenCategories(cats: KokobCategory[], parent?: string): { slug: string; name: string; parent?: string }[] {
  const result: { slug: string; name: string; parent?: string }[] = [];
  for (const cat of cats) {
    result.push({ slug: cat.slug, name: cat.name, parent });
    if (cat.children) {
      result.push(...flattenCategories(cat.children, cat.slug));
    }
  }
  return result;
}

export function findCategory(slug: string, cats: KokobCategory[]): KokobCategory | undefined {
  for (const cat of cats) {
    if (cat.slug === slug) return cat;
    if (cat.children) {
      const found = findCategory(slug, cat.children);
      if (found) return found;
    }
  }
  return undefined;
}

export function resolveToMainAndSub(slug: string, topCategories: KokobCategory[]): { main: string; sub: string | undefined } | undefined {
  for (const top of topCategories) {
    if (top.slug === slug) return { main: top.slug, sub: undefined };
    if (top.children && findCategory(slug, top.children)) {
      return { main: top.slug, sub: slug };
    }
  }
  return undefined;
}
