"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  Baby,
  ShieldCheck,
  Shirt,
  Smartphone,
  Sparkles,
  Star,
  Truck,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { getProducts, getCategories } from "@/lib/medusa-api";
import { ProductCard } from "@/components/product-card";
import { CategoryIcon } from "@/components/category-icon";
import { resolveProductImage, getProductPrice } from "@/lib/formatters";
import { toCategory, TOP_LEVEL_HANDLES } from "@/lib/categories";
import { freeShippingThresholdLabel } from "@/lib/shipping";

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
    .map(toCategory);

  const featuredProduct = featuredQuery.data?.products?.[0];
  const heroProduct = featuredProduct
    ? {
        id: featuredProduct.id,
        title: featuredProduct.title,
        image: resolveProductImage(featuredProduct),
        price: getProductPrice(featuredProduct)?.formatted,
      }
    : null;

  return (
    <div>
      {/* ── Hero ── */}
      <section className="bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:flex-row lg:gap-12 lg:px-8 lg:py-16">
          {/* Left — copy (leads on mobile) */}
          <div className="hero-fade-in flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
            <div className="text-primary bg-primary/[0.06] mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold">
              <Star className="h-3.5 w-3.5" fill="currentColor" />
              Trusted by 10,000+ parents
            </div>

            <h1 className="font-heading text-foreground max-w-xl text-[clamp(2.25rem,6vw,4rem)] leading-[1.08] font-extrabold tracking-tight">
              Everything Your{" "}
              <span className="text-primary relative">
                Little One
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  viewBox="0 0 200 8"
                  fill="none"
                  aria-hidden="true"
                >
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
                className="bg-primary hover:bg-primary-hover focus-visible:ring-primary/30 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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

            {/* Trust row — carries the visual's chips on mobile (chips are desktop-only) */}
            <div className="text-muted mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium sm:hidden">
              <span className="flex items-center gap-1.5">
                <Truck className="text-secondary h-3.5 w-3.5" /> Free delivery over{" "}
                {freeShippingThresholdLabel()}
              </span>
              <span className="flex items-center gap-1.5">
                <Smartphone className="text-success-ink h-3.5 w-3.5" /> Pay with M-Pesa
              </span>
            </div>
          </div>

          {/* Right — hero visual: brand gradient + featured product + floating chips.
              Robust by design — the gradient and chips render even if the product
              image is slow or unavailable. */}
          <div className="hero-fade-in-delay flex w-full max-w-[440px] flex-1 items-center justify-center">
            <div className="relative aspect-square w-full">
              <div
                aria-hidden="true"
                className="from-primary-light via-secondary-light to-accent-yellow-light absolute inset-0 rounded-[2.5rem] bg-gradient-to-br"
              />
              <div
                aria-hidden="true"
                className="bg-primary/15 absolute top-8 -left-4 h-28 w-28 rounded-full blur-2xl"
              />
              <div
                aria-hidden="true"
                className="bg-secondary/15 absolute -right-4 bottom-10 h-32 w-32 rounded-full blur-2xl"
              />

              <div className="absolute inset-0 flex items-center justify-center p-7 sm:p-10">
                {featuredQuery.isLoading ? (
                  <div className="bg-card/70 h-full w-full animate-pulse rounded-3xl" />
                ) : (
                  <Link
                    href={heroProduct ? `/products/${heroProduct.id}` : "/products"}
                    className="group bg-card focus-visible:ring-primary/30 flex h-full w-full flex-col overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/5 transition hover:shadow-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <div className="bg-background relative flex flex-1 items-center justify-center overflow-hidden">
                      {heroProduct?.image ? (
                        <Image
                          src={heroProduct.image}
                          alt={heroProduct.title}
                          fill
                          sizes="(max-width: 1024px) 80vw, 420px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          priority
                        />
                      ) : (
                        <div className="text-muted-light flex flex-col items-center gap-2">
                          <Baby className="h-12 w-12" />
                          <span className="text-xs font-medium">Featured pick</span>
                        </div>
                      )}
                    </div>
                    {heroProduct && (
                      <div className="flex items-center justify-between gap-2 px-4 py-3">
                        <span className="text-foreground line-clamp-1 text-sm font-semibold">
                          {heroProduct.title}
                        </span>
                        {heroProduct.price && (
                          <span className="text-primary shrink-0 text-sm font-bold">
                            {heroProduct.price}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                )}
              </div>

              {/* Floating chips — desktop accent, hidden on mobile (the trust row covers it) */}
              <div className="border-border/50 bg-card absolute top-6 -left-3 hidden items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-md sm:flex">
                <Truck className="text-secondary h-3.5 w-3.5" />
                <span className="text-foreground">Free delivery over {freeShippingThresholdLabel()}</span>
              </div>
              <div className="border-border/50 bg-card absolute top-1/2 -right-3 hidden -translate-y-1/2 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-md sm:flex">
                <Smartphone className="text-success-ink h-3.5 w-3.5" />
                <span className="text-foreground">Pay with M-Pesa</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Shop by Category ── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-foreground text-2xl font-bold sm:text-3xl">Shop by Category</h2>
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
              className="group bg-card hover:bg-foreground/[0.03] flex min-w-[110px] flex-shrink-0 flex-col items-center gap-3 rounded-2xl p-5 text-center transition sm:min-w-[130px] lg:min-w-0"
            >
              <div className="bg-background flex h-16 w-16 items-center justify-center rounded-2xl transition group-hover:scale-110">
                <CategoryIcon icon={cat.icon} size={28} colored />
              </div>
              <p className="text-foreground text-sm font-semibold">{cat.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Explore Our Collection (tabbed) ── */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-foreground text-2xl font-bold sm:text-3xl">
                Explore Our Collection
              </h2>
              <div className="mt-3 flex gap-1" role="tablist">
                {(
                  [
                    ["featured", "Featured"],
                    ["new", "New Arrivals"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={productTab === key}
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
                <div className="border-border/50 bg-card rounded-2xl border p-8 text-center">
                  <p className="text-foreground text-sm font-medium">Something went wrong</p>
                  <p className="text-muted mt-1 text-sm">
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
      <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="group bg-secondary-light relative overflow-hidden rounded-2xl p-6 sm:p-8">
            <Shirt className="text-secondary/[0.08] absolute -right-4 -bottom-4 h-36 w-36 rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" />
            <div className="bg-secondary/[0.06] absolute top-8 right-8 h-24 w-24 rounded-full" />
            <div className="relative flex flex-col gap-4">
              <span className="text-secondary text-sm font-semibold">New Collection</span>
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

          <div className="group bg-accent-yellow-light relative overflow-hidden rounded-2xl p-6 sm:p-8">
            <UtensilsCrossed className="text-accent-yellow/[0.12] absolute -right-4 -bottom-4 h-36 w-36 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
            <div className="bg-accent-yellow/[0.08] absolute top-6 right-10 h-20 w-20 rounded-full" />
            <div className="relative flex flex-col gap-4">
              <span className="text-accent-yellow-ink text-sm font-semibold">Must-Haves</span>
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
      <section className="border-border/50 border-t">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            {
              icon: Truck,
              title: "Free Shipping",
              desc: `On orders over ${freeShippingThresholdLabel()}`,
              color: "text-secondary",
            },
            {
              icon: Zap,
              title: "Same-Day Express",
              desc: "KSh500 express delivery",
              color: "text-accent-yellow-ink",
            },
            {
              icon: ShieldCheck,
              title: "Safe Products",
              desc: "Certified & tested",
              color: "text-success-ink",
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
                <p className="text-muted text-sm">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
