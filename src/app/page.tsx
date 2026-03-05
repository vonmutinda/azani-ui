"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Baby, Heart, ShieldCheck, Truck } from "lucide-react";
import { getProducts, getCategories } from "@/lib/medusa-api";
import { ProductCard } from "@/components/product-card";
import { CategoryIcon } from "@/components/category-icon";
import { toKokobCategory, TOP_LEVEL_HANDLES } from "@/lib/categories";

export default function Home() {
  const featuredQuery = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => getProducts({ limit: 8 }),
  });

  const newQuery = useQuery({
    queryKey: ["products", "new"],
    queryFn: () => getProducts({ limit: 4, order: "-created_at" }),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories-home"],
    queryFn: () => getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const topCategories = (categoriesQuery.data?.product_categories ?? [])
    .filter((c) => !c.parent_category_id && TOP_LEVEL_HANDLES.includes(c.handle))
    .map(toKokobCategory);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-light via-white to-secondary-light">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-secondary/5 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center gap-8 px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur">
            <Baby className="h-3.5 w-3.5" />
            Trusted by 10,000+ parents
          </div>

          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Everything Your <span className="text-primary">Little One</span> Needs
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            From newborn essentials to toddler adventures — discover curated, quality products for every stage of your baby&apos;s journey.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary-hover hover:shadow-lg"
            >
              Shop Now <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/products?category=clothing"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              New Arrivals
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-6 text-xs text-muted">
            <div className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-secondary" /> Free shipping over Br500</div>
            <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-accent-green" /> Safe & certified products</div>
            <div className="flex items-center gap-1.5"><Heart className="h-4 w-4 text-primary" /> Curated with love</div>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Shop by Category</h2>
            <p className="mt-1 text-sm text-muted">Find exactly what you need</p>
          </div>
          <Link href="/products" className="hidden text-sm font-medium text-primary hover:underline sm:inline">
            View all categories <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {topCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary transition group-hover:bg-primary group-hover:text-white">
                <CategoryIcon icon={cat.icon} size={26} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                {cat.description && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">{cat.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Featured Products</h2>
            <p className="mt-1 text-sm text-muted">Handpicked favorites from our catalog</p>
          </div>
          <Link href="/products" className="hidden text-sm font-medium text-primary hover:underline sm:inline">
            View all <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
          </Link>
        </div>

        {featuredQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-border/40" />
            ))}
          </div>
        ) : featuredQuery.isError ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm font-medium text-foreground">Something went wrong</p>
            <p className="mt-1 text-xs text-muted">We couldn&apos;t load products right now. Please try again later.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredQuery.data?.products?.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>

      {/* Banners */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col justify-center gap-4 rounded-2xl bg-secondary-light p-8 sm:p-10">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">New Collection</span>
            <h3 className="text-xl font-bold text-foreground sm:text-2xl">Adorable Baby Clothing</h3>
            <p className="text-sm text-muted">From receiving sets to party dresses — find cute outfits for every occasion.</p>
            <Link href="/products?category=clothing" className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90">
              Shop Clothing <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex flex-col justify-center gap-4 rounded-2xl bg-accent-yellow-light p-8 sm:p-10">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-yellow">Must-Haves</span>
            <h3 className="text-xl font-bold text-foreground sm:text-2xl">Feeding Essentials</h3>
            <p className="text-sm text-muted">Bottles, pumps, weaning supplies and nutritious baby foods all in one place.</p>
            <Link href="/products?category=feeding" className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-yellow px-5 py-2 text-sm font-semibold text-foreground transition hover:opacity-90">
              Shop Feeding <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      {newQuery.data?.products && newQuery.data.products.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">New Arrivals</h2>
              <p className="mt-1 text-sm text-muted">Freshly added to our collection</p>
            </div>
            <Link href="/products?order=-created_at" className="hidden text-sm font-medium text-primary hover:underline sm:inline">
              View all <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {newQuery.data.products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      )}

      {/* Features bar */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            { icon: Truck, title: "Free Shipping", desc: "On orders over Br500" },
            { icon: ShieldCheck, title: "Safe Products", desc: "Certified & tested" },
            { icon: Heart, title: "Curated Selection", desc: "Handpicked quality" },
            { icon: Baby, title: "Expert Support", desc: "Parenting advice" },
          ].map((feat) => (
            <div key={feat.title} className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                <feat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{feat.title}</p>
                <p className="text-xs text-muted">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
