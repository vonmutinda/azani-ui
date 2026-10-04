"use client";

import Link from "next/link";
import { EnamelUtilityIcon } from "@/components/enamel-utility-icon";
import { ShoppingBag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { buttonVariants } from "@/components/ui/button";
import {
  getCustomer,
  getProductsByIds,
  getWishlistProductIds,
  toggleWishlistProduct,
} from "@/lib/medusa-api";
import { useToast } from "@/components/toast";

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

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

  const removeFromWishlist = useMutation({
    mutationFn: (productId: string) => toggleWishlistProduct(productId),
    onSuccess: (wishlistIds) => {
      queryClient.setQueryData(["wishlist"], wishlistIds);
      showToast("Removed from wishlist", "success");
    },
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
          <EnamelUtilityIcon name="wishlist" size={48} />
        </div>
        <h1 className="text-foreground mt-4 text-2xl font-bold">Wishlist</h1>
        <p className="text-muted mt-2 text-sm">
          {customer
            ? "Your wishlist is empty. Browse our products and save your favorites!"
            : "Save products to your wishlist as a guest, or sign in to keep them synced to your account."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/products" className={buttonVariants()}>
            Browse Products
          </Link>
          {!customer && (
            <Link
              href="/account/login"
              className="border-border/50 text-foreground hover:border-border hover:text-foreground focus-visible:ring-border inline-flex items-center gap-2 rounded-full border bg-white px-6 py-2.5 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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
        {!customer && (
          <Link href="/account/login" className="text-secondary min-h-11 font-semibold underline">
            Sign in to sync saved items
          </Link>
        )}
        <div className="border-foreground/10 bg-foreground/5 text-foreground rounded-full border px-3 py-1 text-xs font-semibold">
          {wishlistIds.length} {wishlistIds.length === 1 ? "item" : "items"}
        </div>
      </div>

      {removeFromWishlist.isError && (
        <p role="alert" className="text-danger mb-4">
          We couldn’t remove that item. Please try again.
        </p>
      )}
      {wishlistProductsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-border/40 aspect-[3/4] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : wishlistProductsQuery.isError ? (
        <div
          role="alert"
          className="border-border/50 bg-card flex flex-col items-center gap-4 rounded-2xl border p-10 text-center"
        >
          <div>
            <p className="text-foreground text-lg font-semibold">
              We couldn’t load your saved products
            </p>
            <p className="text-muted mt-1 text-sm">Please try again in a moment.</p>
          </div>
          <button
            type="button"
            onClick={() => wishlistProductsQuery.refetch()}
            className={buttonVariants()}
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {wishlistProductsQuery.isSuccess &&
            wishlistIds
              .filter((id) => !products.some((product) => product.id === id))
              .map((id) => (
                <article
                  key={id}
                  className="border-border bg-card flex flex-col items-start gap-3 rounded-xl border p-6"
                >
                  <ShoppingBag className="text-muted h-8 w-8" aria-hidden="true" />
                  <h2 className="text-lg font-semibold">Saved item unavailable</h2>
                  <p className="text-muted text-sm">
                    This style is no longer in the catalogue. You can remove it from your saved
                    items.
                  </p>
                  <button
                    type="button"
                    aria-label="Remove unavailable saved item"
                    disabled={removeFromWishlist.isPending}
                    onClick={() => removeFromWishlist.mutate(id)}
                    className="text-primary min-h-11 rounded-lg px-3 font-semibold underline disabled:opacity-50"
                  >
                    Remove saved item
                  </button>
                </article>
              ))}
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddedToCart={(id) => removeFromWishlist.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
