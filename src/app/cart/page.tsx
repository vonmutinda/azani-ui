"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Baby, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { getCart, updateLineItem, removeLineItem, addPromoCode, removePromoCode } from "@/lib/medusa-api";
import { formatPrice } from "@/lib/formatters";

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
  const items = cart?.items ?? [];
  const currencyCode = "etb";

  if (cartQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded bg-border/40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-border/40" />
        ))}
      </div>
    );
  }

  if (!cart || items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/products" className="rounded-full p-2 text-muted transition hover:bg-primary-light hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Shopping Cart</h1>
        </div>
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-light">
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">Your cart is empty</p>
            <p className="mt-1 text-sm text-muted">Looks like you haven&apos;t added any items yet</p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-hover"
          >
            <Baby className="h-4 w-4" /> Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/products" className="rounded-full p-2 text-muted transition hover:bg-primary-light hover:text-primary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Shopping Cart</h1>
        <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Items */}
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 rounded-2xl border border-border bg-card p-4 transition hover:shadow-sm"
            >
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-background">
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-light">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div>
                  <h3 className="line-clamp-1 text-sm font-medium text-foreground">{item.title}</h3>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                  )}
                  <p className="mt-0.5 text-sm font-bold text-primary">
                    {formatPrice(item.unit_price, currencyCode)}
                  </p>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-border">
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          lineItemId: item.id,
                          quantity: Math.max(1, item.quantity - 1),
                        })
                      }
                      disabled={updateMutation.isPending}
                      className="px-2.5 py-1 text-muted hover:text-foreground"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[2rem] text-center text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          lineItemId: item.id,
                          quantity: item.quantity + 1,
                        })
                      }
                      disabled={updateMutation.isPending}
                      className="px-2.5 py-1 text-muted hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foreground">
                      {formatPrice(item.total, currencyCode)}
                    </span>
                    <button
                      onClick={() => removeMutation.mutate(item.id)}
                      disabled={removeMutation.isPending}
                      className="rounded-full p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-foreground">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{formatPrice(cart.subtotal, currencyCode)}</span>
              </div>
              {cart.tax_total > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Tax</span>
                  <span className="font-medium text-foreground">{formatPrice(cart.tax_total, currencyCode)}</span>
                </div>
              )}
              {cart.discount_total > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span className="font-medium">-{formatPrice(cart.discount_total, currencyCode)}</span>
                </div>
              )}
              {cart.shipping_total > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Shipping</span>
                  <span className="font-medium text-foreground">{formatPrice(cart.shipping_total, currencyCode)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-lg font-bold text-foreground">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(cart.total, currencyCode)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Promo Code */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-3 text-sm font-bold text-foreground">Promo Code</h3>
            {cart.promotions && cart.promotions.length > 0 ? (
              <div className="space-y-2">
                {cart.promotions.map((promo) => (
                  <div key={promo.code} className="flex items-center justify-between rounded-lg bg-accent-green-light px-3 py-2 text-sm">
                    <span className="font-medium text-success">{promo.code}</span>
                    <button
                      onClick={() => removePromoMutation.mutate(promo.code)}
                      className="text-muted hover:text-danger"
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
                  className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={() => promoMutation.mutate()}
                  disabled={!promoCode || promoMutation.isPending}
                  className="rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            )}
            {promoMutation.isError && (
              <p className="mt-2 text-xs text-danger">{(promoMutation.error as Error).message}</p>
            )}
          </div>

          <Link
            href="/checkout"
            className="flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-hover hover:shadow-lg"
          >
            Proceed to Checkout <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
