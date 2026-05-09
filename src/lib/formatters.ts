import { MedusaLineItem, MedusaProduct, MedusaProductVariant } from "@/types/medusa";

export function formatPrice(amount: number | undefined | null, _currency?: string): string {
  if (amount === undefined || amount === null || !Number.isFinite(amount)) return "--";

  return `KSh${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getVariantMoneyAmount(variant: MedusaProductVariant) {
  return variant.prices?.find((price) => price.currency_code === "kes") ?? variant.prices?.[0];
}

export function getProductPrice(
  product: MedusaProduct,
): { amount: number; currency: string; formatted: string } | null {
  const variant = product.variants?.[0];
  if (!variant) return null;

  if (variant.calculated_price) {
    return {
      amount: variant.calculated_price.calculated_amount,
      currency: "kes",
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

export function resolveOrderItemImage(
  item: Pick<MedusaLineItem, "thumbnail" | "product" | "variant">,
  fallbackProduct?: MedusaProduct | null,
): string | undefined {
  return (
    item.thumbnail ||
    item.variant?.thumbnail ||
    item.product?.thumbnail ||
    item.product?.images?.[0]?.url ||
    item.variant?.product?.thumbnail ||
    item.variant?.product?.images?.[0]?.url ||
    (fallbackProduct ? resolveProductImage(fallbackProduct) : undefined)
  );
}

export function getVariantAvailability(variant?: MedusaProductVariant | null) {
  if (!variant) {
    return {
      inStock: false,
      canPurchase: false,
      isLowStock: false,
      isOutOfStock: true,
      inventoryQuantity: 0,
      maxQuantity: 0,
      label: "Unavailable",
    };
  }

  const manageInventory = variant.manage_inventory === true;
  const allowBackorder = variant.allow_backorder === true;
  const inventoryQuantity = Math.max(variant.inventory_quantity ?? 0, 0);

  if (!manageInventory || allowBackorder) {
    return {
      inStock: true,
      canPurchase: true,
      isLowStock: false,
      isOutOfStock: false,
      inventoryQuantity,
      maxQuantity: 10,
      label: "In stock",
    };
  }

  if (inventoryQuantity <= 0) {
    return {
      inStock: false,
      canPurchase: false,
      isLowStock: false,
      isOutOfStock: true,
      inventoryQuantity: 0,
      maxQuantity: 0,
      label: "Out of stock",
    };
  }

  if (inventoryQuantity < 5) {
    return {
      inStock: true,
      canPurchase: true,
      isLowStock: true,
      isOutOfStock: false,
      inventoryQuantity,
      maxQuantity: Math.min(10, inventoryQuantity),
      label: `Only ${inventoryQuantity} left`,
    };
  }

  return {
    inStock: true,
    canPurchase: true,
    isLowStock: false,
    isOutOfStock: false,
    inventoryQuantity,
    maxQuantity: Math.min(10, inventoryQuantity),
    label: "In stock",
  };
}

/**
 * Returns the branded order reference. Prefers a stored ref from order
 * metadata (persisted by the backend subscriber) and falls back to
 * computing one from display_id + created_at + order_id.
 *
 * Format: AZN-YYMM-NNNXX  (e.g. AZN-2603-042A)
 */
export function formatOrderRef(
  displayId: number | string,
  createdAt?: string,
  orderId?: string,
  storedRef?: string | null,
): string {
  if (storedRef) return storedRef;

  const now = createdAt ? new Date(createdAt) : new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const num = String(displayId).padStart(3, "0");

  let suffix = "";
  if (orderId) {
    const chars = orderId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    suffix = chars.slice(-2);
  }

  return `AZN-${yy}${mm}-${num}${suffix}`;
}

export function formatOrderLabel(displayId: number | string): string {
  return `Order #${displayId}`;
}

export function stripHtml(value: string | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
