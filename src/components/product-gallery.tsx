"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { useState } from "react";

type GalleryImage = { url: string };

/** Thumbnail first, then the rest, dropping falsy and duplicate URLs. */
function uniqueImages(thumbnail?: string | null, images: GalleryImage[] = []): GalleryImage[] {
  const seen = new Set<string>();
  const result: GalleryImage[] = [];
  for (const image of [thumbnail ? { url: thumbnail } : null, ...images]) {
    if (!image?.url || seen.has(image.url)) continue;
    seen.add(image.url);
    result.push(image);
  }
  return result;
}

type Props = {
  thumbnail?: string | null;
  images?: GalleryImage[];
  title: string;
};

/**
 * Product image gallery: a vertical thumbnail rail beside a large object-contain
 * stage on desktop, collapsing to a strip below the stage on mobile. Includes
 * wrap-around prev/next, an N/M counter, and per-image load/error states.
 *
 * Stateless across products — render with `key={product.id}` to reset on change.
 */
export function ProductGallery({ thumbnail, images = [], title }: Props) {
  const allImages = uniqueImages(thumbnail, images);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set());
  const [failed, setFailed] = useState<Set<string>>(() => new Set());

  const hasMultiple = allImages.length > 1;
  const safeIndex = Math.min(activeIndex, Math.max(allImages.length - 1, 0));
  const active = allImages[safeIndex];

  const showImageAt = (index: number) => {
    if (allImages.length === 0) return;
    setActiveIndex(((index % allImages.length) + allImages.length) % allImages.length);
  };
  const markLoaded = (url: string) => setLoaded((prev) => new Set(prev).add(url));
  const markFailed = (url: string) => setFailed((prev) => new Set(prev).add(url));

  const activeFailed = active ? failed.has(active.url) : true;
  const activeLoading = !!active && !activeFailed && !loaded.has(active.url);

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      {hasMultiple && (
        <div className="hide-scrollbar order-2 flex gap-2 overflow-x-auto pb-1 lg:order-1 lg:max-h-[460px] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0">
          {allImages.map((image, i) => (
            <button
              key={image.url}
              type="button"
              onClick={() => showImageAt(i)}
              aria-label={`Show image ${i + 1} of ${title}`}
              aria-current={i === safeIndex ? "true" : undefined}
              className={`bg-background focus-visible:ring-primary/30 relative aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                i === safeIndex ? "border-foreground" : "border-border/50 hover:border-foreground/30"
              }`}
            >
              {failed.has(image.url) ? (
                <span className="text-muted-light flex h-full items-center justify-center">
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                </span>
              ) : (
                <Image
                  src={image.url}
                  alt={`${title} thumbnail ${i + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                  onError={() => markFailed(image.url)}
                />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="order-1 flex-1 lg:order-2">
        <div className="border-border/50 bg-background relative aspect-square overflow-hidden rounded-2xl border">
          {active && !activeFailed ? (
            <>
              {activeLoading && (
                <div className="bg-border/40 absolute inset-0 z-10 animate-pulse" aria-hidden="true" />
              )}
              <Image
                src={active.url}
                alt={title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-4 sm:p-6"
                priority
                onLoad={() => markLoaded(active.url)}
                onError={() => markFailed(active.url)}
              />
            </>
          ) : (
            <div className="text-muted flex h-full flex-col items-center justify-center gap-2 text-center">
              <ShoppingBag className="h-16 w-16" aria-hidden="true" />
              <p className="text-sm font-medium">Image coming soon</p>
            </div>
          )}

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={() => showImageAt(safeIndex - 1)}
                aria-label="Show previous image"
                className="border-border/60 bg-card/90 text-foreground hover:bg-card focus-visible:ring-primary/30 absolute top-1/2 left-3 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm backdrop-blur transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => showImageAt(safeIndex + 1)}
                aria-label="Show next image"
                className="border-border/60 bg-card/90 text-foreground hover:bg-card focus-visible:ring-primary/30 absolute top-1/2 right-3 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm backdrop-blur transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="text-foreground border-border/60 bg-card/90 absolute right-3 bottom-3 z-20 rounded-full border px-3 py-1 text-xs font-bold shadow-sm backdrop-blur">
                {safeIndex + 1} / {allImages.length}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
