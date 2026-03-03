import { describe, it, expect } from "vitest";
import {
  formatPrice,
  getProductPrice,
  getVariantPrice,
  getProductOriginalPrice,
  resolveProductImage,
  stripHtml,
} from "@/lib/formatters";
import { mockProduct, mockProductMinimal } from "../fixtures";

describe("formatPrice", () => {
  it("formats ETB amounts with Br prefix (divides by 100)", () => {
    expect(formatPrice(1500)).toBe("Br15.00");
    expect(formatPrice(85000)).toBe("Br850.00");
  });

  it("returns '--' for undefined", () => {
    expect(formatPrice(undefined)).toBe("--");
  });

  it("handles zero amount", () => {
    expect(formatPrice(0)).toBe("Br0.00");
  });
});

describe("getProductPrice", () => {
  it("returns the first variant price in ETB", () => {
    const price = getProductPrice(mockProduct);
    expect(price).not.toBeNull();
    expect(price!.amount).toBe(1500);
    expect(price!.currency).toBe("etb");
    expect(price!.formatted).toBe("Br15.00");
  });

  it("returns null for product without variants", () => {
    const price = getProductPrice(mockProductMinimal);
    expect(price).toBeNull();
  });

  it("prefers calculated_price over static prices", () => {
    const product = {
      ...mockProduct,
      variants: [
        {
          ...mockProduct.variants![0],
          calculated_price: {
            calculated_amount: 1200,
            original_amount: 1500,
            currency_code: "etb",
          },
        },
      ],
    };
    const price = getProductPrice(product);
    expect(price!.amount).toBe(1200);
    expect(price!.formatted).toBe("Br12.00");
  });
});

describe("getVariantPrice", () => {
  it("returns formatted ETB price for variant", () => {
    const variant = mockProduct.variants![0];
    expect(getVariantPrice(variant)).toBe("Br15.00");
  });

  it("returns '--' for variant with no prices", () => {
    const variant = { id: "v", title: "test" };
    expect(getVariantPrice(variant)).toBe("--");
  });
});

describe("getProductOriginalPrice", () => {
  it("returns null when no calculated_price", () => {
    expect(getProductOriginalPrice(mockProduct)).toBeNull();
  });

  it("returns original price when discounted", () => {
    const product = {
      ...mockProduct,
      variants: [
        {
          ...mockProduct.variants![0],
          calculated_price: {
            calculated_amount: 1200,
            original_amount: 1500,
            currency_code: "etb",
          },
        },
      ],
    };
    expect(getProductOriginalPrice(product)).toBe("Br15.00");
  });

  it("returns null when original equals calculated", () => {
    const product = {
      ...mockProduct,
      variants: [
        {
          ...mockProduct.variants![0],
          calculated_price: {
            calculated_amount: 1500,
            original_amount: 1500,
            currency_code: "etb",
          },
        },
      ],
    };
    expect(getProductOriginalPrice(product)).toBeNull();
  });
});

describe("resolveProductImage", () => {
  it("returns thumbnail when available", () => {
    expect(resolveProductImage(mockProduct)).toBe("https://example.com/pampers.jpg");
  });

  it("falls back to first image url", () => {
    const product = { ...mockProduct, thumbnail: null };
    expect(resolveProductImage(product)).toBe("https://example.com/pampers.jpg");
  });

  it("returns undefined when no images", () => {
    expect(resolveProductImage(mockProductMinimal)).toBeUndefined();
  });
});

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });

  it("returns empty string for undefined", () => {
    expect(stripHtml(undefined)).toBe("");
  });

  it("normalizes whitespace", () => {
    expect(stripHtml("<p>Hello</p>  <p>World</p>")).toBe("Hello World");
  });
});
