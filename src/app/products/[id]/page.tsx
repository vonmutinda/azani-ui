"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import {
  getProductById,
  addToCart,
  getWishlistProductIds,
  toggleWishlistProduct,
} from "@/lib/medusa-api";
import { getVariantPrice, stripHtml } from "@/lib/formatters";
import { MedusaProductVariant } from "@/types/medusa";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const productQuery = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id),
    enabled: !!id,
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
    mutationFn: () => toggleWishlistProduct(id),
    onSuccess: (wishlistIds) => {
      queryClient.setQueryData(["wishlist"], wishlistIds);
    },
  });

  if (productQuery.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
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
      <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <p className="text-muted">Product not found.</p>
        <Link
          href="/products"
          className="text-primary mt-4 inline-block text-sm font-medium hover:underline"
        >
          Back to products
        </Link>
      </div>
    );
  }

  const images = product.images ?? [];
  const allImages = product.thumbnail
    ? [{ url: product.thumbnail }, ...images.filter((img) => img.url !== product.thumbnail)]
    : images;

  const options = product.options ?? [];
  const variants = product.variants ?? [];

  // Find matching variant based on selected options
  const selectedVariant: MedusaProductVariant | undefined =
    variants.find((v) => {
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        onClick={() => router.back()}
        className="text-muted hover:text-primary mb-6 inline-flex items-center gap-1.5 text-sm transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <div className="space-y-3">
          <div className="border-border bg-background aspect-square overflow-hidden rounded-2xl border">
            {allImages[activeImageIndex] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={allImages[activeImageIndex].url}
                alt={product.title}
                className="h-full w-full object-cover"
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
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    i === activeImageIndex
                      ? "border-primary"
                      : "border-border hover:border-primary/40"
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
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-foreground text-2xl font-bold sm:text-3xl">{product.title}</h1>
              {product.categories?.[0] && (
                <Link
                  href={`/products?category=${product.categories[0].handle}`}
                  className="text-muted hover:text-primary mt-1 inline-block text-sm"
                >
                  {product.categories[0].name}
                </Link>
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

          <p className="text-primary text-2xl font-bold">{price}</p>

          {product.description && (
            <p className="text-muted text-sm leading-relaxed">{stripHtml(product.description)}</p>
          )}

          {/* Options */}
          {options.map((option) => (
            <div key={option.id} className="space-y-2">
              <label className="text-foreground text-sm font-semibold">{option.title}</label>
              <div className="flex flex-wrap gap-2">
                {option.values.map((val) => (
                  <button
                    key={val.id}
                    onClick={() =>
                      setSelectedOptions((prev) => ({ ...prev, [option.id]: val.value }))
                    }
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
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
          <div className="flex items-center gap-4">
            <div className="border-border flex items-center rounded-full border">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="text-muted hover:text-foreground flex h-10 w-10 items-center justify-center rounded-l-full transition"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="flex h-10 w-12 items-center justify-center text-sm font-semibold">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="text-muted hover:text-foreground flex h-10 w-10 items-center justify-center rounded-r-full transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={cartMutation.isPending || !selectedVariant}
              className="bg-primary hover:bg-primary-hover flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" />
              {cartMutation.isPending ? "Adding..." : "Add to Cart"}
            </button>
          </div>

          {cartMutation.isSuccess && (
            <p className="text-success text-sm font-medium">Added to cart!</p>
          )}
          {wishlistMutation.isSuccess && (
            <p className="text-primary text-sm font-medium">
              {isWishlisted ? "Saved to wishlist." : "Removed from wishlist."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
