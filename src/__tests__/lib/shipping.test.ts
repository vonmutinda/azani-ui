import { describe, it, expect } from "vitest";
import {
  FREE_SHIPPING_THRESHOLD,
  qualifiesForFreeShipping,
  freeShippingRemaining,
  freeShippingProgress,
  freeShippingThresholdLabel,
  freeDeliveryBarLabel,
} from "@/lib/shipping";

describe("free shipping threshold (single source of truth)", () => {
  it("is KES 10,000", () => {
    expect(FREE_SHIPPING_THRESHOLD).toBe(10000);
  });
});

describe("qualifiesForFreeShipping", () => {
  it("is false below the threshold", () => {
    expect(qualifiesForFreeShipping(9999)).toBe(false);
  });

  it("does not qualify at the former KES 5,000 threshold", () => {
    expect(qualifiesForFreeShipping(5000)).toBe(false);
  });

  it("is true exactly at the threshold", () => {
    expect(qualifiesForFreeShipping(10000)).toBe(true);
  });

  it("is true above the threshold", () => {
    expect(qualifiesForFreeShipping(12500)).toBe(true);
  });
});

describe("freeShippingRemaining", () => {
  it("returns the amount still needed below the threshold", () => {
    expect(freeShippingRemaining(1890)).toBe(8110);
  });

  it("never returns a negative amount once qualified", () => {
    expect(freeShippingRemaining(12000)).toBe(0);
  });

  it("is zero exactly at the threshold", () => {
    expect(freeShippingRemaining(10000)).toBe(0);
  });
});

describe("freeShippingProgress", () => {
  it("is 0 for an empty cart", () => {
    expect(freeShippingProgress(0)).toBe(0);
  });

  it("is proportional below the threshold", () => {
    expect(freeShippingProgress(5000)).toBe(50);
  });

  it("clamps to 100 at the threshold", () => {
    expect(freeShippingProgress(10000)).toBe(100);
  });

  it("clamps to 100 above the threshold", () => {
    expect(freeShippingProgress(15000)).toBe(100);
  });
});

describe("display labels", () => {
  it("formats the threshold without decimals", () => {
    expect(freeShippingThresholdLabel()).toBe("KES 10,000");
  });

  it("builds the announcement-bar label", () => {
    expect(freeDeliveryBarLabel()).toBe("Free delivery over KES 10,000");
  });
});
