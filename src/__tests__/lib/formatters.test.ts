import { describe, it, expect } from "vitest";
import {
  formatPrice,
  getProductPrice,
  getVariantPrice,
  getProductOriginalPrice,
  getProductDiscountPercent,
  getVariantOriginalPrice,
  getVariantDiscountPercent,
  getVariantAvailability,
  formatOrderRef,
  formatOrderLabel,
  resolveProductImage,
  resolveOrderItemImage,
  stripHtml,
  getCartItemsSubtotal,
  getCartDisplayAmounts,
} from "@/lib/formatters";
import { mockProduct, mockProductMinimal } from "../fixtures";
import type { MedusaProduct, MedusaProductVariant } from "@/types/medusa";

function productWithPrice(calculated: number, original: number): MedusaProduct {
  return {
    variants: [{ calculated_price: { calculated_amount: calculated, original_amount: original } }],
  } as unknown as MedusaProduct;
}

function variantWithPrice(calculated: number, original: number): MedusaProductVariant {
  return {
    id: "v",
    title: "v",
    calculated_price: {
      calculated_amount: calculated,
      original_amount: original,
      currency_code: "kes",
    },
  };
}

describe("getProductDiscountPercent", () => {
  it("returns the rounded discount percent when on sale", () => {
    expect(getProductDiscountPercent(productWithPrice(1890, 2117))).toBe(11);
  });

  it("returns null when there is no discount", () => {
    expect(getProductDiscountPercent(productWithPrice(2000, 2000))).toBeNull();
  });

  it("returns null when the variant has no calculated price", () => {
    expect(getProductDiscountPercent({ variants: [{}] } as unknown as MedusaProduct)).toBeNull();
  });
});

describe("getVariantDiscountPercent", () => {
  it("returns the rounded discount percent when on sale", () => {
    expect(getVariantDiscountPercent(variantWithPrice(1890, 2117))).toBe(11);
  });

  it("returns null when there is no discount", () => {
    expect(getVariantDiscountPercent(variantWithPrice(2000, 2000))).toBeNull();
  });

  it("returns null when the variant has no calculated price", () => {
    expect(getVariantDiscountPercent({ id: "v", title: "v" })).toBeNull();
  });

  it("returns null for a missing variant", () => {
    expect(getVariantDiscountPercent(undefined)).toBeNull();
  });
});

describe("getVariantOriginalPrice", () => {
  it("returns the original price when discounted", () => {
    expect(getVariantOriginalPrice(variantWithPrice(1890, 2117))).toBe("KSh2,117.00");
  });

  it("returns null when original equals calculated", () => {
    expect(getVariantOriginalPrice(variantWithPrice(2000, 2000))).toBeNull();
  });

  it("returns null when there is no calculated price", () => {
    expect(getVariantOriginalPrice({ id: "v", title: "v" })).toBeNull();
  });
});

describe("formatPrice", () => {
  it("formats ETB amounts with Br prefix", () => {
    expect(formatPrice(1500)).toBe("KSh1,500.00");
    expect(formatPrice(85000)).toBe("KSh85,000.00");
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
    expect(formatPrice(0)).toBe("KSh0.00");
  });
});

describe("getProductPrice", () => {
  it("returns the first variant price in ETB", () => {
    const price = getProductPrice(mockProduct);
    expect(price).not.toBeNull();
    expect(price!.amount).toBe(85000);
    expect(price!.currency).toBe("kes");
    expect(price!.formatted).toBe("KSh85,000.00");
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
            currency_code: "kes",
          },
        },
      ],
    };
    const price = getProductPrice(product);
    expect(price!.amount).toBe(1200);
    expect(price!.formatted).toBe("KSh1,200.00");
  });
});

