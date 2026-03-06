"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MedusaProduct } from "@/types/medusa";
import { getProductPrice, getProductOriginalPrice, resolveProductImage } from "@/lib/formatters";
import { addToCart, getWishlistProductIds, toggleWishlistProduct } from "@/lib/medusa-api";

type Props = {
  product: MedusaProduct;
  onSelect?: (productId: string) => void;
};

export function ProductCard({ product, onSelect }: Props) {
  const queryClient = useQueryClient();
  const imageUrl = resolveProductImage(product);
  const price = getProductPrice(product);
  const originalPrice = getProductOriginalPrice(product);
  const defaultVariant = product.variants?.[0];
  const wishlistQuery = useQuery({
    queryKey: ["wishlist"],
    queryFn: getWishlistProductIds,
    staleTime: 30 * 1000,
  });
  const isWishlisted = (wishlistQuery.data ?? []).includes(product.id);

  const cartMutation = useMutation({
    mutationFn: (variantId: string) => addToCart(variantId, 1),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const wishlistMutation = useMutation({
    mutationFn: () => toggleWishlistProduct(product.id),
    onSuccess: (wishlistIds) => {
      queryClient.setQueryData(["wishlist"], wishlistIds);
    },
  });

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (defaultVariant) {
      cartMutation.mutate(defaultVariant.id);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      onSelect(product.id);
    }
  };

  const handleWishlistToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    wishlistMutation.mutate();
  };

  const productHref = `/products/${product.id}`;
  const isNew = product.created_at
    ? Date.now() - new Date(product.created_at).getTime() < 30 * 24 * 60 * 60 * 1000
    : false;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-border-hover hover:shadow-md">
      {isNew && (
        <div className="absolute left-3 top-3 z-10">
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">New</span>
        </div>
      )}

      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100">
        <button
          type="button"
          onClick={handleWishlistToggle}
          disabled={wishlistMutation.isPending}
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-card/90 shadow-sm backdrop-blur transition disabled:opacity-50 ${
            isWishlisted
              ? "text-primary"
              : "text-muted hover:bg-primary-light hover:text-primary"
          }`}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className="h-3.5 w-3.5" fill={isWishlisted ? "currentColor" : "none"} />
        </button>
      </div>

      <Link href={productHref} onClick={handleClick} className="block overflow-hidden">
        <div className="aspect-square overflow-hidden bg-background">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-light">
              <ShoppingBag className="h-8 w-8" />
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          href={productHref}
          onClick={handleClick}
          className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground transition hover:text-primary"
        >
          {product.title}
        </Link>

        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-primary">{price?.formatted ?? "--"}</span>
            {originalPrice && (
              <span className="text-[11px] text-muted line-through">{originalPrice}</span>
            )}
          </div>

          {defaultVariant && (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={cartMutation.isPending}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
              title="Add to cart"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
