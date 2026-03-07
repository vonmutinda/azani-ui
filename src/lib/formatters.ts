import { MedusaProduct, MedusaProductVariant } from "@/types/medusa";

export function formatPrice(amount: number | undefined, _currency?: string): string {
  if (amount === undefined || amount === null) return "--";

  return `Br${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getVariantMoneyAmount(variant: MedusaProductVariant) {
  return variant.prices?.find((price) => price.currency_code === "etb") ?? variant.prices?.[0];
}

export function getProductPrice(
  product: MedusaProduct,
): { amount: number; currency: string; formatted: string } | null {
  const variant = product.variants?.[0];
  if (!variant) return null;

  if (variant.calculated_price) {
    return {
      amount: variant.calculated_price.calculated_amount,
      currency: "etb",
      formatted: formatPrice(variant.calculated_price.calculated_amount),
    };
  }

  const price = getVariantMoneyAmount(variant);
  if (price) {
    return {
      amount: price.amount,
      currency: price.currency_code,
      formatted: formatPrice(price.amount),
    };
  }

  return null;
}

export function getVariantPrice(variant: MedusaProductVariant, _currency?: string): string {
  if (variant.calculated_price) {
    return formatPrice(variant.calculated_price.calculated_amount);
  }

  const price = getVariantMoneyAmount(variant);
  if (price) {
    return formatPrice(price.amount);
  }

  return "--";
}

export function getProductOriginalPrice(product: MedusaProduct): string | null {
  const variant = product.variants?.[0];
  if (!variant?.calculated_price) return null;

  const { original_amount, calculated_amount } = variant.calculated_price;
  if (original_amount > calculated_amount) {
    return formatPrice(original_amount);
  }

  return null;
}

export function resolveProductImage(product: MedusaProduct): string | undefined {
  if (product.thumbnail) return product.thumbnail;
  return product.images?.[0]?.url;
}

/**
 * Generates a branded order reference from Medusa's numeric display_id.
 * Format: KKB-YYMM-NNNXX  (e.g. KKB-2603-042A)
 *   KKB     = Kokob prefix
 *   YYMM    = 2-digit year + 2-digit month from order creation date
 *   NNN     = zero-padded display_id (3+ digits)
 *   XX      = suffix derived from the order id for uniqueness
 */
export function formatOrderRef(
  displayId: number | string,
  createdAt?: string,
  orderId?: string,
): string {
  const now = createdAt ? new Date(createdAt) : new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const num = String(displayId).padStart(3, "0");

  let suffix = "";
  if (orderId) {
    const chars = orderId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    suffix = chars.slice(-2);
  }

  return `KKB-${yy}${mm}-${num}${suffix}`;
}

export function stripHtml(value: string | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
