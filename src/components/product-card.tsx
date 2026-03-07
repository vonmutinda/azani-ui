"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MedusaProduct } from "@/types/medusa";
import { getProductPrice, getProductOriginalPrice, resolveProductImage } from "@/lib/formatters";
import { addToCart, getWishlistProductIds, toggleWishlistProduct } from "@/lib/medusa-api";
import { useToast } from "@/components/toast";

type Props = {
  product: MedusaProduct;
  onSelect?: (productId: string) => void;
};

export function ProductCard({ product, onSelect }: Props) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      showToast(`${product.title} added to cart`, "cart");
    },
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
  const [isNew] = useState(() =>
    product.created_at
      ? Date.now() - new Date(product.created_at).getTime() < 30 * 24 * 60 * 60 * 1000
      : false,
  );

  return (
    <article className="group border-border bg-card relative flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-shadow duration-300 hover:shadow-md">
      {isNew && (
        <div className="absolute top-3 left-3 z-10">
          <span className="bg-accent-yellow text-foreground rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase shadow-sm">
            New
          </span>
        </div>
      )}

      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 opacity-100 transition-all duration-200 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={handleWishlistToggle}
          disabled={wishlistMutation.isPending}
          className={`border-border focus-visible:ring-primary/30 flex h-10 w-10 items-center justify-center rounded-full border bg-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 ${
            isWishlisted ? "text-primary" : "text-muted hover:bg-background hover:text-foreground"
          }`}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className="h-3.5 w-3.5" fill={isWishlisted ? "currentColor" : "none"} />
        </button>
      </div>

      <Link href={productHref} onClick={handleClick} className="block overflow-hidden">
        <div className="bg-background aspect-square overflow-hidden">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="text-muted-light flex h-full flex-col items-center justify-center gap-2">
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
          className="text-foreground hover:text-secondary line-clamp-2 text-[13px] leading-snug font-medium transition"
        >
          {product.title}
        </Link>

        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-foreground text-base font-bold">{price?.formatted ?? "--"}</span>
            {originalPrice && (
              <span className="text-muted text-[11px] line-through">{originalPrice}</span>
            )}
          </div>

          {defaultVariant && (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={cartMutation.isPending}
              className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
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
