"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { getCustomer, getProductsByIds, getWishlistProductIds } from "@/lib/medusa-api";

export default function WishlistPage() {
  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer"],
    queryFn: getCustomer,
  });

  const wishlistQuery = useQuery({
    queryKey: ["wishlist"],
    queryFn: getWishlistProductIds,
  });

  const wishlistProductsQuery = useQuery({
    queryKey: ["wishlist-products", wishlistQuery.data],
    queryFn: () => getProductsByIds(wishlistQuery.data ?? []),
    enabled: (wishlistQuery.data?.length ?? 0) > 0,
  });

  if (isLoading || wishlistQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-border/40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl bg-border/40" />
          ))}
        </div>
      </div>
    );
  }

  const wishlistIds = wishlistQuery.data ?? [];
  const products = wishlistProductsQuery.data ?? [];

  if (wishlistIds.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <Heart className="mx-auto h-16 w-16 text-muted-light" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">Wishlist</h1>
        <p className="mt-2 text-sm text-muted">
          {customer
            ? "Your wishlist is empty. Browse our products and save your favorites!"
            : "Save products to your wishlist as a guest, or sign in to keep them synced to your account."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            Browse Products
          </Link>
          {!customer && (
            <Link
              href="/account/login"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
            >
              Sign In to Sync
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wishlist</h1>
          <p className="mt-1 text-sm text-muted">
            {customer
              ? "Your saved favorites, synced to your account."
              : "Your saved favorites in this browser. Sign in to keep them across devices."}
          </p>
        </div>
        <div className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
          {wishlistIds.length} {wishlistIds.length === 1 ? "item" : "items"}
        </div>
      </div>

      {wishlistProductsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl bg-border/40" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-light">
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">No saved products found</p>
            <p className="mt-1 text-sm text-muted">Some wishlist items may no longer be available.</p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
