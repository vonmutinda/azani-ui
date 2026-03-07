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
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="bg-border/40 mb-8 h-8 w-48 animate-pulse rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-border/40 aspect-[3/4] animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const wishlistIds = wishlistQuery.data ?? [];
  const products = wishlistProductsQuery.data ?? [];

  if (wishlistIds.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center sm:px-6 lg:px-8">
        <div className="bg-secondary-light mx-auto flex h-20 w-20 items-center justify-center rounded-full">
          <Heart className="text-secondary h-8 w-8" />
        </div>
        <h1 className="text-foreground mt-4 text-2xl font-bold">Wishlist</h1>
        <p className="text-muted mt-2 text-sm">
          {customer
            ? "Your wishlist is empty. Browse our products and save your favorites!"
            : "Save products to your wishlist as a guest, or sign in to keep them synced to your account."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/products"
            className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Browse Products
          </Link>
          {!customer && (
            <Link
              href="/account/login"
              className="border-border text-foreground hover:border-border-hover hover:text-foreground focus-visible:ring-border inline-flex items-center gap-2 rounded-full border bg-white px-6 py-3 text-sm font-semibold shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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
          <h1 className="text-foreground text-2xl font-bold">Wishlist</h1>
          <p className="text-muted mt-1 text-sm">
            {customer
              ? "Your saved favorites, synced to your account."
              : "Your saved favorites in this browser. Sign in to keep them across devices."}
          </p>
        </div>
        <div className="border-foreground/10 bg-foreground/5 text-foreground rounded-full border px-3 py-1 text-xs font-semibold">
          {wishlistIds.length} {wishlistIds.length === 1 ? "item" : "items"}
        </div>
      </div>

      {wishlistProductsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-border/40 aspect-[3/4] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center gap-5 rounded-2xl border p-10 text-center shadow-sm">
          <div className="bg-secondary-light flex h-20 w-20 items-center justify-center rounded-full">
            <ShoppingBag className="text-secondary h-8 w-8" />
          </div>
          <div>
            <p className="text-foreground text-lg font-semibold">No saved products found</p>
            <p className="text-muted mt-1 text-sm">
              Some wishlist items may no longer be available.
            </p>
          </div>
          <Link
            href="/products"
            className="bg-foreground hover:bg-foreground/85 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition"
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
