"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessageCircleQuestion, Truck } from "lucide-react";
import { getProducts, getCategories } from "@/lib/medusa-api";
import { ProductCard } from "@/components/product-card";
import { CategoryIcon } from "@/components/category-icon";
import { toCategory, TOP_LEVEL_HANDLES } from "@/lib/categories";

const ageGroups = [
  { age: "2-4", label: "2–4 years", description: "Little explorers", color: "bg-primary-light" },
  {
    age: "5-8",
    label: "5–8 years",
    description: "Everyday adventurers",
    color: "bg-secondary-light",
  },
  {
    age: "9-12",
    label: "9–12 years",
    description: "Growing personalities",
    color: "bg-accent-yellow-light",
  },
];
const tileColors = ["bg-primary-light", "bg-accent-yellow-light", "bg-secondary-light"];

export default function Home() {
  const [failedArtwork, setFailedArtwork] = useState<Record<string, string>>({});
  const productsQuery = useQuery({
    queryKey: ["products", "new"],
    queryFn: () => getProducts({ limit: 8, sort: "newest" }),
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories-home"],
    queryFn: () => getCategories(),
    staleTime: 5 * 60 * 1000,
  });
  const products = productsQuery.data?.products ?? [];
  const categories = (categoriesQuery.data?.product_categories ?? [])
    .filter(
      (category) =>
        TOP_LEVEL_HANDLES.includes(category.handle) &&
        (!category.parent_category_id ||
          (category.handle === "bottoms" && category.parent_category?.handle === "clothing")),
    )
    .map(toCategory);

  return (
    <div>
      <section className="bg-secondary-light overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-3 px-4 py-5 sm:gap-6 sm:px-6 sm:py-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12 lg:px-8">
          <div className="hero-fade-in">
            <p className="text-secondary mb-3 hidden text-xs font-bold tracking-[0.12em] uppercase sm:block">
              Kids clothing · Ages 2–12
            </p>
            <h1 className="text-foreground max-w-lg text-[2.5rem] leading-[1.06] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Little clothes. <br />
              <span className="text-primary">Big adventures.</span>
            </h1>
            <p className="text-muted mt-3 max-w-sm text-sm leading-relaxed sm:text-base">
              Everyday favourites for play days, party days and everything in between.
            </p>
            <Link
              href="/products"
              className="bg-primary hover:bg-primary-hover mt-5 inline-flex min-h-11 items-center gap-3 rounded-full px-6 py-3 text-sm font-semibold text-white transition"
            >
              Shop Now <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="text-foreground mt-1 flex gap-5 text-sm font-medium">
              <Link
                href="/products?audience=girls"
                className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
              >
                Shop Girls
              </Link>
              <Link
                href="/products?audience=boys"
                className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
              >
                Shop Boys
              </Link>
            </div>
          </div>
          <div className="hero-fade-in-delay relative w-full">
            <div className="relative aspect-[3/2] overflow-hidden rounded-[20px] bg-[#f6f3eb]">
              <Image
                src="/images/azani-campaign-v1.webp"
                alt="Two children walking together in colourful everyday clothing"
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 650px"
                className="object-cover"
              />
            </div>
            <span className="bg-accent-yellow-light font-heading absolute right-3 bottom-3 -rotate-3 rounded-lg px-3 py-2 text-sm font-extrabold sm:text-base">
              Made for their world.
            </span>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="age-heading"
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      >
        <div className="mb-4 text-center sm:mb-6">
          <h2 id="age-heading" className="text-2xl font-extrabold sm:text-3xl">
            Find their next favourite
          </h2>
          <p className="text-muted mt-2 text-sm">Pick an age. Then choose their size.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {ageGroups.map(({ age, label, description, color }) => (
            <Link
              key={age}
              href={`/products?age=${age}`}
              className={`${color} group flex items-center justify-between gap-2 rounded-xl px-3 py-4 transition hover:brightness-95 sm:px-6 sm:py-5`}
            >
              <div>
                <p className="font-heading text-base font-extrabold sm:text-2xl">{label}</p>
                <p className="text-muted mt-1 hidden text-sm sm:block">{description}</p>
              </div>
              <ArrowRight className="hidden h-5 w-5 shrink-0 transition group-hover:translate-x-1 sm:block" />
            </Link>
          ))}
        </div>
      </section>

      {categories.length > 0 && (
        <section
          aria-labelledby="category-heading"
          className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8"
        >
          <h2 id="category-heading" className="mb-6 text-3xl font-extrabold">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {categories.map((category, index) => {
              const image =
                failedArtwork[category.slug] !== category.homeImageUrl
                  ? category.homeImageUrl
                  : undefined;
              return (
                <Link
                  key={category.slug}
                  href={`/products?category=${category.slug}`}
                  className={`${tileColors[index % tileColors.length]} group overflow-hidden rounded-xl`}
                >
                  <div className={`relative aspect-[4/3] ${image ? "bg-[#f6f3eb]" : ""}`}>
                    {image ? (
                      <Image
                        src={image}
                        onError={() =>
                          setFailedArtwork((current) => ({ ...current, [category.slug]: image }))
                        }
                        alt=""
                        fill
                        sizes="(max-width: 1023px) 45vw, 300px"
                        className="object-contain p-3 transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <CategoryIcon icon={category.icon} size={64} colored />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 px-4 pt-2 pb-5 sm:px-6">
                    <h3 className="font-heading flex items-center gap-2 text-base font-bold sm:text-xl">
                      {image && <CategoryIcon icon={category.icon} size={32} />}
                      {category.name}
                    </h3>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section
        aria-labelledby="arrivals-heading"
        className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8"
      >
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-primary mb-2 text-xs font-bold tracking-widest uppercase">
              Fresh finds
            </p>
            <h2 id="arrivals-heading" className="text-3xl font-extrabold">
              New arrivals
            </h2>
          </div>
          <Link
            href="/products?sort=newest"
            className="text-secondary flex shrink-0 items-center gap-2 text-sm font-semibold hover:underline"
          >
            All new in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {productsQuery.isLoading ? (
          <div aria-label="Loading clothing" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="bg-secondary-light aspect-[3/4] animate-pulse rounded-2xl"
              />
            ))}
          </div>
        ) : productsQuery.isError ? (
          <div className="bg-secondary-light rounded-2xl p-8 text-center">
            <p>We couldn&apos;t load products right now.</p>
            <button
              onClick={() => productsQuery.refetch()}
              className="text-primary mt-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        ) : products.length ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="bg-secondary-light rounded-2xl p-8 text-center text-sm">
            No clothing is available right now. Please check back soon.
          </p>
        )}
      </section>

      <section className="bg-accent-yellow-light">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 sm:grid-cols-2 lg:px-8">
          <div className="flex items-start gap-4">
            <Truck className="mt-1 h-6 w-6 shrink-0" />
            <div>
              <h2 className="text-lg font-bold">A little closer to your doorstep</h2>
              <p className="text-muted mt-1 text-sm">See delivery options and costs at checkout.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <MessageCircleQuestion className="mt-1 h-6 w-6 shrink-0" />
            <div>
              <h2 className="text-lg font-bold">Room to grow. A fit for today.</h2>
              <p className="text-muted mt-1 text-sm">
                Check the size guide on each product before choosing.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
