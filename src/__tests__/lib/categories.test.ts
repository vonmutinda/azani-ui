import { describe, it, expect } from "vitest";
import {
  getCategoryIcon,
  toCategory,
  flattenCategories,
  findCategory,
  resolveToMainAndSub,
  TOP_LEVEL_HANDLES,
} from "@/lib/categories";
import { mockCategory, mockCategories } from "../fixtures";

describe("getCategoryIcon", () => {
  it("returns correct icon for known handles", () => {
    expect(getCategoryIcon("feeding")).toBe("utensils");
    expect(getCategoryIcon("bath-diapering")).toBe("bath");
    expect(getCategoryIcon("nursery")).toBe("moon");
    expect(getCategoryIcon("baby-gear")).toBe("car");
    expect(getCategoryIcon("clothing")).toBe("shirt");
    expect(getCategoryIcon("toys-books")).toBe("gamepad");
    expect(getCategoryIcon("mom-maternity")).toBe("heart-handshake");
  });

  it("returns 'baby' as fallback for unknown handles", () => {
    expect(getCategoryIcon("unknown-category")).toBe("baby");
  });

  it("returns correct icons for subcategories", () => {
    expect(getCategoryIcon("diapers-pull-ups")).toBe("baby");
    expect(getCategoryIcon("bath-tubs-seats")).toBe("bath");
    expect(getCategoryIcon("breast-pumps-milk-storage")).toBe("heart");
    expect(getCategoryIcon("ride-ons-bikes-cars")).toBe("bike");
  });
});

describe("TOP_LEVEL_HANDLES", () => {
  it("contains the 7 main categories", () => {
    expect(TOP_LEVEL_HANDLES).toEqual([
      "feeding",
      "bath-diapering",
      "nursery",
      "baby-gear",
      "clothing",
      "toys-books",
      "mom-maternity",
    ]);
    expect(TOP_LEVEL_HANDLES).toHaveLength(7);
  });
});

describe("toCategory", () => {
  it("converts a Medusa category to Category shape", () => {
    const result = toCategory(mockCategory);
    expect(result.slug).toBe("bath-diapering");
    expect(result.name).toBe("Bath & Diapering");
    expect(result.icon).toBe("bath");
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
