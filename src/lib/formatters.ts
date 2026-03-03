import { MedusaProduct, MedusaProductVariant } from "@/types/medusa";

export function formatPrice(amount: number | undefined, _currencyCode = "etb"): string {
  if (amount === undefined || amount === null) return "--";

  const value = amount / 100;
  return `Br${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getProductPrice(product: MedusaProduct): { amount: number; currency: string; formatted: string } | null {
  const variant = product.variants?.[0];
  if (!variant) return null;

  if (variant.calculated_price) {
    return {
      amount: variant.calculated_price.calculated_amount,
      currency: "etb",
      formatted: formatPrice(variant.calculated_price.calculated_amount),
    };
  }

  const price = variant.prices?.[0];
  if (price) {
    return {
      amount: price.amount,
      currency: "etb",
      formatted: formatPrice(price.amount),
    };
  }

  return null;
}

export function getVariantPrice(variant: MedusaProductVariant, _currencyCode = "etb"): string {
  if (variant.calculated_price) {
    return formatPrice(variant.calculated_price.calculated_amount);
  }

  const price = variant.prices?.[0];
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

export function stripHtml(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
