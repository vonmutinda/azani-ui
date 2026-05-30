"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Truck,
} from "lucide-react";
import { useState, useMemo, useCallback, useRef } from "react";
import {
  getProductById,
  addToCart,
  getCart,
  getWishlistProductIds,
  toggleWishlistProduct,
} from "@/lib/medusa-api";
import {
  getVariantAvailability,
  getVariantDiscountPercent,
  getVariantOriginalPrice,
  getVariantPrice,
  stripHtml,
} from "@/lib/formatters";
import { freeShippingThresholdLabel } from "@/lib/shipping";
import { MedusaCart, MedusaProductVariant } from "@/types/medusa";
import { useToast } from "@/components/toast";

type Props = {
  productId: string;
  onBack: () => void;
};

export function ProductDetail({ productId, onBack }: Props) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId),
    enabled: !!productId,
  });
  const wishlistQuery = useQuery({
    queryKey: ["wishlist"],
    queryFn: getWishlistProductIds,
    staleTime: 30 * 1000,
  });

  const cartQuery = useQuery({ queryKey: ["cart"], queryFn: getCart, staleTime: 10_000 });

  const product = productQuery.data?.product;
  const isWishlisted = product ? (wishlistQuery.data ?? []).includes(product.id) : false;

  const defaultOptions = useMemo(() => {
    const firstVariant = product?.variants?.[0];
    if (!firstVariant?.options) return {};
    const initial: Record<string, string> = {};
    for (const vo of firstVariant.options) {
      initial[vo.option_id] = vo.value;
    }
    return initial;
  }, [product]);

  const effectiveOptions =
    Object.keys(selectedOptions).length > 0 ? selectedOptions : defaultOptions;

  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flashAdded = useCallback(() => {
    setJustAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 1500);
  }, []);

  const cartMutation = useMutation({
    mutationFn: ({ variantId, qty }: { variantId: string; qty: number }) =>
      addToCart(variantId, qty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      showToast(`${product?.title ?? "Item"} added to cart`, "cart");
      flashAdded();
    },
  });
  const wishlistMutation = useMutation({
    mutationFn: () => toggleWishlistProduct(productId),
    onSuccess: (wishlistIds) => {
      queryClient.setQueryData(["wishlist"], wishlistIds);
      const wasAdded = wishlistIds.includes(productId);
      showToast(
        wasAdded ? "Saved to wishlist" : "Removed from wishlist",
        wasAdded ? "success" : "info",
      );
    },
  });

  const selectedVariant: MedusaProductVariant | undefined = useMemo(() => {
    const opts = product?.options ?? [];
    const vars = product?.variants ?? [];
    return (
      vars.find((v) => {
        if (!v.options) return false;
        return opts.every((opt) => {
          const selected = effectiveOptions[opt.id];
          if (!selected) return false;
          return v.options!.some((vo) => vo.option_id === opt.id && vo.value === selected);
        });
      }) ?? vars[0]
    );
  }, [product, effectiveOptions]);

  // Does an in-stock variant carry `value` for `optionId`, compatible with the
  // given selection of the *other* options? An empty selection asks the looser
  // question: is it available in *any* combination?
  const isValueAvailableGiven = useCallback(
    (selection: Record<string, string>, optionId: string, value: string) => {
      const opts = product?.options ?? [];
      const vars = product?.variants ?? [];
      return vars.some((v) => {
        if (!v.options || !getVariantAvailability(v).inStock) return false;
        const carriesValue = v.options.some((vo) => vo.option_id === optionId && vo.value === value);
        if (!carriesValue) return false;
        return opts.every((opt) => {
          if (opt.id === optionId) return true;
          const held = selection[opt.id];
          if (!held) return true;
          return v.options!.some((vo) => vo.option_id === opt.id && vo.value === held);
        });
      });
    },
    [product],
  );

  // A pill is fully disabled only when its value is sold out in *every*
  // combination (a true dead end). Values available in some in-stock variant
  // stay selectable — picking one repairs the other options (see below).
  const isValueAvailable = useCallback(
    (optionId: string, value: string) => isValueAvailableGiven({}, optionId, value),
    [isValueAvailableGiven],
  );

  // Selecting a value can strand another option on a now-unavailable value
  // (e.g. a size the chosen colour doesn't come in). Repair each other option
  // to its first still-available value so the selection never hits a dead end.
  const handleOptionSelect = useCallback(
    (optionId: string, value: string) => {
      setSelectedOptions((prev) => {
        const base = Object.keys(prev).length > 0 ? prev : defaultOptions;
        const next = { ...base, [optionId]: value };
        for (const opt of product?.options ?? []) {
          if (opt.id === optionId) continue;
          const held = next[opt.id];
          if (held && isValueAvailableGiven(next, opt.id, held)) continue;
          const firstAvailable = opt.values.find((v) => isValueAvailableGiven(next, opt.id, v.value));
          if (firstAvailable) next[opt.id] = firstAvailable.value;
        }
        return next;
      });
    },
    [defaultOptions, product, isValueAvailableGiven],
  );

  const availability = getVariantAvailability(selectedVariant);

  const cartQtyForVariant = useMemo(() => {
    if (!selectedVariant || !cartQuery.data) return 0;
    const cart = cartQuery.data as MedusaCart;
    return (cart.items ?? [])
      .filter((li) => li.variant_id === selectedVariant.id)
      .reduce((sum, li) => sum + li.quantity, 0);
  }, [cartQuery.data, selectedVariant]);

  const remainingStock = Math.max(availability.maxQuantity - cartQtyForVariant, 0);
  const maxedOut = availability.canPurchase && availability.maxQuantity > 0 && remainingStock === 0;
  const safeQuantity = Math.min(quantity, Math.max(remainingStock, 1));

  const backLink = (
    <button
      type="button"
      onClick={onBack}
      className="text-muted hover:text-foreground focus-visible:ring-foreground/30 mb-4 inline-flex items-center gap-1.5 rounded-full text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <ArrowLeft className="h-4 w-4" /> Back to products
    </button>
  );

  if (productQuery.isLoading) {
    return (
      <div>
        {backLink}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-border/40 aspect-square animate-pulse rounded-2xl" />
          <div className="space-y-4">
            <div className="bg-border/40 h-8 w-3/4 animate-pulse rounded" />
            <div className="bg-border/40 h-6 w-1/3 animate-pulse rounded" />
            <div className="bg-border/40 h-32 animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        {backLink}
        <div className="border-border/50 bg-card flex flex-col items-center gap-5 rounded-2xl border p-8 text-center sm:p-16">
          <div className="bg-primary-light flex h-20 w-20 items-center justify-center rounded-full">
            <ShoppingBag className="text-primary h-8 w-8" />
          </div>
          <div>
            <p className="text-foreground text-lg font-semibold">Product not found</p>
            <p className="text-muted mt-1 text-sm">
              This product may have been removed or is no longer available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const images = product.images ?? [];
  const allImages = product.thumbnail
    ? [{ url: product.thumbnail }, ...images.filter((img) => img.url !== product.thumbnail)]
    : images;

  const price = selectedVariant ? getVariantPrice(selectedVariant) : "--";
  const originalPrice = getVariantOriginalPrice(selectedVariant);
  const discountPercent = getVariantDiscountPercent(selectedVariant);
  const category = product.categories?.[0];

  const handleAddToCart = () => {
    if (!selectedVariant || !availability.canPurchase) return;
    if (maxedOut) {
      showToast("Maximum quantity already in cart", "info");
      return;
    }
    cartMutation.mutate({ variantId: selectedVariant.id, qty: safeQuantity });
  };
  const handleWishlistToggle = () => {
    wishlistMutation.mutate();
  };

  return (
    <div>
      {backLink}
      <nav
        aria-label="Breadcrumb"
        className="text-muted mb-4 flex flex-wrap items-center gap-1.5 text-sm"
      >
        <Link href="/" className="hover:text-foreground transition">
          Home
        </Link>
        {category && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <Link
              href={`/products?category=${category.handle}`}
              className="hover:text-foreground transition"
            >
              {category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="text-foreground line-clamp-1 font-medium" aria-current="page">
          {product.title}
        </span>
      </nav>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Images */}
        <div className="space-y-3">
          <div className="border-border/50 bg-background relative aspect-square overflow-hidden rounded-2xl border">
            {allImages[activeImageIndex] ? (
              <Image
                src={allImages[activeImageIndex].url}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="text-muted flex h-full items-center justify-center">
                <ShoppingBag className="h-16 w-16" />
              </div>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImageIndex(i)}
                  className={`focus-visible:ring-primary/30 bg-card relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-2 transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                    i === activeImageIndex
                      ? "border-foreground"
                      : "border-border/50 hover:border-foreground/30"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={`${product.title} thumbnail ${i + 1}`}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="border-border/50 bg-card space-y-5 rounded-2xl border p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-foreground text-xl font-bold sm:text-2xl">{product.title}</h2>
            </div>
            <button
              type="button"
              onClick={handleWishlistToggle}
              disabled={wishlistMutation.isPending}
              className={`focus-visible:ring-primary/30 bg-card flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 ${
                isWishlisted
                  ? "border-primary text-primary"
                  : "border-border/50 text-muted hover:bg-foreground/[0.04] hover:text-foreground"
              }`}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className="h-[18px] w-[18px]" fill={isWishlisted ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-foreground text-2xl font-bold">{price}</span>
            {originalPrice && (
              <span className="text-muted text-base line-through">{originalPrice}</span>
            )}
            {discountPercent ? (
              <span className="text-primary text-base font-bold">-{discountPercent}%</span>
            ) : null}
          </div>
          <p
            className={`text-sm font-medium ${
              maxedOut
                ? "text-muted"
                : availability.isOutOfStock
                  ? "text-danger"
                  : availability.isLowStock
                    ? "text-accent-yellow-ink"
                    : "text-success-ink"
            }`}
          >
            {maxedOut ? "Max quantity in cart" : availability.label}
          </p>

          {product.description && (
            <p className="text-muted text-sm leading-relaxed">{stripHtml(product.description)}</p>
          )}

          {/* Options */}
          {(product.options ?? []).map((option) => (
            <div key={option.id} className="space-y-2">
              <label className="text-foreground text-sm font-semibold">{option.title}</label>
              <div className="flex flex-wrap gap-2">
                {option.values.map((val) => {
                  const selected = effectiveOptions[option.id] === val.value;
                  const available = isValueAvailable(option.id, val.value);
                  return (
                    <button
                      key={val.id}
                      type="button"
                      onClick={() => handleOptionSelect(option.id, val.value)}
                      disabled={!available && !selected}
                      aria-pressed={selected}
                      aria-label={available ? undefined : `${val.value} — sold out`}
                      className={`focus-visible:ring-primary/20 rounded-full border px-4 py-2.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                        selected
                          ? "border-foreground bg-foreground/[0.06] text-foreground"
                          : available
                            ? "border-border/50 text-foreground hover:bg-foreground/[0.04]"
                            : "border-border/50 text-muted cursor-not-allowed line-through opacity-60"
                      }`}
                    >
                      {val.value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-3">
            <div className="border-border/50 bg-card flex items-center rounded-full border">
              <button
                onClick={() => setQuantity(Math.max(1, safeQuantity - 1))}
                className="text-muted hover:text-foreground focus-visible:ring-primary/20 flex h-11 w-11 items-center justify-center rounded-l-full transition focus-visible:ring-2 focus-visible:outline-none"
                disabled={!availability.canPurchase || maxedOut}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="flex h-11 w-10 items-center justify-center text-sm font-semibold">
                {safeQuantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(Math.max(remainingStock, 1), safeQuantity + 1))}
                className="text-muted hover:text-foreground focus-visible:ring-primary/20 flex h-11 w-11 items-center justify-center rounded-r-full transition focus-visible:ring-2 focus-visible:outline-none"
                disabled={!availability.canPurchase || maxedOut || safeQuantity >= remainingStock}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={
                cartMutation.isPending ||
                !selectedVariant ||
                !availability.canPurchase ||
                justAdded ||
                maxedOut
              }
              className={`flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 ${
                justAdded
                  ? "bg-accent-green-bold"
                  : maxedOut
                    ? "bg-muted cursor-default"
                    : "bg-primary hover:bg-primary-hover focus-visible:ring-primary/30"
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="h-4 w-4 animate-[pop_0.3s_ease-out]" strokeWidth={3} />
                  Added
                </>
              ) : maxedOut ? (
                <>
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                  Max in Cart
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  {cartMutation.isPending
                    ? "Adding..."
                    : availability.canPurchase
                      ? "Add to Cart"
                      : "Out of Stock"}
                </>
              )}
            </button>
          </div>

          {/* Point-of-purchase reassurance */}
          <ul className="text-muted flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <li className="flex items-center gap-1.5">
              <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
              Free delivery on orders over {freeShippingThresholdLabel()}
            </li>
            <li className="flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 shrink-0" aria-hidden="true" />
              Pay securely with M-Pesa
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <Link
                href="/policies/returns"
                className="hover:text-foreground underline-offset-2 transition hover:underline"
              >
                Easy returns
              </Link>
            </li>
          </ul>

          {cartMutation.isError && (
            <p className="text-danger text-sm font-medium">
              Failed to add to cart. Please try again.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
