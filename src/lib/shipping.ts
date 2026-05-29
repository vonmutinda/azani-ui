import { siteConfig } from "./site-config";

/**
 * The free-delivery threshold (KES), sourced from {@link siteConfig}. This is the
 * single source of truth — the header trust bar, home, cart and checkout all derive
 * their copy and calculations from these helpers so the value can never drift.
 */
export const FREE_SHIPPING_THRESHOLD = siteConfig.shipping.freeShippingThreshold;

/** Whether a cart subtotal qualifies for free delivery. */
export function qualifiesForFreeShipping(subtotal: number): boolean {
  return subtotal >= FREE_SHIPPING_THRESHOLD;
}

/** Amount still needed to unlock free delivery (never negative). */
export function freeShippingRemaining(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}

/** Progress towards free delivery as a 0–100 percentage (clamped). */
export function freeShippingProgress(subtotal: number): number {
  if (FREE_SHIPPING_THRESHOLD <= 0) return 100;
  const pct = (subtotal / FREE_SHIPPING_THRESHOLD) * 100;
  return Math.min(100, Math.max(0, pct));
}

/** The threshold formatted as whole shillings, e.g. "KSh5,000". */
export function freeShippingThresholdLabel(): string {
  return `KSh${FREE_SHIPPING_THRESHOLD.toLocaleString("en-US")}`;
}

/** Announcement-bar copy, e.g. "Free delivery over KSh5,000". */
export function freeDeliveryBarLabel(): string {
  return `Free delivery over ${freeShippingThresholdLabel()}`;
}
