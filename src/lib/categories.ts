import { MedusaProductCategory } from "@/types/medusa";

export type Category = {
  slug: string;
  name: string;
  icon: string;
  description?: string;
  children?: Category[];
};

/** Icon mapping for known category handles */
const CATEGORY_ICONS: Record<string, string> = {
  // Top-level
  feeding: "utensils",
  "bath-diapering": "bath",
  nursery: "moon",
  "baby-gear": "car",
  clothing: "shirt",
  "toys-books": "gamepad",
  "mom-maternity": "heart-handshake",

  // Feeding
  "bottles-sippy-cups": "milk",
  "breast-pumps-milk-storage": "heart",
  "bottle-warmers-sterilizers": "thermometer",
  "baby-formula": "milk",
  "baby-food-snacks": "apple",
  "weaning-essentials": "utensils",
  "high-chairs-booster-seats": "armchair",

  // Bath & Diapering
  "diapers-pull-ups": "baby",
  wipes: "sparkles",
  "diaper-bags-changing-mats": "briefcase",
  "diaper-rash-skin-care": "heart",
  "bath-tubs-seats": "bath",
  "soaps-shampoos-wash": "sparkles",
  "towels-washcloths": "bath",
  "potty-training": "baby",

  // Nursery
  "cribs-bassinets": "bed",
  "mattresses-bedding": "bed",
  "swaddles-sleep-sacks": "moon",
  "monitors-night-lights": "moon",
  "nursery-decor-storage": "star",

  // Baby Gear
  strollers: "car",
  "car-seats": "car",
  "baby-carriers-wraps": "briefcase",
  "travel-bags-accessories": "briefcase",
  "playmats-activity-gyms": "layout",
  "baby-walkers-bouncers": "baby",
  safety: "shield",

  // Clothing
  "newborn-layette-sets": "gift",
  "bodysuits-onesies": "shirt",
  "sleepwear-pajamas": "moon",
  "tops-t-shirts": "shirt",
  bottoms: "shirt",
  "dresses-outfits": "sparkles",
  "socks-shoes": "footprints",
  "hats-accessories": "crown",

  // Toys & Books
  "rattles-teethers": "star",
  "stuffed-animals-soft-toys": "heart",
  "bath-toys": "bath",
  "ride-ons-bikes-cars": "bike",
  "building-stacking-toys": "gamepad",
  "books-learning": "book",
  "pacifiers-soothers": "baby",

  // Mom & Maternity
  "nursing-tops-bras": "shirt",
  "nursing-pillows": "cloud",
  "breast-care": "heart",
  "postpartum-recovery": "heart",
  "maternity-wear": "shirt",
  "mom-self-care": "sparkles",
};

/** Top-level category handles (the 7 main categories) */
export const TOP_LEVEL_HANDLES = [
  "feeding",
  "bath-diapering",
  "nursery",
  "baby-gear",
  "clothing",
  "toys-books",
  "mom-maternity",
];

export const TOP_LEVEL_CATEGORY_NAV: Category[] = [
  {
    slug: "feeding",
    name: "Feeding",
    icon: "utensils",
    description: "Bottles, weaning, high chairs, and feeding essentials.",
  },
  {
    slug: "bath-diapering",
    name: "Bath & Diapering",
    icon: "bath",
    description: "Diapers, wipes, bath time, and gentle care.",
  },
  {
    slug: "nursery",
    name: "Nursery",
    icon: "moon",
    description: "Sleep, bedding, monitors, and nursery organization.",
  },
  {
    slug: "baby-gear",
    name: "Baby Gear",
    icon: "car",
    description: "Strollers, car seats, carriers, and travel gear.",
  },
  {
    slug: "clothing",
    name: "Clothing",
    icon: "shirt",
    description: "Everyday outfits, sleepwear, shoes, and accessories.",
  },
  {
    slug: "toys-books",
    name: "Toys & Books",
    icon: "gamepad",
    description: "Play, learning, books, teethers, and soft toys.",
  },
  {
    slug: "mom-maternity",
    name: "Mom & Maternity",
    icon: "heart-handshake",
    description: "Nursing, maternity wear, recovery, and self-care.",
  },
];

export function getCategoryIcon(handle: string): string {
  return CATEGORY_ICONS[handle] ?? "baby";
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
