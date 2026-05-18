"use client";

import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Heart,
  MessageCircle,
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
import { getVariantAvailability, getVariantPrice, stripHtml } from "@/lib/formatters";
import { MedusaCart, MedusaProductVariant } from "@/types/medusa";
import { useToast } from "@/components/toast";

type Props = {
  productId: string;
  onBack: () => void;
};

type ProductImage = {
  url: string;
};

function getMetadataString(metadata: Record<string, unknown> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function getMetadataList(metadata: Record<string, unknown> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      );
    }
    if (typeof value === "string" && value.trim()) {
      return value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function uniqueProductImages(thumbnail?: string | null, images: ProductImage[] = []) {
  const seen = new Set<string>();
  return [thumbnail ? { url: thumbnail } : null, ...images]
    .filter((image): image is ProductImage => !!image?.url)
    .filter((image) => {
      if (seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
}

export function ProductDetail({ productId, onBack }: Props) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activeImageSelection, setActiveImageSelection] = useState({ productId: "", index: 0 });
  const [loadedImageUrls, setLoadedImageUrls] = useState<Set<string>>(() => new Set());
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(() => new Set());

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
  const allImages = useMemo(
    () => uniqueProductImages(product?.thumbnail, product?.images ?? []),
    [product],
  );
  const activeImageIndex =
    activeImageSelection.productId === product?.id
      ? Math.min(activeImageSelection.index, Math.max(allImages.length - 1, 0))
      : 0;
  const activeImage = allImages[activeImageIndex];
  const visibleActiveImage =
    activeImage && !failedImageUrls.has(activeImage.url) ? activeImage : null;
  const imageLoading = !!visibleActiveImage && !loadedImageUrls.has(visibleActiveImage.url);

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
      className="az-focus text-muted hover:text-foreground mb-4 inline-flex items-center gap-1.5 rounded-full text-sm font-medium transition"
    >
      <ArrowLeft className="h-4 w-4" /> Back to products
    </button>
  );

  if (productQuery.isLoading) {
    return (
      <div>
        {backLink}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="az-skeleton aspect-[4/5]" />
          <div className="space-y-4">
            <div className="az-skeleton h-8 w-3/4" />
            <div className="az-skeleton h-6 w-1/3" />
            <div className="az-skeleton h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        {backLink}
        <div className="az-empty-state flex flex-col items-center gap-5 p-8 sm:p-16">
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

  const price = selectedVariant ? getVariantPrice(selectedVariant) : "--";
  const categoryName = product.categories?.[0]?.name;
  const brand =
    getMetadataString(product.metadata, ["brand", "manufacturer", "vendor"]) ??
    product.collection?.title ??
    null;
  const overview =
    stripHtml(product.description ?? undefined) ||
    product.subtitle ||
    "A practical baby essential selected for everyday family routines.";
  const essentials = [
    categoryName ? `Category: ${categoryName}` : null,
    brand ? `Brand: ${brand}` : null,
    product.type?.value ? `Type: ${product.type.value}` : null,
    selectedVariant?.title ? `Selected option: ${selectedVariant.title}` : null,
    selectedVariant?.sku ? `SKU: ${selectedVariant.sku}` : null,
  ].filter((item): item is string => !!item);
  const metadataFeatures = getMetadataList(product.metadata, [
    "features",
    "essentials",
    "highlights",
  ]);
  const featureNotes =
    metadataFeatures.length > 0
      ? metadataFeatures
      : (product.tags?.map((tag) => tag.value).filter(Boolean) ?? []);
  const careNotes = getMetadataList(product.metadata, ["care", "care_notes", "usage", "use_notes"]);
  const detailCareNotes =
    careNotes.length > 0
      ? careNotes
      : [
          "Check the label and product packaging before first use.",
          "Store sealed items in a cool, dry place away from direct sun.",
        ];
  const stockTone = maxedOut
    ? "az-status-muted"
    : availability.isOutOfStock
      ? "az-status-danger"
      : availability.isLowStock
        ? "az-status-warning"
        : "az-status-success";

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
  const handleImageError = (url: string) => {
    setFailedImageUrls((prev) => new Set(prev).add(url));
  };
  const handleImageLoad = (url: string) => {
    setLoadedImageUrls((prev) => new Set(prev).add(url));
  };

  return (
    <div>
      {backLink}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:items-start">
        <div className="space-y-3">
          <div className="border-border/50 bg-product-media relative aspect-[4/5] overflow-hidden rounded-[var(--radius)] border">
            {visibleActiveImage ? (
              <>
                {imageLoading && (
                  <div
                    className="az-skeleton absolute inset-0 z-10"
                    aria-label="Loading product image"
                  />
                )}
                <Image
                  src={visibleActiveImage.url}
                  alt={product.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 52vw"
                  className="object-cover"
                  onLoad={() => handleImageLoad(visibleActiveImage.url)}
                  onError={() => handleImageError(visibleActiveImage.url)}
                  loading="eager"
                  preload
                />
              </>
            ) : (
              <div className="text-muted flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <ShoppingBag className="h-12 w-12" />
                <div>
                  <p className="text-foreground text-sm font-semibold">Image coming soon</p>
                  <p className="mt-1 text-xs">Product details are still available below.</p>
                </div>
              </div>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="hide-scrollbar grid auto-cols-[4.25rem] grid-flow-col gap-2 overflow-x-auto pb-1">
              {allImages.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setActiveImageSelection({ productId: product.id, index: i })}
                  className={`az-focus bg-product-media relative aspect-square overflow-hidden rounded-[var(--radius)] border-2 transition ${
                    i === activeImageIndex
                      ? "border-foreground"
                      : "border-border/50 hover:border-foreground/30"
                  }`}
                  aria-label={`Show image ${i + 1} of ${product.title}`}
                  aria-current={i === activeImageIndex ? "true" : undefined}
                >
                  {failedImageUrls.has(img.url) ? (
                    <span className="text-muted-light flex h-full items-center justify-center">
                      <ShoppingBag className="h-4 w-4" />
                    </span>
                  ) : (
                    <Image
                      src={img.url}
                      alt={`${product.title} thumbnail ${i + 1}`}
                      fill
                      sizes="68px"
                      className="object-cover"
                      onError={() => handleImageError(img.url)}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="az-surface space-y-5 p-4 sm:p-6 lg:sticky lg:top-24">
          <div className="flex items-start justify-between gap-4">
            <div>
              {(categoryName || brand) && (
                <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                  {[categoryName, brand].filter(Boolean).join(" / ")}
                </p>
              )}
              <h2 className="text-foreground mt-1 text-2xl leading-tight font-bold sm:text-3xl">
                {product.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleWishlistToggle}
              disabled={wishlistMutation.isPending}
              className={`az-icon-button az-focus bg-card flex h-11 min-h-11 w-11 min-w-11 shrink-0 rounded-full border disabled:opacity-50 ${
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

          <div className="space-y-1">
            <p className="text-foreground text-3xl font-bold">{price}</p>
            <p className={`text-sm font-semibold ${stockTone}`}>
              {maxedOut ? "Max quantity in cart" : availability.label}
            </p>
            {remainingStock > 0 && availability.canPurchase && (
              <p className="text-muted text-xs">
                {remainingStock} available for this order
                {cartQtyForVariant > 0 ? ` after ${cartQtyForVariant} in cart` : ""}
              </p>
            )}
          </div>

          <p className="text-muted text-sm leading-relaxed">{overview}</p>

          {(product.options ?? []).map((option) => (
            <div key={option.id} className="space-y-2">
              <p className="text-foreground text-sm font-semibold">{option.title}</p>
              <div className="flex flex-wrap gap-2">
                {option.values.map((val) => (
                  <button
                    key={val.id}
                    type="button"
                    onClick={() =>
                      setSelectedOptions((prev) => ({ ...prev, [option.id]: val.value }))
                    }
                    className={`az-focus rounded-[var(--radius)] border px-4 py-2.5 text-sm font-semibold transition ${
                      effectiveOptions[option.id] === val.value
                        ? "border-foreground bg-foreground/[0.06] text-foreground"
                        : "border-border/50 text-foreground hover:bg-foreground/[0.04]"
                    }`}
                  >
                    {val.value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="border-border/50 bg-card flex w-max items-center rounded-[var(--radius)] border">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity(Math.max(1, safeQuantity - 1))}
                className="az-focus text-muted hover:text-foreground flex h-11 w-11 items-center justify-center rounded-l-[var(--radius)] transition"
                disabled={!availability.canPurchase || maxedOut}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="flex h-11 w-10 items-center justify-center text-sm font-semibold">
                {safeQuantity}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity(Math.min(Math.max(remainingStock, 1), safeQuantity + 1))}
                className="az-focus text-muted hover:text-foreground flex h-11 w-11 items-center justify-center rounded-r-[var(--radius)] transition"
                disabled={!availability.canPurchase || maxedOut || safeQuantity >= remainingStock}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={
                cartMutation.isPending ||
                !selectedVariant ||
                !availability.canPurchase ||
                justAdded ||
                maxedOut
              }
              className={`az-focus flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius)] px-6 py-3 text-sm font-bold text-white transition-all duration-300 disabled:opacity-50 ${
                justAdded
                  ? "bg-success"
                  : maxedOut
                    ? "bg-muted cursor-default"
                    : "bg-foreground hover:bg-foreground/85"
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

          {cartMutation.isError && (
            <p className="text-danger text-sm font-medium">
              Failed to add to cart. Please try again.
            </p>
          )}
        </div>
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-6">
          <div className="border-border/70 border-b pb-5">
            <h3 className="text-foreground text-base font-bold">Overview</h3>
            <p className="text-muted mt-2 text-sm leading-relaxed">{overview}</p>
          </div>

          <div className="border-border/70 border-b pb-5">
            <h3 className="text-foreground text-base font-bold">Essentials</h3>
            <ul className="text-muted mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {(essentials.length > 0
                ? essentials
                : ["Selected by Azani for everyday baby care", "Details confirmed before dispatch"]
              ).map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="text-success mt-0.5 h-4 w-4 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
              {featureNotes.map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="text-success mt-0.5 h-4 w-4 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-foreground text-base font-bold">Care & use</h3>
            <ul className="text-muted mt-3 grid gap-2 text-sm">
              {detailCareNotes.map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="text-trust mt-0.5 h-4 w-4 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="space-y-4">
          {[
            {
              title: "Safe product checks",
              body: "We check product condition and packaging before dispatch.",
              icon: ShieldCheck,
            },
            {
              title: "Delivery & returns",
              body: "Delivery options are confirmed at checkout, with help available for order issues.",
              icon: Truck,
            },
            {
              title: "M-Pesa ready",
              body: "Pay through the checkout flow and keep your confirmation details with the order.",
              icon: Smartphone,
            },
            {
              title: "WhatsApp assistance",
              body: "Ask for sizing, stock, or delivery help before you buy.",
              icon: MessageCircle,
            },
          ].map(({ title, body, icon: Icon }) => (
            <div key={title} className="border-border/70 flex gap-3 border-b pb-4 last:border-b-0">
              <span className="bg-trust-light text-trust flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)]">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-foreground text-sm font-bold">{title}</h3>
                <p className="text-muted mt-1 text-sm leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </aside>
      </section>
    </div>
  );
}
