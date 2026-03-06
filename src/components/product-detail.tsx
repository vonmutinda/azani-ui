"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { getProductById, addToCart, getWishlistProductIds, toggleWishlistProduct } from "@/lib/medusa-api";
import { getVariantPrice, stripHtml } from "@/lib/formatters";
import { MedusaProductVariant } from "@/types/medusa";

type Props = {
  productId: string;
  onBack: () => void;
};

export function ProductDetail({ productId, onBack }: Props) {
  const queryClient = useQueryClient();
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

  const product = productQuery.data?.product;
  const isWishlisted = product ? (wishlistQuery.data ?? []).includes(product.id) : false;

  const cartMutation = useMutation({
    mutationFn: ({ variantId, qty }: { variantId: string; qty: number }) =>
      addToCart(variantId, qty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
  const wishlistMutation = useMutation({
    mutationFn: () => toggleWishlistProduct(productId),
    onSuccess: (wishlistIds) => {
      queryClient.setQueryData(["wishlist"], wishlistIds);
    },
  });

  if (productQuery.isLoading) {
    return (
      <div>
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to products
        </button>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-2xl bg-border/40" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-border/40" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-border/40" />
            <div className="h-32 animate-pulse rounded bg-border/40" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to products
        </button>
        <p className="text-muted">Product not found.</p>
      </div>
    );
  }

  const images = product.images ?? [];
  const allImages = product.thumbnail
    ? [{ url: product.thumbnail }, ...images.filter((img) => img.url !== product.thumbnail)]
    : images;

  const options = product.options ?? [];
  const variants = product.variants ?? [];

  const selectedVariant: MedusaProductVariant | undefined = variants.find((v) => {
    if (!v.options) return false;
    return options.every((opt) => {
      const selected = selectedOptions[opt.id];
      if (!selected) return false;
      return v.options!.some((vo) => vo.option_id === opt.id && vo.value === selected);
    });
  }) ?? variants[0];

  const price = selectedVariant ? getVariantPrice(selectedVariant) : "--";

  const handleAddToCart = () => {
    if (selectedVariant) {
      cartMutation.mutate({ variantId: selectedVariant.id, qty: quantity });
    }
  };
  const handleWishlistToggle = () => {
    wishlistMutation.mutate();
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to products
      </button>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-background">
            {allImages[activeImageIndex] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={allImages[activeImageIndex].url}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted">
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
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    i === activeImageIndex ? "border-primary" : "border-border hover:border-primary/40"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">{product.title}</h2>
              {product.categories?.[0] && (
                <span className="mt-1 inline-block text-sm text-muted">
                  {product.categories[0].name}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleWishlistToggle}
              disabled={wishlistMutation.isPending}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-50 ${
                isWishlisted
                  ? "border-primary bg-primary-light text-primary"
                  : "border-border text-muted hover:border-primary hover:text-primary"
              }`}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className="h-4.5 w-4.5" fill={isWishlisted ? "currentColor" : "none"} />
            </button>
          </div>

          <p className="text-2xl font-bold text-primary">{price}</p>

          {product.description && (
            <p className="text-sm leading-relaxed text-muted">{stripHtml(product.description)}</p>
          )}

          {/* Options */}
          {options.map((option) => (
            <div key={option.id} className="space-y-2">
              <label className="text-sm font-semibold text-foreground">{option.title}</label>
              <div className="flex flex-wrap gap-2">
                {option.values.map((val) => (
                  <button
                    key={val.id}
                    onClick={() => setSelectedOptions((prev) => ({ ...prev, [option.id]: val.value }))}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      selectedOptions[option.id] === val.value
                        ? "border-primary bg-primary-light text-primary"
                        : "border-border text-foreground hover:border-primary/40"
                    }`}
                  >
                    {val.value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-border">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-l-full text-muted transition hover:text-foreground"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="flex h-9 w-10 items-center justify-center text-sm font-semibold">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-r-full text-muted transition hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={cartMutation.isPending || !selectedVariant}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" />
              {cartMutation.isPending ? "Adding..." : "Add to Cart"}
            </button>
          </div>

          {cartMutation.isSuccess && (
            <p className="text-sm font-medium text-success">Added to cart!</p>
          )}
          {wishlistMutation.isSuccess && (
            <p className="text-sm font-medium text-primary">
              {isWishlisted ? "Saved to wishlist." : "Removed from wishlist."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
