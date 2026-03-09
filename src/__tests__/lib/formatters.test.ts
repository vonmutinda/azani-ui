import { describe, it, expect } from "vitest";
import {
  formatPrice,
  getProductPrice,
  getVariantPrice,
  getProductOriginalPrice,
  getVariantAvailability,
  formatOrderRef,
  formatOrderLabel,
  resolveProductImage,
  resolveOrderItemImage,
  stripHtml,
} from "@/lib/formatters";
import { mockProduct, mockProductMinimal } from "../fixtures";

describe("formatPrice", () => {
  it("formats ETB amounts with Br prefix", () => {
    expect(formatPrice(1500)).toBe("Br1,500.00");
    expect(formatPrice(85000)).toBe("Br85,000.00");
  });

  it("returns '--' for undefined", () => {
    expect(formatPrice(undefined)).toBe("--");
  });

  it("returns '--' for null", () => {
    expect(formatPrice(null)).toBe("--");
  });

  it("returns '--' for NaN", () => {
    expect(formatPrice(NaN)).toBe("--");
  });

  it("returns '--' for Infinity", () => {
    expect(formatPrice(Infinity)).toBe("--");
    expect(formatPrice(-Infinity)).toBe("--");
  });

  it("handles zero amount", () => {
    expect(formatPrice(0)).toBe("Br0.00");
  });
});

describe("getProductPrice", () => {
  it("returns the first variant price in ETB", () => {
    const price = getProductPrice(mockProduct);
    expect(price).not.toBeNull();
    expect(price!.amount).toBe(85000);
    expect(price!.currency).toBe("etb");
    expect(price!.formatted).toBe("Br85,000.00");
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
    expect(price!.formatted).toBe("Br1,200.00");
  });
});

describe("getVariantPrice", () => {
  it("returns formatted ETB price for variant", () => {
    const variant = mockProduct.variants![0];
    expect(getVariantPrice(variant)).toBe("Br85,000.00");
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
    expect(getProductOriginalPrice(product)).toBe("Br1,500.00");
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

describe("resolveOrderItemImage", () => {
  it("prefers line item thumbnail", () => {
    expect(
      resolveOrderItemImage({
        thumbnail: "https://example.com/item.jpg",
        product: undefined,
        variant: undefined,
      }),
    ).toBe("https://example.com/item.jpg");
  });

  it("falls back to variant product media", () => {
    expect(
      resolveOrderItemImage({
        thumbnail: null,
        product: undefined,
        variant: {
          id: "variant_1",
          title: "Default",
          product: {
            id: "prod_1",
            thumbnail: null,
            images: [{ id: "img_1", url: "https://example.com/variant-product.jpg" }],
          },
        },
      }),
    ).toBe("https://example.com/variant-product.jpg");
  });

  it("falls back to the fetched product", () => {
    expect(
      resolveOrderItemImage(
        {
          thumbnail: null,
          product: undefined,
          variant: undefined,
        },
        mockProduct,
      ),
    ).toBe("https://example.com/pampers.jpg");
  });
});

describe("formatOrderLabel", () => {
  it("formats a compact order label", () => {
    expect(formatOrderLabel(101)).toBe("Order #101");
  });
});

describe("getVariantAvailability", () => {
  it("returns unavailable for null/undefined variant", () => {
    expect(getVariantAvailability(null)).toEqual(
      expect.objectContaining({
        inStock: false,
        canPurchase: false,
        isOutOfStock: true,
        label: "Unavailable",
      }),
    );
    expect(getVariantAvailability(undefined)).toEqual(
      expect.objectContaining({ inStock: false, canPurchase: false, isOutOfStock: true }),
    );
  });

  it("returns in stock when manage_inventory is false", () => {
    const result = getVariantAvailability({
      id: "v1",
      title: "Test",
      manage_inventory: false,
      inventory_quantity: 0,
    });
    expect(result.inStock).toBe(true);
    expect(result.canPurchase).toBe(true);
    expect(result.label).toBe("In stock");
  });

  it("returns in stock when allow_backorder is true", () => {
    const result = getVariantAvailability({
      id: "v1",
      title: "Test",
      manage_inventory: true,
      allow_backorder: true,
      inventory_quantity: 0,
    });
    expect(result.inStock).toBe(true);
    expect(result.canPurchase).toBe(true);
  });

  it("returns out of stock when inventory is zero", () => {
    const result = getVariantAvailability({
      id: "v1",
      title: "Test",
      manage_inventory: true,
      allow_backorder: false,
      inventory_quantity: 0,
    });
    expect(result.inStock).toBe(false);
    expect(result.canPurchase).toBe(false);
    expect(result.isOutOfStock).toBe(true);
    expect(result.label).toBe("Out of stock");
  });

  it("returns low stock when inventory is below 5", () => {
    const result = getVariantAvailability({
      id: "v1",
      title: "Test",
      manage_inventory: true,
      allow_backorder: false,
      inventory_quantity: 3,
    });
    expect(result.inStock).toBe(true);
    expect(result.isLowStock).toBe(true);
    expect(result.label).toBe("Only 3 left");
    expect(result.maxQuantity).toBe(3);
  });

  it("returns normal stock when inventory is 5 or more", () => {
    const result = getVariantAvailability({
      id: "v1",
      title: "Test",
      manage_inventory: true,
      allow_backorder: false,
      inventory_quantity: 20,
    });
    expect(result.inStock).toBe(true);
    expect(result.isLowStock).toBe(false);
    expect(result.label).toBe("In stock");
    expect(result.maxQuantity).toBe(10);
  });
});

describe("formatOrderRef", () => {
  it("returns stored ref when provided", () => {
    expect(formatOrderRef(1, undefined, undefined, "KKB-2603-001AB")).toBe("KKB-2603-001AB");
  });

  it("computes ref from display_id and created_at", () => {
    const ref = formatOrderRef(42, "2026-03-15T10:00:00Z", "order_abc123");
    expect(ref).toBe("KKB-2603-04223");
  });

  it("pads display_id to 3 digits", () => {
    const ref = formatOrderRef(1, "2026-01-01T00:00:00Z", "order_xy");
    expect(ref).toBe("KKB-2601-001XY");
  });

  it("handles missing orderId", () => {
    const ref = formatOrderRef(5, "2026-06-20T00:00:00Z");
    expect(ref).toBe("KKB-2606-005");
  });

  it("handles missing createdAt by using current date", () => {
    const ref = formatOrderRef(10);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    expect(ref).toBe(`KKB-${yy}${mm}-010`);
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
