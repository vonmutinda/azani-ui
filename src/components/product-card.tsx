"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, Heart, Plus, ShoppingBag } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MedusaCart, MedusaProduct } from "@/types/medusa";
import {
  getProductPrice,
  getProductOriginalPrice,
  getProductDiscountPercent,
  getVariantAvailability,
  resolveProductImage,
} from "@/lib/formatters";
import { addToCart, getCart, getWishlistProductIds, toggleWishlistProduct } from "@/lib/medusa-api";
import { useToast } from "@/components/toast";

type Props = {
  product: MedusaProduct;
  onSelect?: (productId: string) => void;
  onAddedToCart?: (productId: string) => void;
};

export function ProductCard({ product, onSelect, onAddedToCart }: Props) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const imageUrl = resolveProductImage(product);
  const price = getProductPrice(product);
  const originalPrice = getProductOriginalPrice(product);
  const discountPercent = getProductDiscountPercent(product);
  const optionCount = product.variants?.length ?? 0;
  const requiresSize = product.options?.some((option) => option.title.toLowerCase() === "size");
  const availableSizes =
    product.options
      ?.filter((option) => option.title.toLowerCase() === "size")
      .flatMap((option) =>
        option.values
          .filter((value) =>
            product.variants?.some(
              (variant) =>
                getVariantAvailability(variant).canPurchase &&
                variant.options?.some((v) => v.option_id === option.id && v.value === value.value),
            ),
          )
          .map((value) => value.value),
      ) ?? [];
  const quickAddVariant =
    product.variants?.find((variant) => getVariantAvailability(variant).canPurchase) ??
    product.variants?.[0];
  const availability = getVariantAvailability(quickAddVariant);

  const cartQuery = useQuery({ queryKey: ["cart"], queryFn: getCart, staleTime: 10_000 });
  const cartQtyForVariant = useMemo(() => {
    if (!quickAddVariant || !cartQuery.data) return 0;
    const cart = cartQuery.data as MedusaCart;
    return (cart.items ?? [])
      .filter((li) => li.variant_id === quickAddVariant.id)
      .reduce((sum, li) => sum + li.quantity, 0);
  }, [cartQuery.data, quickAddVariant]);

  const maxedOut =
    availability.canPurchase &&
    availability.maxQuantity > 0 &&
    cartQtyForVariant >= availability.maxQuantity;

  const wishlistQuery = useQuery({
    queryKey: ["wishlist"],
    queryFn: getWishlistProductIds,
    staleTime: 30 * 1000,
  });
  const isWishlisted = (wishlistQuery.data ?? []).includes(product.id);

  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flashAdded = useCallback(() => {
    setJustAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 1500);
  }, []);

  const cartMutation = useMutation({
    mutationFn: (variantId: string) => addToCart(variantId, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      showToast(`${product.title} added to cart`, "cart");
      flashAdded();
      onAddedToCart?.(product.id);
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
    if (!quickAddVariant || !availability.canPurchase) return;
    if (maxedOut) {
      showToast("Maximum quantity already in cart", "info");
      return;
    }
    cartMutation.mutate(quickAddVariant.id);
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
    <article className="group relative flex min-w-0 flex-col">
      {isNew && (
        <div className="absolute top-3 left-3 z-10">
          <span className="bg-accent-yellow text-foreground text-2xs rounded-full px-2.5 py-0.5 font-bold tracking-wider uppercase">
            New
          </span>
        </div>
      )}

      <div className="absolute top-2 right-2 z-10">
        <button
          type="button"
          onClick={handleWishlistToggle}
          disabled={wishlistMutation.isPending}
          className={`border-border focus-visible:ring-primary/30 bg-card flex h-11 w-11 items-center justify-center rounded-full border transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 ${
            isWishlisted
              ? "text-primary"
              : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
          }`}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className="h-[18px] w-[18px]" fill={isWishlisted ? "currentColor" : "none"} />
        </button>
      </div>

      <Link href={productHref} onClick={handleClick} className="block overflow-hidden rounded-lg">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[#f6f3eb]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            />
          ) : (
            <div className="text-muted-light flex h-full flex-col items-center justify-center gap-2">
              <ShoppingBag className="h-8 w-8" />
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 pt-3 pb-2">
        <Link
          href={productHref}
          onClick={handleClick}
          className="text-foreground hover:text-secondary line-clamp-2 text-sm leading-snug font-medium transition"
        >
          {product.title}
        </Link>

        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-foreground text-sm font-bold">{price?.formatted ?? "--"}</span>
          {originalPrice && (
            <span className="text-muted text-2xs line-through">{originalPrice}</span>
          )}
          {discountPercent ? (
            <span className="text-primary text-2xs font-bold">-{discountPercent}%</span>
          ) : null}
        </div>

        <p
          className={`text-xs ${
            maxedOut
              ? "text-muted"
              : availability.isOutOfStock
                ? "text-danger"
                : availability.isLowStock
                  ? "text-accent-yellow-ink"
                  : "text-muted"
          }`}
        >
          {maxedOut ? "Max in cart" : availability.label}
        </p>

        {requiresSize ? (
          <p className="text-muted text-xs">Sizes: {availableSizes.join(", ") || "Sold out"}</p>
        ) : optionCount > 1 ? (
          <p className="text-muted text-xs">{optionCount} options</p>
        ) : null}

        <div className="mt-auto flex flex-col items-start justify-between gap-x-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
          {requiresSize ? (
            <Link
              href={productHref}
              onClick={handleClick}
              className="text-primary inline-flex min-h-11 shrink-0 items-center text-sm font-semibold underline underline-offset-4"
            >
              Choose size
            </Link>
          ) : (
            quickAddVariant && (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={cartMutation.isPending || !availability.canPurchase || justAdded}
                className={`flex h-11 w-11 items-center justify-center rounded-lg text-white transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                  justAdded
                    ? "bg-accent-green-bold scale-110"
                    : maxedOut
                      ? "bg-muted cursor-default opacity-60"
                      : "bg-primary hover:bg-primary-hover focus-visible:ring-primary/30 disabled:opacity-40"
                }`}
                aria-label={
                  maxedOut
                    ? "Max quantity in cart"
                    : availability.canPurchase
                      ? "Add to cart"
                      : "Out of stock"
                }
                title={
                  maxedOut
                    ? "Max quantity in cart"
                    : availability.canPurchase
                      ? "Add to cart"
                      : "Out of stock"
                }
              >
                {justAdded ? (
                  <Check className="h-4 w-4 animate-[pop_0.3s_ease-out]" strokeWidth={3} />
                ) : maxedOut ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : (
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                )}
              </button>
            )
          )}
        </div>
      </div>
    </article>
  );
}
