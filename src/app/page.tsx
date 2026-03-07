"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  Baby,
  ChevronLeft,
  ChevronRight,
  Package,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  Truck,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { getProducts, getCategories } from "@/lib/medusa-api";
import { ProductCard } from "@/components/product-card";
import { CategoryIcon } from "@/components/category-icon";
import { resolveProductImage, getProductPrice } from "@/lib/formatters";
import { toKokobCategory, TOP_LEVEL_HANDLES } from "@/lib/categories";

const FREE_SHIPPING_THRESHOLD = 5_000;

const CAROUSEL_INTERVAL = 5000;

function HeroCarousel({
  products,
}: {
  products: { id: string; title: string; image?: string; price?: string }[];
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = products.length;

  const go = useCallback(
    (idx: number) => {
      setActive(((idx % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = setInterval(() => setActive((i) => (i + 1) % count), CAROUSEL_INTERVAL);
    return () => clearInterval(id);
  }, [paused, count]);

  if (count === 0) return null;

  const prev = (active - 1 + count) % count;
  const next = (active + 1) % count;

  const cards = [
    { idx: prev, position: "left" as const },
    { idx: active, position: "center" as const },
    { idx: next, position: "right" as const },
  ];

  const positionStyles = {
    left: "left-0 top-1/2 -translate-y-1/2 z-0 h-[65%] w-[38%] opacity-60 blur-[0.5px] scale-90",
    center: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-full w-[52%]",
    right: "right-0 top-1/2 -translate-y-1/2 z-0 h-[65%] w-[38%] opacity-60 blur-[0.5px] scale-90",
  };

  return (
    <div
      className="relative w-full max-w-[460px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[260px] w-full sm:h-[340px] lg:h-[420px]">
        {cards.map(({ idx, position }) => {
          const p = products[idx];
          return (
            <Link
              key={`${idx}-${position}`}
              href={`/products/${p.id}`}
              tabIndex={position === "center" ? 0 : -1}
              aria-hidden={position !== "center"}
              className={`border-border bg-card absolute overflow-hidden rounded-2xl border shadow-lg transition-all duration-500 ease-out ${positionStyles[position]}`}
              onClick={(e) => {
                if (position === "left") {
                  e.preventDefault();
                  go(active - 1);
                }
                if (position === "right") {
                  e.preventDefault();
                  go(active + 1);
                }
              }}
            >
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt={p.title} className="h-full w-full object-contain p-2" />
              ) : (
                <div className="bg-secondary-light text-secondary flex h-full items-center justify-center">
                  <Package className="h-12 w-12" />
                </div>
              )}
              {position === "center" && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-4 pt-10 pb-4">
                  <p className="truncate text-sm font-semibold text-white drop-shadow-sm">
                    {p.title}
                  </p>
                  {p.price && (
                    <p className="text-lg font-bold text-white drop-shadow-sm">{p.price}</p>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => go(active - 1)}
            className="border-border text-muted hover:border-primary hover:text-primary focus-visible:ring-primary/30 flex h-10 w-10 items-center justify-center rounded-full border bg-white shadow-sm transition focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Previous product"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {products.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to product ${i + 1}`}
                className={`focus-visible:ring-primary/30 h-2 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none ${i === active ? "bg-primary w-6" : "bg-border hover:bg-muted-light w-2"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(active + 1)}
            className="border-border text-muted hover:border-primary hover:text-primary focus-visible:ring-primary/30 flex h-10 w-10 items-center justify-center rounded-full border bg-white shadow-sm transition focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Next product"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [productTab, setProductTab] = useState<"featured" | "new">("featured");

  const featuredQuery = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => getProducts({ limit: 8 }),
  });

  const newQuery = useQuery({
    queryKey: ["products", "new"],
    queryFn: () => getProducts({ limit: 8, order: "-created_at" }),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories-home"],
    queryFn: () => getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const topCategories = (categoriesQuery.data?.product_categories ?? [])
    .filter((c) => !c.parent_category_id && TOP_LEVEL_HANDLES.includes(c.handle))
    .map(toKokobCategory);

  const heroProducts = (featuredQuery.data?.products ?? []).slice(0, 8).map((p) => ({
    id: p.id,
    title: p.title,
    image: resolveProductImage(p),
    price: getProductPrice(p)?.formatted,
  }));

  return (
    <div>
      {/* ── Hero ── */}
      <section className="bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col-reverse items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:flex-row lg:gap-12 lg:px-8 lg:py-14">
          {/* Left — copy */}
          <div className="hero-fade-in flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
            <div className="border-primary/15 text-primary mb-5 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-xs font-semibold shadow-sm">
              <Star className="h-3.5 w-3.5" fill="currentColor" />
              Trusted by 10,000+ parents
            </div>

            <h1 className="font-heading text-foreground max-w-xl text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Everything Your{" "}
              <span className="text-primary relative">
                Little One
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                  <path
                    d="M2 6c40-4 80-4 196 0"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.3"
                  />
                </svg>
              </span>{" "}
              Needs
            </h1>

            <p className="text-muted mt-5 max-w-lg text-base leading-relaxed sm:text-lg">
              From newborn essentials to toddler adventures — discover curated, quality products for
              every stage of your baby&apos;s journey.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                href="/products"
                className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Shop Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/products?order=-created_at"
                className="bg-secondary hover:bg-secondary-hover focus-visible:ring-secondary/30 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <Sparkles className="h-4 w-4" />
                New Arrivals
              </Link>
            </div>
          </div>

          {/* Right — product carousel */}
          <div className="hero-fade-in-delay flex flex-1 items-center justify-center">
            {featuredQuery.isLoading ? (
              <div className="relative h-[260px] w-full max-w-[460px] sm:h-[340px] lg:h-[420px]">
                <div className="bg-border/40 absolute top-1/2 left-1/2 h-full w-[52%] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-2xl" />
                <div className="bg-border/20 absolute top-1/2 left-0 h-[65%] w-[38%] -translate-y-1/2 animate-pulse rounded-2xl" />
                <div className="bg-border/20 absolute top-1/2 right-0 h-[65%] w-[38%] -translate-y-1/2 animate-pulse rounded-2xl" />
              </div>
            ) : (
              <HeroCarousel products={heroProducts} />
            )}
          </div>
        </div>
      </section>

      {/* ── Shop by Category ── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-foreground text-xl font-bold sm:text-2xl">Shop by Category</h2>
            <p className="text-muted mt-1 text-sm">Find exactly what you need</p>
          </div>
          <Link href="/products" className="text-secondary text-sm font-medium hover:underline">
            View all <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-7 lg:overflow-visible lg:pb-0">
          {topCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className="group border-border bg-card flex min-w-[110px] flex-shrink-0 flex-col items-center gap-3 rounded-2xl border p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:min-w-[130px] lg:min-w-0"
            >
              <div className="bg-background flex h-16 w-16 items-center justify-center rounded-2xl transition group-hover:scale-110">
                <CategoryIcon icon={cat.icon} size={28} colored />
              </div>
              <p className="text-foreground text-[13px] font-semibold">{cat.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Explore Our Collection (tabbed) ── */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-foreground text-xl font-bold sm:text-2xl">
                Explore Our Collection
              </h2>
              <div className="mt-3 flex gap-1">
                {(
                  [
                    ["featured", "Featured"],
                    ["new", "New Arrivals"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setProductTab(key)}
                    className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      productTab === key
                        ? "bg-foreground text-white"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Link href="/products" className="text-secondary text-sm font-medium hover:underline">
              View all <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          </div>

          {(() => {
            const query = productTab === "featured" ? featuredQuery : newQuery;
            if (query.isLoading) {
              return (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <div className="bg-border/40 aspect-square animate-pulse rounded-2xl" />
                      <div className="bg-border/40 h-4 w-3/4 animate-pulse rounded" />
                      <div className="bg-border/40 h-4 w-1/2 animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              );
            }
            if (query.isError) {
              return (
                <div className="border-border bg-card rounded-2xl border p-8 text-center">
                  <p className="text-foreground text-sm font-medium">Something went wrong</p>
                  <p className="text-muted mt-1 text-xs">
                    We couldn&apos;t load products right now. Please try again later.
                  </p>
                </div>
              );
            }
            return (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {query.data?.products?.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── Promotional Banners ── */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="group border-border bg-secondary-light relative overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8">
            <Shirt className="text-secondary/[0.08] absolute -right-4 -bottom-4 h-36 w-36 rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" />
            <div className="bg-secondary/[0.06] absolute top-8 right-8 h-24 w-24 rounded-full" />
            <div className="relative flex flex-col gap-4">
              <span className="text-secondary text-xs font-bold tracking-wider uppercase">
                New Collection
              </span>
              <h3 className="text-foreground text-xl font-bold sm:text-2xl">
                Adorable Baby Clothing
              </h3>
              <p className="text-muted max-w-xs text-sm">
                From receiving sets to party dresses — find cute outfits for every occasion.
              </p>
              <Link
                href="/products?category=clothing"
                className="bg-secondary hover:bg-secondary-hover inline-flex w-fit items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition"
              >
                Shop Clothing <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="group border-border bg-accent-yellow-light relative overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8">
            <UtensilsCrossed className="text-accent-yellow/[0.12] absolute -right-4 -bottom-4 h-36 w-36 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
            <div className="bg-accent-yellow/[0.08] absolute top-6 right-10 h-20 w-20 rounded-full" />
            <div className="relative flex flex-col gap-4">
              <span className="text-accent-yellow text-xs font-bold tracking-wider uppercase">
                Must-Haves
              </span>
              <h3 className="text-foreground text-xl font-bold sm:text-2xl">Feeding Essentials</h3>
              <p className="text-muted max-w-xs text-sm">
                Bottles, pumps, weaning supplies and nutritious baby foods all in one place.
              </p>
              <Link
                href="/products?category=feeding"
                className="bg-accent-yellow text-foreground inline-flex w-fit items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90"
              >
                Shop Feeding <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust / Features Bar ── */}
      <section className="border-border border-t">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            {
              icon: Truck,
              title: "Free Shipping",
              desc: `On orders over Br${FREE_SHIPPING_THRESHOLD.toLocaleString()}`,
              color: "text-secondary",
            },
            {
              icon: Zap,
              title: "Same-Day Express",
              desc: "Br500 express delivery",
              color: "text-accent-yellow",
            },
            {
              icon: ShieldCheck,
              title: "Safe Products",
              desc: "Certified & tested",
              color: "text-accent-green",
            },
            {
              icon: Baby,
              title: "Expert Support",
              desc: "Parenting advice",
              color: "text-primary",
            },
          ].map((feat) => (
            <div key={feat.title} className="flex items-center gap-3">
              <feat.icon className={`h-6 w-6 shrink-0 ${feat.color}`} />
              <div>
                <p className="text-foreground text-sm font-semibold">{feat.title}</p>
                <p className="text-muted text-xs">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