describe("getVariantPrice", () => {
  it("returns formatted ETB price for variant", () => {
    const variant = mockProduct.variants![0];
    expect(getVariantPrice(variant)).toBe("KSh85,000.00");
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
            currency_code: "kes",
          },
        },
      ],
    };
    expect(getProductOriginalPrice(product)).toBe("KSh1,500.00");
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
            currency_code: "kes",
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
    expect(formatOrderRef(1, undefined, undefined, "AZN-2603-001AB")).toBe("AZN-2603-001AB");
  });

  it("computes ref from display_id and created_at", () => {
    const ref = formatOrderRef(42, "2026-03-15T10:00:00Z", "order_abc123");
    expect(ref).toBe("AZN-2603-04223");
  });

  it("pads display_id to 3 digits", () => {
    const ref = formatOrderRef(1, "2026-01-01T00:00:00Z", "order_xy");
    expect(ref).toBe("AZN-2601-001XY");
  });

  it("handles missing orderId", () => {
    const ref = formatOrderRef(5, "2026-06-20T00:00:00Z");
    expect(ref).toBe("AZN-2606-005");
  });

  it("handles missing createdAt by using current date", () => {
    const ref = formatOrderRef(10);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    expect(ref).toBe(`AZN-${yy}${mm}-010`);
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

describe("purchase presentation", () => {
  it("uses the selected colour photo instead of the generic line-item thumbnail", () => {
    const product = {
      ...mockProduct,
      metadata: { colour_images: { Sand: ["https://example.com/sand.jpg"] } },
      images: [{ id: "sand", url: "https://example.com/sand.jpg" }],
      options: [{ id: "colour", title: "Colour", product_id: mockProduct.id, values: [] }],
      variants: [
        {
          id: "sand6",
          title: "6 / Sand",
          options: [{ id: "sand", option_id: "colour", value: "Sand" }],
        },
      ],
    };
    expect(
      resolveOrderItemImage(
        { thumbnail: "https://example.com/mocha.jpg", variant_id: "sand6" },
        product,
      ),
    ).toBe("https://example.com/sand.jpg");
  });
  it("keeps shipping out of the item subtotal", () => {
    expect(
      getCartItemsSubtotal({
        subtotal: 3350,
        shipping_total: 150,
        items: [{ subtotal: 3200, unit_price: 3200, quantity: 1 }],
      }),
    ).toBe(3200);
  });
  it("preserves an explicit item subtotal before discounts", () => {
    expect(getCartItemsSubtotal({ item_subtotal: 3200, items: [] })).toBe(3200);
  });
});

describe("cart financial breakdown", () => {
  it("reconciles taxed shipping without counting its tax twice", () => {
    const result = getCartDisplayAmounts({
      items: [],
      item_subtotal: 3200,
      shipping_subtotal: 150,
      shipping_total: 174,
      tax_total: 24,
      discount_subtotal: 0,
      discount_total: 0,
    });
    expect(result).toEqual({ items: 3200, shipping: 150, tax: 24, discount: 0 });
  });
  it("uses the pre-tax discount rather than the discounted tax amount", () => {
    const result = getCartDisplayAmounts({
      items: [],
      item_subtotal: 3200,
      shipping_subtotal: 150,
      shipping_total: 150,
      tax_total: 460.8,
      discount_subtotal: 320,
      discount_total: 371.2,
    });
    expect(result.items + result.shipping + result.tax - result.discount).toBeCloseTo(3490.8);
  });
});

describe("legacy cart breakdown", () => {
  it("derives pre-tax rows from aggregate subtotal and final total", () => {
    const amounts = getCartDisplayAmounts({
      items: [{ unit_price: 3200, quantity: 1 }],
      subtotal: 3350,
      shipping_total: 100,
      tax_total: 0,
      discount_total: 50,
      total: 3300,
    });
    expect(amounts).toEqual({ items: 3200, shipping: 150, tax: 0, discount: 50 });
  });
  it("reconciles a shipping promotion", () => {
    const amounts = getCartDisplayAmounts({
      items: [],
      item_subtotal: 3200,
      shipping_subtotal: 150,
      shipping_total: 100,
      tax_total: 0,
      discount_subtotal: 50,
      discount_total: 50,
    });
    expect(amounts.items + amounts.shipping + amounts.tax - amounts.discount).toBe(3300);
  });
});
