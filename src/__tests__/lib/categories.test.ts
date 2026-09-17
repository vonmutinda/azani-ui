import { describe, it, expect } from "vitest";
import {
  getCategoryIcon,
  toCategory,
  flattenCategories,
  findCategory,
  resolveToMainAndSub,
  TOP_LEVEL_HANDLES,
  CLOTHING_CATEGORY_HANDLES,
  LEGACY_CATEGORY_ALIASES,
  RETIRED_CATEGORY_HANDLES,
  resolveClothingCategoryHandle,
  isRetiredCategoryHandle,
  parseCategoryParam,
  serializeCategoryParam,
  resolveCategoryIds,
} from "@/lib/categories";
import { mockCategory, mockCategories } from "../fixtures";

describe("getCategoryIcon", () => {
  it("returns correct icon for known handles", () => {
    expect(getCategoryIcon("tops")).toBe("shirt");
    expect(getCategoryIcon("bottoms")).toBe("layout");
    expect(getCategoryIcon("dresses-jumpsuits")).toBe("sparkles");
    expect(getCategoryIcon("sets-outfits")).toBe("gift");
    expect(getCategoryIcon("knitwear-outerwear")).toBe("cloud");
    expect(getCategoryIcon("sleepwear")).toBe("moon");
    expect(getCategoryIcon("underwear-socks")).toBe("footprints");
  });

  it("returns a clothing icon as fallback for unknown handles", () => {
    expect(getCategoryIcon("unknown-category")).toBe("shirt");
  });
});

describe("TOP_LEVEL_HANDLES", () => {
  it("contains only the seven garment categories", () => {
    expect(TOP_LEVEL_HANDLES).toEqual([
      "tops",
      "bottoms",
      "dresses-jumpsuits",
      "sets-outfits",
      "knitwear-outerwear",
      "sleepwear",
      "underwear-socks",
    ]);
    expect(TOP_LEVEL_HANDLES).toBe(CLOTHING_CATEGORY_HANDLES);
  });
});

describe("legacy category routing", () => {
  it("maps compatible garment handles to canonical clothing categories", () => {
    expect(LEGACY_CATEGORY_ALIASES).toEqual({
      "tops-t-shirts": "tops",
      "dresses-outfits": "dresses-jumpsuits",
      "sleepwear-pajamas": "sleepwear",
      "socks-shoes": "underwear-socks",
    });
    expect(resolveClothingCategoryHandle("tops-t-shirts")).toBe("tops");
    expect(resolveClothingCategoryHandle("sleepwear")).toBe("sleepwear");
  });

  it("marks known non-clothing and age-incompatible legacy handles as retired", () => {
    expect(RETIRED_CATEGORY_HANDLES).toContain("feeding");
    expect(RETIRED_CATEGORY_HANDLES).toContain("mom-maternity");
    expect(RETIRED_CATEGORY_HANDLES).toContain("newborn-layette-sets");
    expect(isRetiredCategoryHandle("feeding")).toBe(true);
    expect(isRetiredCategoryHandle("tops")).toBe(false);
    expect(isRetiredCategoryHandle("tops-t-shirts")).toBe(false);
    expect(isRetiredCategoryHandle("not-a-known-handle")).toBe(false);
  });
});

describe("toCategory", () => {
  it("converts a Medusa category to Category shape", () => {
    const result = toCategory(mockCategory);
    expect(result.slug).toBe("bath-diapering");
    expect(result.name).toBe("Bath & Diapering");
    expect(result.icon).toBe("shirt");
    expect(result.description).toBe("Everything for bath time and diaper changes");
  });

  it("converts children recursively", () => {
    const result = toCategory(mockCategory);
    expect(result.children).toHaveLength(2);
    expect(result.children![0].slug).toBe("diapers-pull-ups");
    expect(result.children![1].slug).toBe("wipes");
  });
});

