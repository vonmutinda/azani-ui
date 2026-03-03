import { describe, it, expect } from "vitest";
import {
  getCategoryIcon,
  toKokobCategory,
  flattenCategories,
  findCategory,
  resolveToMainAndSub,
  TOP_LEVEL_HANDLES,
} from "@/lib/categories";
import { mockCategory, mockCategories } from "../fixtures";

describe("getCategoryIcon", () => {
  it("returns correct icon for known handles", () => {
    expect(getCategoryIcon("baby-care")).toBe("baby");
    expect(getCategoryIcon("feeding")).toBe("utensils");
    expect(getCategoryIcon("clothing")).toBe("shirt");
    expect(getCategoryIcon("toys-games")).toBe("gamepad");
    expect(getCategoryIcon("mom")).toBe("heart-handshake");
  });

  it("returns 'baby' as fallback for unknown handles", () => {
    expect(getCategoryIcon("unknown-category")).toBe("baby");
  });

  it("returns correct icons for subcategories", () => {
    expect(getCategoryIcon("diapers")).toBe("baby");
    expect(getCategoryIcon("bath-tubs")).toBe("bath");
    expect(getCategoryIcon("breast-pumps")).toBe("heart");
    expect(getCategoryIcon("bikes")).toBe("bike");
  });
});

describe("TOP_LEVEL_HANDLES", () => {
  it("contains the 5 main categories", () => {
    expect(TOP_LEVEL_HANDLES).toEqual(["baby-care", "mom", "feeding", "toys-games", "clothing"]);
    expect(TOP_LEVEL_HANDLES).toHaveLength(5);
  });
});

describe("toKokobCategory", () => {
  it("converts a Medusa category to KokobCategory shape", () => {
    const result = toKokobCategory(mockCategory);
    expect(result.slug).toBe("baby-care");
    expect(result.name).toBe("Baby Care");
    expect(result.icon).toBe("baby");
    expect(result.description).toBe("Everything your little one needs");
  });

  it("converts children recursively", () => {
    const result = toKokobCategory(mockCategory);
    expect(result.children).toHaveLength(2);
    expect(result.children![0].slug).toBe("diapers");
    expect(result.children![1].slug).toBe("wipes");
  });
});

describe("flattenCategories", () => {
  it("flattens a category tree into a flat list", () => {
    const kokob = mockCategories.map(toKokobCategory);
    const flat = flattenCategories(kokob);

    expect(flat.some((c) => c.slug === "baby-care")).toBe(true);
    expect(flat.some((c) => c.slug === "diapers")).toBe(true);
    expect(flat.some((c) => c.slug === "wipes")).toBe(true);
    expect(flat.some((c) => c.slug === "feeding")).toBe(true);
  });

  it("sets correct parent references", () => {
    const kokob = mockCategories.map(toKokobCategory);
    const flat = flattenCategories(kokob);

    const diapers = flat.find((c) => c.slug === "diapers");
    expect(diapers?.parent).toBe("baby-care");

    const babyCare = flat.find((c) => c.slug === "baby-care");
    expect(babyCare?.parent).toBeUndefined();
  });
});

describe("findCategory", () => {
  it("finds a top-level category", () => {
    const kokob = mockCategories.map(toKokobCategory);
    const found = findCategory("baby-care", kokob);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Baby Care");
  });

  it("finds a nested category", () => {
    const kokob = mockCategories.map(toKokobCategory);
    const found = findCategory("diapers", kokob);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Diapers");
  });

  it("returns undefined for non-existent slug", () => {
    const kokob = mockCategories.map(toKokobCategory);
    expect(findCategory("nonexistent", kokob)).toBeUndefined();
  });
});

describe("resolveToMainAndSub", () => {
  const kokob = [
    toKokobCategory(mockCategory),
    toKokobCategory(mockCategories[1]),
    toKokobCategory(mockCategories[2]),
  ];

  it("resolves a top-level slug", () => {
    const result = resolveToMainAndSub("baby-care", kokob);
    expect(result).toEqual({ main: "baby-care", sub: undefined });
  });

  it("resolves a child slug to its parent", () => {
    const result = resolveToMainAndSub("diapers", kokob);
    expect(result).toEqual({ main: "baby-care", sub: "diapers" });
  });

  it("returns undefined for unknown slug", () => {
    expect(resolveToMainAndSub("nonexistent", kokob)).toBeUndefined();
  });
});
