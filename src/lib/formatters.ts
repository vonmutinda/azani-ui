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

export function getVariantOriginalPrice(variant?: MedusaProductVariant | null): string | null {
  if (!variant?.calculated_price) return null;

  const { original_amount, calculated_amount } = variant.calculated_price;
  if (original_amount > calculated_amount) {
    return formatPrice(original_amount);
  }

  return null;
}

export function getVariantDiscountPercent(variant?: MedusaProductVariant | null): number | null {
  if (!variant?.calculated_price) return null;

  const { original_amount, calculated_amount } = variant.calculated_price;
  if (original_amount <= calculated_amount || original_amount <= 0) return null;

  return Math.round(((original_amount - calculated_amount) / original_amount) * 100);
}

// Product-level helpers read the first variant — used by listing cards where
// there is no selected variant. The PDP uses the variant-level helpers above so
// the strike price and discount track the variant the shopper has selected.
export function getProductOriginalPrice(product: MedusaProduct): string | null {
  return getVariantOriginalPrice(product.variants?.[0]);
}

export function getProductDiscountPercent(product: MedusaProduct): number | null {
  return getVariantDiscountPercent(product.variants?.[0]);
}

export function resolveProductImage(product: MedusaProduct): string | undefined {
  if (product.thumbnail) return product.thumbnail;
  return product.images?.[0]?.url;
}

/** Only use linked colour photos that belong to this product's gallery. */
export function resolveColourImage(product: MedusaProduct, colour?: string): string | undefined {
  const mapping = product.metadata?.colour_images;
  if (!colour || !mapping || typeof mapping !== "object" || Array.isArray(mapping)) return;
  const linked = (mapping as Record<string, unknown>)[colour];
  const gallery = new Set([product.thumbnail, ...(product.images ?? []).map((image) => image.url)]);
  return Array.isArray(linked)
    ? linked.find((url): url is string => typeof url === "string" && gallery.has(url))
    : undefined;
}

/** Present this supplied photograph upright without modifying its source asset. */
export function getProductImageRotation(product?: Pick<MedusaProduct, "handle"> | null): number {
  return product?.handle === "azani-photo-white-crew-neck-sweatshirt" ? 90 : 0;
}

export function resolveOrderItemImage(
  item: Pick<MedusaLineItem, "thumbnail" | "product" | "variant"> &
    Partial<Pick<MedusaLineItem, "variant_id">>,
  fallbackProduct?: MedusaProduct | null,
): string | undefined {
  const product = fallbackProduct ?? item.product;
  const variant = product?.variants?.find((entry) => entry.id === item.variant_id) ?? item.variant;
  const colourOption = product?.options?.find((option) => /^colou?r$/i.test(option.title));
  const colour = variant?.options?.find((value) => value.option_id === colourOption?.id)?.value;
  return (
    (product ? resolveColourImage(product, colour) : undefined) ||
    variant?.thumbnail ||
    item.thumbnail ||
    item.product?.thumbnail ||
    item.product?.images?.[0]?.url ||
    item.variant?.product?.thumbnail ||
    item.variant?.product?.images?.[0]?.url ||
    (fallbackProduct ? resolveProductImage(fallbackProduct) : undefined)
  );
}

/** Medusa's cart subtotal includes shipping; merchandise subtotal does not. */
export function getCartItemsSubtotal(
  cart?: {
    item_subtotal?: number;
    subtotal?: number;
    shipping_total?: number;
    items: { subtotal?: number; unit_price: number; quantity: number }[];
  } | null,
): number {
  if (!cart) return 0;
  return (
    cart.item_subtotal ??
    cart.items.reduce((sum, item) => sum + (item.subtotal ?? item.unit_price * item.quantity), 0)
  );
}

/** Use pre-tax shipping and discounts so the rows reconcile with Medusa's total. */
export function getCartDisplayAmounts(
  cart?:
    | (NonNullable<Parameters<typeof getCartItemsSubtotal>[0]> & {
        shipping_subtotal?: number;
        shipping_tax_total?: number;
        shipping_discount_subtotal?: number;
        tax_total?: number;
        discount_subtotal?: number;
        discount_total?: number;
        discount_tax_total?: number;
        total?: number;
      })
    | null,
) {
  const items = getCartItemsSubtotal(cart);
  const shipping =
    cart?.shipping_subtotal ??
    (cart?.subtotal !== undefined
      ? Math.max(0, cart.subtotal - items)
      : (cart?.shipping_total ?? 0) -
        (cart?.shipping_tax_total ?? 0) +
        (cart?.shipping_discount_subtotal ?? 0));
  const tax = cart?.tax_total ?? 0;
  const discount =
    cart?.discount_subtotal ??
    (cart?.total !== undefined
      ? Math.max(0, items + shipping + tax - cart.total)
      : (cart?.discount_total ?? 0) - (cart?.discount_tax_total ?? 0));
  return { items, shipping, tax, discount };
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