describe("flattenCategories", () => {
  it("flattens a category tree into a flat list", () => {
    const cats = mockCategories.map(toCategory);
    const flat = flattenCategories(cats);

    expect(flat.some((c) => c.slug === "bath-diapering")).toBe(true);
    expect(flat.some((c) => c.slug === "diapers-pull-ups")).toBe(true);
    expect(flat.some((c) => c.slug === "wipes")).toBe(true);
    expect(flat.some((c) => c.slug === "feeding")).toBe(true);
  });

  it("sets correct parent references", () => {
    const cats = mockCategories.map(toCategory);
    const flat = flattenCategories(cats);

    const diapers = flat.find((c) => c.slug === "diapers-pull-ups");
    expect(diapers?.parent).toBe("bath-diapering");

    const bathDiapering = flat.find((c) => c.slug === "bath-diapering");
    expect(bathDiapering?.parent).toBeUndefined();
  });
});

describe("findCategory", () => {
  it("finds a top-level category", () => {
    const cats = mockCategories.map(toCategory);
    const found = findCategory("bath-diapering", cats);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Bath & Diapering");
  });

  it("finds a nested category", () => {
    const cats = mockCategories.map(toCategory);
    const found = findCategory("diapers-pull-ups", cats);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Diapers & Pull-Ups");
  });

  it("returns undefined for non-existent slug", () => {
    const cats = mockCategories.map(toCategory);
    expect(findCategory("nonexistent", cats)).toBeUndefined();
  });
});

describe("resolveToMainAndSub", () => {
  const cats = [
    toCategory(mockCategory),
    toCategory(mockCategories[1]),
    toCategory(mockCategories[2]),
  ];

  it("resolves a top-level slug", () => {
    const result = resolveToMainAndSub("bath-diapering", cats);
    expect(result).toEqual({ main: "bath-diapering", sub: undefined });
  });

  it("resolves a child slug to its parent", () => {
    const result = resolveToMainAndSub("diapers-pull-ups", cats);
    expect(result).toEqual({ main: "bath-diapering", sub: "diapers-pull-ups" });
  });

  it("returns undefined for unknown slug", () => {
    expect(resolveToMainAndSub("nonexistent", cats)).toBeUndefined();
  });
});

describe("parseCategoryParam", () => {
  it("splits a comma-joined value into handles", () => {
    expect(parseCategoryParam("bottles,weaning")).toEqual(["bottles", "weaning"]);
  });

  it("returns an empty array for empty or missing values", () => {
    expect(parseCategoryParam(undefined)).toEqual([]);
    expect(parseCategoryParam(null)).toEqual([]);
    expect(parseCategoryParam("")).toEqual([]);
  });

  it("trims whitespace and drops blank entries", () => {
    expect(parseCategoryParam(" a , , b ")).toEqual(["a", "b"]);
  });
});

describe("serializeCategoryParam", () => {
  it("joins handles with commas", () => {
    expect(serializeCategoryParam(["a", "b"])).toBe("a,b");
  });

  it("returns undefined when there are no handles (so the param clears)", () => {
    expect(serializeCategoryParam([])).toBeUndefined();
  });
});

describe("resolveCategoryIds", () => {
  it("collects a category and all of its descendant ids", () => {
    expect(resolveCategoryIds(mockCategories, ["bath-diapering"]).sort()).toEqual(
      ["pcat_bath_diapering", "pcat_diapers", "pcat_wipes"].sort(),
    );
  });

  it("unions multiple handles", () => {
    const ids = resolveCategoryIds(mockCategories, ["wipes", "feeding"]);
    expect(ids).toContain("pcat_wipes");
    expect(ids).toContain("pcat_feeding");
    expect(ids).toHaveLength(2);
  });

  it("dedupes when a parent and one of its children are both selected", () => {
    // bath-diapering already includes wipes — wipes must not be counted twice
    expect(resolveCategoryIds(mockCategories, ["bath-diapering", "wipes"])).toHaveLength(3);
  });

  it("ignores unknown handles", () => {
    expect(resolveCategoryIds(mockCategories, ["does-not-exist"])).toEqual([]);
  });
});
