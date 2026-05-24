"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, Heart, Plus, ShoppingBag } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Chip } from "@heroui/react";
import { MedusaCart, MedusaProduct } from "@/types/medusa";
import {
  getProductPrice,
  getProductOriginalPrice,
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

  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      onSelect(product.id);
    }
  };

  const productHref = `/products/${product.id}`;
  const [isNew] = useState(() =>
    product.created_at
      ? Date.now() - new Date(product.created_at).getTime() < 30 * 24 * 60 * 60 * 1000
      : false,
  );
  const hasSalePrice = !!originalPrice;
  const wishlistLabel = isWishlisted
    ? `Remove ${product.title} from wishlist`
    : `Add ${product.title} to wishlist`;
  const quickAddLabel = maxedOut
    ? `Maximum ${product.title} quantity already in cart`
    : availability.canPurchase
      ? `Quick add ${product.title}`
      : `${product.title} is out of stock`;

  return (
    <Card
      role="article"
      className="az-product-card group relative flex min-w-0 flex-col gap-0 overflow-hidden p-0 shadow-none transition duration-300"
      variant="default"
    >
      {(isNew || hasSalePrice) && (
        <div className="absolute top-3 left-3 z-10 flex max-w-[calc(100%-4.5rem)] flex-wrap gap-1.5">
          {isNew && (
            <Chip
              className="az-pill az-pill-promo text-2xs px-2 py-1 tracking-wider uppercase"
              size="sm"
            >
              New
            </Chip>
          )}
          {hasSalePrice && (
            <Chip
              className="az-pill az-pill-trust text-2xs px-2 py-1 tracking-wider uppercase"
              size="sm"
            >
              Sale
            </Chip>
          )}
        </div>
      )}

      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 opacity-100 transition-all duration-200 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <Button
          isDisabled={wishlistMutation.isPending}
          isIconOnly
          className={`az-icon-button az-focus border-border/50 bg-card min-w-10 rounded-full border disabled:opacity-50 ${
            isWishlisted ? "text-primary" : "text-muted"
          }`}
          aria-label={wishlistLabel}
          variant="ghost"
          onPress={() => wishlistMutation.mutate()}
        >
          <Heart className="h-3.5 w-3.5" fill={isWishlisted ? "currentColor" : "none"} />
        </Button>
      </div>

      <Link href={productHref} onClick={handleClick} className="block overflow-hidden">
        <div
          data-testid="product-card-media"
          className="bg-product-media relative aspect-[4/5] overflow-hidden"
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="text-muted-light flex h-full flex-col items-center justify-center gap-2">
              <ShoppingBag className="h-8 w-8" />
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>
      </Link>

      <div
        data-testid="product-card-details"
        className="flex min-h-[7.25rem] flex-1 flex-col gap-1.5 px-3 pt-2.5 pb-3"
      >
        <Link
          href={productHref}
          onClick={handleClick}
          data-testid="product-card-title"
          className="text-foreground hover:text-secondary line-clamp-2 min-h-[2.35rem] text-sm leading-snug font-semibold transition"
        >
          {product.title}
        </Link>

        <p
          className={`text-xs leading-none font-semibold ${
            maxedOut
              ? "az-status-muted"
              : availability.isOutOfStock
                ? "az-status-danger"
                : availability.isLowStock
                  ? "az-status-warning"
                  : "az-status-success"
          }`}
        >
          {maxedOut ? "Max in cart" : availability.label}
        </p>

        <div
          data-testid="product-card-purchase-row"
          className="flex items-end justify-between gap-2"
        >
          <div className="flex min-w-0 flex-col items-start gap-0.5 sm:flex-row sm:items-baseline sm:gap-1.5">
            <span
              data-testid="product-card-price"
              className="text-foreground max-w-full text-base leading-tight font-bold whitespace-nowrap"
            >
              {price?.formatted ?? "--"}
            </span>
            {originalPrice && (
              <span className="text-muted text-2xs max-w-full truncate leading-tight line-through">
                {originalPrice}
              </span>
            )}
          </div>

          {quickAddVariant && (
            <Button
              isDisabled={cartMutation.isPending || !availability.canPurchase || justAdded}
              isIconOnly
              className={`az-focus flex h-9 w-9 min-w-9 shrink-0 items-center justify-center rounded-full text-white transition-all duration-300 ${
                justAdded
                  ? "bg-success scale-110"
                  : maxedOut
                    ? "bg-muted cursor-default opacity-60"
                    : "bg-foreground hover:bg-foreground/85 disabled:opacity-40"
              }`}
              aria-label={quickAddLabel}
              variant="ghost"
              onPress={() => {
                if (!quickAddVariant || !availability.canPurchase) return;
                if (maxedOut) {
                  showToast("Maximum quantity already in cart", "info");
                  return;
                }
                cartMutation.mutate(quickAddVariant.id);
              }}
            >
              {justAdded ? (
                <Check className="h-4 w-4 animate-[pop_0.3s_ease-out]" strokeWidth={3} />
              ) : maxedOut ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              ) : (
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
