"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCheckoutRecovery } from "@/lib/use-checkout-recovery";
import { ProductCard } from "@/components/product-card";
import { collectCategoryIds } from "@/lib/categories";
import { EnamelUtilityIcon } from "@/components/enamel-utility-icon";
import Image from "next/image";
import { useState, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Shirt,
  Check,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import {
  getCart,
  getProducts,
  getCategories,
  getProductsByIds,
  updateLineItem,
  removeLineItem,
  addPromoCode,
  removePromoCode,
} from "@/lib/medusa-api";
import {
  formatPrice,
  getVariantAvailability,
  getProductImageRotation,
  resolveOrderItemImage,
  getCartItemsSubtotal,
  getCartDisplayAmounts,
} from "@/lib/formatters";
import { freeShippingRemaining, freeShippingProgress } from "@/lib/shipping";
import type { MedusaLineItem, MedusaProduct } from "@/types/medusa";

function variantLabel(item: MedusaLineItem): string | null {
  if (
    item.variant?.title &&
    item.variant.title !== "Default variant" &&
    item.variant.title !== "-"
  ) {
    return item.variant.title;
  }
  if (item.description && item.description !== "--" && item.description !== "-") {
    return item.description;
  }
  return null;
}

function getCartItemProduct(item: MedusaLineItem, productsById: Map<string, MedusaProduct>) {
  if (item.product_id) {
    return productsById.get(item.product_id) ?? item.product;
  }
  return item.product;
}

function getCartItemAvailability(item: MedusaLineItem, productsById: Map<string, MedusaProduct>) {
  if (item.product_id && !productsById.has(item.product_id))
    return {
      ...getVariantAvailability(undefined),
      label: "No longer available — remove this item",
    };
  const product = getCartItemProduct(item, productsById);
  const variant = product?.variants?.find((candidate) => candidate.id === item.variant_id);
  return getVariantAvailability(variant);
}

function canFulfillCartItem(item: MedusaLineItem, productsById: Map<string, MedusaProduct>) {
  const availability = getCartItemAvailability(item, productsById);
  if (!availability.canPurchase) return false;

  const product = getCartItemProduct(item, productsById);
  const variant = product?.variants?.find((candidate) => candidate.id === item.variant_id);
  if (variant?.manage_inventory !== true || variant.allow_backorder === true) return true;

  return item.quantity <= availability.inventoryQuantity;
}

export default function CartPage() {
  const queryClient = useQueryClient();
  const recovery = useCheckoutRecovery();
  const [promoCode, setPromoCode] = useState("");

  const cartQuery = useQuery({ queryKey: ["cart"], queryFn: getCart });

  const updateMutation = useMutation({
    mutationFn: ({ lineItemId, quantity }: { lineItemId: string; quantity: number }) =>
      updateLineItem(lineItemId, quantity),
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (query) => ["cart", "checkout-cart"].includes(String(query.queryKey[0])),
      }),
  });

  const removeMutation = useMutation({
    mutationFn: (lineItemId: string) => removeLineItem(lineItemId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (query) => ["cart", "checkout-cart"].includes(String(query.queryKey[0])),
      }),
  });

  const promoMutation = useMutation({
    mutationFn: () => addPromoCode(promoCode),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => ["cart", "checkout-cart"].includes(String(query.queryKey[0])),
      });
      setPromoCode("");
    },
  });

  const removePromoMutation = useMutation({
    mutationFn: (code: string) => removePromoCode(code),
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (query) => ["cart", "checkout-cart"].includes(String(query.queryKey[0])),
      }),
  });

  const cart = cartQuery.data;
  const paymentLocked = recovery?.state === "unresolved" && recovery.cartId === cart?.id;
  const amounts = getCartDisplayAmounts(cart);
  const items = useMemo(() => cart?.items ?? [], [cart?.items]);
  const currencyCode = "kes";
  const shippingKnown = (cart?.shipping_methods?.length ?? 0) > 0;
  const cartProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.product_id ?? item.product?.id)
            .filter((id): id is string => !!id),
        ),
      ),
    [items],
  );
  const cartProductsQuery = useQuery({
    queryKey: ["cart-products", cart?.id, cartProductIds],
    queryFn: () => getProductsByIds(cartProductIds),
    enabled: cartProductIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const cartProductsById = useMemo(
    () => new Map((cartProductsQuery.data ?? []).map((product) => [product.id, product])),
    [cartProductsQuery.data],
  );
  const categoriesQuery = useQuery({
    queryKey: ["catalogue-categories"],
    queryFn: () => getCategories(),
    enabled: items.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const cartCategoryIds = useMemo(() => {
    const publicIds = new Set(
      (categoriesQuery.data?.product_categories ?? []).flatMap(collectCategoryIds),
    );
    const ids = new Set<string>();
    // Only products fetched for this cart identity may influence merchandising.
    for (const productId of cartProductIds) {
      for (const category of cartProductsById.get(productId)?.categories ?? []) {
        if (publicIds.has(category.id)) ids.add(category.id);
      }
    }
    return [...ids].sort();
  }, [cartProductIds, cartProductsById, categoriesQuery.data]);
  const recommendationsQuery = useQuery({
    queryKey: ["cart-recommendations", cart?.id, cartProductIds, cartCategoryIds],
    queryFn: () =>
      getProducts({
        limit: 8,
        ...(cartCategoryIds.length ? { category_id: cartCategoryIds } : {}),
      }),
    enabled:
      items.length > 0 &&
      (!cartProductIds.length || !cartProductsQuery.isPending) &&
      !categoriesQuery.isPending,
    staleTime: 5 * 60 * 1000,
  });
  const recommendations = (recommendationsQuery.data?.products ?? [])
    .filter((product) => !cartProductIds.includes(product.id))
    .slice(0, 4);
  const hasUnavailableItems =
    cartProductsQuery.isSuccess &&
    items.some((item) => !canFulfillCartItem(item, cartProductsById));

  if (cartQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-border/40 h-8 w-48 animate-pulse rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-border/40 h-28 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (!cart || items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center gap-3">
          <Link
            href="/products"
            aria-label="Back to products"
            className="text-muted hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-foreground -ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-foreground text-2xl font-bold">Shopping Cart</h1>
        </div>
        <div className="border-border bg-card flex flex-col items-center gap-5 rounded-xl border p-10 text-center">
          <div className="bg-secondary-light flex h-20 w-20 items-center justify-center rounded-full">
            <EnamelUtilityIcon name="cart" size={48} />
          </div>
          <div>
            <p className="text-foreground text-lg font-semibold">Your cart is empty</p>
            <p className="text-muted mt-1 text-sm">
              Looks like you haven&apos;t added any items yet
            </p>
          </div>
          <Link
            href="/products"
            className="bg-primary hover:bg-primary-hover focus-visible:ring-primary inline-flex min-h-11 items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-md transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Shirt className="h-4 w-4" /> Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {paymentLocked && (
        <p role="status" className="border-border mb-5 rounded-xl border p-4">
          Your payment is unresolved. Cart and promo changes are locked.{" "}
          <Link href="/checkout" className="underline">
            Check payment status
          </Link>
        </p>
      )}
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/products"
          aria-label="Back to products"
          className="text-muted hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-foreground -ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-foreground text-2xl font-bold">Shopping Cart</h1>
        <span className="bg-foreground/10 text-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      {cartProductsQuery.isError && (
        <div
          role="alert"
          className="border-danger/20 bg-danger/5 text-danger mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium"
        >
          <span>We couldn’t check item availability. Please try again.</span>
          <button
            type="button"
            onClick={() => cartProductsQuery.refetch()}
            className="focus-visible:ring-danger min-h-11 rounded-lg border border-current px-3 py-1.5 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Try again
          </button>
        </div>
      )}

      {hasUnavailableItems && (
        <div className="border-danger/20 bg-danger/5 text-danger mb-5 rounded-xl border px-4 py-3 text-sm font-medium">
          Some items are no longer available in the requested quantity. Update or remove them to
          continue.
        </div>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-3">
        {/* Items — single receipt-style card */}
        <div className="divide-border border-border bg-card divide-y overflow-hidden rounded-xl border lg:col-span-2">
          {items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              currencyCode={currencyCode}
              onUpdate={(lineItemId, quantity) => updateMutation.mutate({ lineItemId, quantity })}
              onRemove={(lineItemId) => removeMutation.mutate(lineItemId)}
              isUpdating={paymentLocked || updateMutation.isPending}
              isRemoving={paymentLocked || removeMutation.isPending}
              productsById={cartProductsById}
              productsLoaded={cartProductsQuery.isSuccess}
            />
          ))}
        </div>

        {/* Summary — sticky on desktop */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="border-border bg-card rounded-xl border p-6">
            <h2 className="text-foreground mb-4 text-base font-semibold">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="text-muted flex justify-between">
                <span>
                  {items.reduce((sum, i) => sum + i.quantity, 0)}{" "}
                  {items.reduce((sum, i) => sum + i.quantity, 0) === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="text-muted flex justify-between">
                <span>Subtotal</span>
                <span className="text-foreground font-medium">
                  {formatPrice(amounts.items, currencyCode)}
                </span>
              </div>
              {amounts.tax > 0 && (
                <div className="text-muted flex justify-between">
                  <span>Tax</span>
                  <span className="text-foreground font-medium">
                    {formatPrice(amounts.tax, currencyCode)}
                  </span>
                </div>
              )}
              {amounts.discount > 0 && (
                <div className="text-success flex justify-between">
                  <span>Discount</span>
                  <span className="font-medium">
                    -{formatPrice(amounts.discount, currencyCode)}
                  </span>
                </div>
              )}
              {(() => {
                if (shippingKnown) {
                  return (
                    <div className="text-muted flex justify-between">
                      <span>Shipping</span>
                      <span className="text-foreground font-medium">
                        {amounts.shipping === 0
                          ? "Free"
                          : formatPrice(amounts.shipping, currencyCode)}
                      </span>
                    </div>
                  );
                }
                const subtotal = getCartItemsSubtotal(cart);
                const remaining = freeShippingRemaining(subtotal);
                const progress = freeShippingProgress(subtotal);
                if (remaining <= 0) {
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Shipping</span>
                      <span className="text-accent-green flex items-center gap-1 text-xs font-medium">
                        <Check className="h-3 w-3" /> Free shipping available
                      </span>
                    </div>
                  );
                }
                return (
                  <div className="space-y-1.5">
                    <div className="text-muted flex items-center justify-between">
                      <span>Shipping</span>
                      <span className="text-xs italic">Calculated at checkout</span>
                    </div>
                    <div className="text-muted flex items-center gap-2 text-xs">
                      <Truck className="h-3 w-3 shrink-0" />
                      <span>
                        Add{" "}
                        <span className="text-foreground font-semibold">
                          {formatPrice(remaining)}
                        </span>{" "}
                        for free shipping
                      </span>
                    </div>
                    <div className="bg-border h-1 overflow-hidden rounded-full">
                      <div
                        className="bg-secondary h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
              <div className="border-border border-t pt-3">
                <div className="text-foreground flex justify-between text-base font-bold">
                  <span>{shippingKnown ? "Total" : "Total before shipping"}</span>
                  <span>{formatPrice(cart.total ?? 0, currencyCode)}</span>
                </div>
              </div>
            </div>

            <div className="bg-secondary-light/50 text-muted mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
              <Truck className="text-secondary h-3.5 w-3.5 shrink-0" />
              <span>Delivery options depend on your address. Confirm them at checkout.</span>
            </div>
          </div>

          {/* Promo Code */}
          <details
            className="border-border bg-card rounded-xl border px-4"
            open={!!cart.promotions?.length}
          >
            <summary className="text-foreground focus-visible:ring-primary list-item min-h-11 cursor-pointer rounded-lg py-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
              Have a promo code?
            </summary>
            <div className="pb-4">
              {cart.promotions && cart.promotions.length > 0 ? (
                <div className="space-y-2">
                  {cart.promotions.map((promo) => (
                    <div
                      key={promo.code}
                      className="bg-accent-green-light flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                    >
                      <span className="text-success font-medium">{promo.code}</span>
                      <button
                        type="button"
                        aria-label={`Remove promo code ${promo.code}`}
                        disabled={paymentLocked || removePromoMutation.isPending}
                        onClick={() => removePromoMutation.mutate(promo.code)}
                        className="text-muted hover:text-danger focus-visible:ring-danger inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!paymentLocked && promoCode.trim() && !promoMutation.isPending)
                      promoMutation.mutate();
                  }}
                >
                  <label htmlFor="cart-promo-code" className="sr-only">
                    Promo code
                  </label>
                  <input
                    id="cart-promo-code"
                    name="promo_code"
                    disabled={paymentLocked}
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value);
                      promoMutation.reset();
                    }}
                    placeholder="Enter code"
                    aria-invalid={promoMutation.isError || undefined}
                    aria-describedby={promoMutation.isError ? "cart-promo-error" : undefined}
                    className="border-muted-light bg-background focus:border-secondary focus:ring-secondary min-h-11 min-w-0 flex-1 rounded-lg border px-3 text-sm transition outline-none focus:ring-2"
                  />
                  <button
                    type="submit"
                    disabled={paymentLocked || !promoCode.trim() || promoMutation.isPending}
                    className="bg-primary hover:bg-primary-hover focus-visible:ring-primary min-h-11 rounded-full px-4 text-sm font-medium text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                  >
                    Apply
                  </button>
                </form>
              )}
              {promoMutation.isError && (
                <p id="cart-promo-error" role="alert" className="text-danger mt-2 text-sm">
                  {(promoMutation.error as Error).message}
                </p>
              )}
            </div>
          </details>

          {cartProductsQuery.isPending || cartProductsQuery.isError || hasUnavailableItems ? (
            <button
              type="button"
              disabled
              className="bg-primary flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white opacity-50"
            >
              {cartProductsQuery.isPending
                ? "Checking availability…"
                : cartProductsQuery.isError
                  ? "Availability check failed"
                  : "Resolve Stock Issues First"}
            </button>
          ) : (
            <Link
              href="/checkout"
              className="bg-primary hover:bg-primary-hover focus-visible:ring-primary flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
      {recommendations.length > 0 && (
        <section aria-label="You may also like" className="mt-10">
          <h2 className="text-foreground mb-4 text-lg font-bold">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recommendations.map((product) => (
              <ProductCard key={product.id} product={product} cartLocked={paymentLocked} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CartItem({
  item,
  currencyCode,
  onUpdate,
  onRemove,
  isUpdating,
  isRemoving,
  productsById,
  productsLoaded,
}: {
  item: MedusaLineItem;
  currencyCode: string;
  onUpdate: (lineItemId: string, quantity: number) => void;
  onRemove: (lineItemId: string) => void;
  isUpdating: boolean;
  isRemoving: boolean;
  productsById: Map<string, MedusaProduct>;
  productsLoaded: boolean;
}) {
  const [editQty, setEditQty] = useState<string>(String(item.quantity));
  const product = getCartItemProduct(item, productsById);
  const availability = productsLoaded
    ? getCartItemAvailability(item, productsById)
    : {
        inStock: true,
        canPurchase: true,
        isLowStock: false,
        isOutOfStock: false,
        inventoryQuantity: 0,
        maxQuantity: 10,
        label: "",
      };
  const resolvedImage = resolveOrderItemImage(item, product);
  const effectiveMaxQuantity = availability.isOutOfStock
    ? item.quantity
    : Math.max(item.quantity, availability.maxQuantity);

  const commitQuantity = useCallback(() => {
    const parsed = Math.max(1, Math.min(effectiveMaxQuantity, parseInt(editQty, 10) || 1));
    setEditQty(String(parsed));
    if (parsed !== item.quantity) {
      onUpdate(item.id, parsed);
    }
  }, [editQty, effectiveMaxQuantity, item.id, item.quantity, onUpdate]);

  const label = variantLabel(item);
  const productHref = item.product_id ? `/products/${item.product_id}` : "#";

  return (
    <div className="hover:bg-foreground/[0.04]/50 flex gap-3 px-4 py-3 transition">
      <Link
        href={productHref}
        className="bg-background relative h-16 w-16 shrink-0 overflow-hidden rounded-xl transition-opacity hover:opacity-90 sm:h-24 sm:w-24"
      >
        {resolvedImage ? (
          <Image
            src={resolvedImage}
            alt={item.title}
            fill
            sizes="96px"
            className="object-contain p-1"
            style={{
              transform: getProductImageRotation(product) ? "rotate(90deg) scale(.75)" : undefined,
            }}
          />
        ) : (
          <div className="text-muted-light flex h-full items-center justify-center">
            <ShoppingBag className="h-6 w-6" />
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row">
          <div className="min-w-0">
            <Link href={productHref} className="group">
              <h3 className="text-foreground group-hover:text-secondary text-sm font-medium break-words transition-colors">
                {item.title}
              </h3>
            </Link>
            <div className="text-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              {label && (
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {label}
                </span>
              )}
              <span>
                {formatPrice(item.unit_price, currencyCode)} &times; {item.quantity}
              </span>
            </div>
            {productsLoaded && (
              <p
                className={`mt-1 text-xs font-medium ${
                  availability.isOutOfStock
                    ? "text-danger"
                    : availability.isLowStock
                      ? "text-accent-yellow"
                      : "text-accent-green"
                }`}
              >
                {availability.isOutOfStock
                  ? "Out of stock. Remove this item to continue."
                  : availability.isLowStock
                    ? `${availability.label} for this variant`
                    : availability.label}
              </p>
            )}
          </div>
          <span className="text-foreground shrink-0 text-sm font-bold">
            {formatPrice(
              item.total || item.subtotal || item.unit_price * item.quantity,
              currencyCode,
            )}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <label
              htmlFor={`cart-quantity-${item.id}`}
              className="text-muted mb-1 block text-xs font-medium"
            >
              Quantity
            </label>
            <div className="border-muted-light flex items-center rounded-lg border">
              <button
                type="button"
                aria-label={`Decrease quantity for ${item.title}`}
                onClick={() => {
                  const next = Math.max(1, item.quantity - 1);
                  setEditQty(String(next));
                  onUpdate(item.id, next);
                }}
                disabled={isUpdating || availability.isOutOfStock || item.quantity <= 1}
                className="text-muted hover:text-foreground focus-visible:ring-primary inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg transition focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                id={`cart-quantity-${item.id}`}
                aria-label={`Quantity for ${item.title}`}
                type="text"
                inputMode="numeric"
                value={editQty}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setEditQty(raw);
                }}
                onBlur={commitQuantity}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                disabled={isUpdating || availability.isOutOfStock}
                className="focus-visible:ring-primary min-h-11 w-11 rounded-lg bg-transparent text-center text-sm font-bold outline-none focus-visible:ring-2 disabled:opacity-40"
              />
              <button
                type="button"
                aria-label={`Increase quantity for ${item.title}`}
                onClick={() => {
                  const next = Math.min(effectiveMaxQuantity, item.quantity + 1);
                  setEditQty(String(next));
                  onUpdate(item.id, next);
                }}
                disabled={
                  isUpdating || availability.isOutOfStock || item.quantity >= effectiveMaxQuantity
                }
                className="text-muted hover:text-foreground focus-visible:ring-primary inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg transition focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            aria-label={`Remove ${item.title} from cart`}
            onClick={() => onRemove(item.id)}
            disabled={isRemoving}
            className="text-muted hover:bg-danger/10 hover:text-danger focus-visible:ring-danger inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition focus-visible:ring-2 focus-visible:outline-none"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
