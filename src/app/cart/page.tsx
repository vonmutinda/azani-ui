"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { useState, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Check,
  Clock,
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
  getProductsByIds,
  updateLineItem,
  removeLineItem,
  addPromoCode,
  removePromoCode,
} from "@/lib/medusa-api";
import { formatPrice, getVariantAvailability, resolveOrderItemImage } from "@/lib/formatters";
import type { MedusaLineItem, MedusaProduct } from "@/types/medusa";

const FREE_SHIPPING_THRESHOLD = 5_000;

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
  const product = getCartItemProduct(item, productsById);
  const variant =
    product?.variants?.find((candidate) => candidate.id === item.variant_id) ?? item.variant;
  return getVariantAvailability(variant);
}

export default function CartPage() {
  const queryClient = useQueryClient();
  const [promoCode, setPromoCode] = useState("");

  const cartQuery = useQuery({ queryKey: ["cart"], queryFn: getCart });

  const updateMutation = useMutation({
    mutationFn: ({ lineItemId, quantity }: { lineItemId: string; quantity: number }) =>
      updateLineItem(lineItemId, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const removeMutation = useMutation({
    mutationFn: (lineItemId: string) => removeLineItem(lineItemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const promoMutation = useMutation({
    mutationFn: () => addPromoCode(promoCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setPromoCode("");
    },
  });

  const removePromoMutation = useMutation({
    mutationFn: (code: string) => removePromoCode(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const cart = cartQuery.data;
  const items = useMemo(() => cart?.items ?? [], [cart?.items]);
  const currencyCode = "etb";
  const cartProductIds = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.product_id).filter((id): id is string => !!id))),
    [items],
  );
  const cartProductsQuery = useQuery({
    queryKey: ["cart-products", cartProductIds],
    queryFn: () => getProductsByIds(cartProductIds),
    enabled: cartProductIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const cartProductsById = useMemo(
    () => new Map((cartProductsQuery.data ?? []).map((product) => [product.id, product])),
    [cartProductsQuery.data],
  );
  const hasUnavailableItems =
    cartProductsQuery.isFetched &&
    items.some((item) => !getCartItemAvailability(item, cartProductsById).canPurchase);

  if (cartQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-border/40 h-8 w-48 animate-pulse rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-border/40 h-28 animate-pulse rounded-2xl" />
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
            className="border-border text-muted hover:border-border-hover hover:bg-background hover:text-foreground focus-visible:ring-border rounded-full border bg-white p-2.5 shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-foreground text-xl font-bold sm:text-2xl">Shopping Cart</h1>
        </div>
        <div className="border-border bg-card flex flex-col items-center gap-5 rounded-2xl border p-10 text-center shadow-sm">
          <div className="bg-secondary-light flex h-20 w-20 items-center justify-center rounded-full">
            <ShoppingBag className="text-secondary h-8 w-8" />
          </div>
          <div>
            <p className="text-foreground text-lg font-semibold">Your cart is empty</p>
            <p className="text-muted mt-1 text-sm">
              Looks like you haven&apos;t added any items yet
            </p>
          </div>
          <Link
            href="/products"
            className="bg-foreground hover:bg-foreground/85 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-md transition"
          >
            <Baby className="h-4 w-4" /> Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/products"
          className="border-border text-muted hover:border-border-hover hover:bg-background hover:text-foreground focus-visible:ring-border rounded-full border bg-white p-2 shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-foreground text-xl font-bold sm:text-2xl">Shopping Cart</h1>
        <span className="bg-foreground/10 text-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      {hasUnavailableItems && (
        <div className="border-danger/20 bg-danger/5 text-danger mb-5 rounded-2xl border px-4 py-3 text-sm font-medium">
          Some items are no longer available in the requested quantity. Update or remove them to
          continue.
        </div>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-3">
        {/* Items — single receipt-style card */}
        <div className="divide-border border-border bg-card divide-y overflow-hidden rounded-2xl border shadow-sm lg:col-span-2">
          <div className="text-muted hidden items-center justify-between px-4 py-2.5 text-xs font-semibold tracking-widest uppercase sm:flex">
            <span>Product</span>
            <div className="flex gap-8 lg:gap-16">
              <span>Qty</span>
              <span>Subtotal</span>
            </div>
          </div>
          {items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              currencyCode={currencyCode}
              onUpdate={(lineItemId, quantity) => updateMutation.mutate({ lineItemId, quantity })}
              onRemove={(lineItemId) => removeMutation.mutate(lineItemId)}
              isUpdating={updateMutation.isPending}
              isRemoving={removeMutation.isPending}
              productsById={cartProductsById}
              productsLoaded={cartProductsQuery.isFetched}
            />
          ))}
        </div>

        {/* Summary — sticky on desktop */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="border-border bg-card rounded-2xl border p-6 shadow-sm">
            <h2 className="text-foreground mb-5 text-sm font-bold tracking-wider uppercase">
              Order Summary
            </h2>
            <div className="space-y-3 text-sm">
              <div className="text-muted flex justify-between">
                <span>
                  {items.length} {items.length === 1 ? "item" : "items"} (
                  {items.reduce((sum, i) => sum + i.quantity, 0)} units)
                </span>
              </div>
              <div className="text-muted flex justify-between">
                <span>Subtotal</span>
                <span className="text-foreground font-medium">
                  {formatPrice(cart.subtotal ?? 0, currencyCode)}
                </span>
              </div>
              {(cart.tax_total ?? 0) > 0 && (
                <div className="text-muted flex justify-between">
                  <span>Tax</span>
                  <span className="text-foreground font-medium">
                    {formatPrice(cart.tax_total ?? 0, currencyCode)}
                  </span>
                </div>
              )}
              {(cart.discount_total ?? 0) > 0 && (
                <div className="text-success flex justify-between">
                  <span>Discount</span>
                  <span className="font-medium">
                    -{formatPrice(cart.discount_total ?? 0, currencyCode)}
                  </span>
                </div>
              )}
              {(() => {
                const subtotal = cart.subtotal ?? 0;
                const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
                const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
                if (remaining <= 0) {
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Shipping</span>
                      <span className="text-accent-green flex items-center gap-1 text-xs font-medium">
                        <Check className="h-3 w-3" /> Free
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
                <div className="text-foreground flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(cart.total ?? 0, currencyCode)}</span>
                </div>
              </div>
            </div>

            <div className="bg-secondary-light/50 text-muted mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
              <Clock className="text-secondary h-3.5 w-3.5 shrink-0" />
              <span>
                Estimated delivery:{" "}
                <span className="text-foreground font-medium">within 24 hours</span>
              </span>
            </div>
          </div>

          {/* Promo Code */}
          <div className="border-border bg-card rounded-2xl border p-6 shadow-sm">
            <h3 className="text-foreground mb-3 text-sm font-bold">Promo Code</h3>
            {cart.promotions && cart.promotions.length > 0 ? (
              <div className="space-y-2">
                {cart.promotions.map((promo) => (
                  <div
                    key={promo.code}
                    className="bg-accent-green-light flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="text-success font-medium">{promo.code}</span>
                    <button
                      onClick={() => removePromoMutation.mutate(promo.code)}
                      className="text-muted hover:text-danger focus-visible:ring-danger/20 transition focus-visible:rounded focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter code"
                  className="border-border bg-background focus:border-primary focus:ring-primary/15 h-9 flex-1 rounded-lg border px-3 text-sm transition outline-none focus:ring-2"
                />
                <button
                  onClick={() => promoMutation.mutate()}
                  disabled={!promoCode || promoMutation.isPending}
                  className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 rounded-full px-4 text-sm font-medium text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            )}
            {promoMutation.isError && (
              <p className="text-danger mt-2 text-xs">{(promoMutation.error as Error).message}</p>
            )}
          </div>

          {hasUnavailableItems ? (
            <button
              type="button"
              disabled
              className="bg-foreground flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white opacity-50"
            >
              Resolve Stock Issues First
            </button>
          ) : (
            <Link
              href="/checkout"
              className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
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
    <div className="hover:bg-background/50 flex gap-3 px-4 py-3 transition">
      <Link
        href={productHref}
        className="bg-background relative h-20 w-20 shrink-0 overflow-hidden rounded-xl transition-opacity hover:opacity-90 sm:h-24 sm:w-24"
      >
        {resolvedImage ? (
          <Image src={resolvedImage} alt={item.title} fill sizes="96px" className="object-cover" />
        ) : (
          <div className="text-muted-light flex h-full items-center justify-center">
            <ShoppingBag className="h-6 w-6" />
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={productHref} className="group">
              <h3 className="text-foreground group-hover:text-secondary line-clamp-1 text-sm font-medium transition-colors">
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

        <div className="mt-1 flex items-center justify-between">
          <div className="border-border flex items-center rounded-full border">
            <button
              onClick={() => {
                const next = Math.max(1, item.quantity - 1);
                setEditQty(String(next));
                onUpdate(item.id, next);
              }}
              disabled={isUpdating || availability.isOutOfStock || item.quantity <= 1}
              className="text-muted hover:text-foreground focus-visible:ring-primary/20 cursor-pointer px-3 py-2 transition focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
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
              disabled={availability.isOutOfStock}
              className="focus-visible:ring-primary/20 w-8 bg-transparent text-center text-xs font-bold outline-none focus-visible:ring-2 disabled:opacity-40"
            />
            <button
              onClick={() => {
                const next = Math.min(effectiveMaxQuantity, item.quantity + 1);
                setEditQty(String(next));
                onUpdate(item.id, next);
              }}
              disabled={
                isUpdating || availability.isOutOfStock || item.quantity >= effectiveMaxQuantity
              }
              className="text-muted hover:text-foreground focus-visible:ring-primary/20 cursor-pointer px-3 py-2 transition focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={() => onRemove(item.id)}
            disabled={isRemoving}
            className="text-muted hover:bg-danger/10 hover:text-danger focus-visible:ring-danger/20 rounded-full p-2.5 transition focus-visible:ring-2 focus-visible:outline-none"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
