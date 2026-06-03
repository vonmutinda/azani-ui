"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState, Suspense } from "react";
import { getProducts, getCategories } from "@/lib/medusa-api";
import { ArrowLeft, ArrowUpDown, Search, ShoppingBag, Tag, X } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { ProductDetail } from "@/components/product-detail";
import { FilterSidebar } from "@/components/filter-sidebar";
import { buttonVariants } from "@/components/ui/button";
import { getProductPrice, getVariantAvailability } from "@/lib/formatters";
import {
  parseCategoryParam,
  serializeCategoryParam,
  resolveCategoryIds,
  findMedusaCategory,
} from "@/lib/categories";
import { matchesMetadataFacet } from "@/lib/product-metadata";

type Filters = Record<string, string | number | undefined>;

const SORT_OPTIONS = [
  { value: "featured", label: "Featured", order: undefined },
  { value: "newest", label: "Newest", order: "-created_at" },
  { value: "price_asc", label: "Price: Low to high", order: undefined },
  { value: "price_desc", label: "Price: High to low", order: undefined },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function isSortValue(value: string | null): value is SortValue {
  return SORT_OPTIONS.some((option) => option.value === value);
}

function getSortOrder(sort: SortValue) {
  return SORT_OPTIONS.find((option) => option.value === sort)?.order;
}

function matchesPriceBracket(amount: number, bracket: string): boolean {
  if (bracket === "u1000") return amount < 1000;
  if (bracket === "1000-5000") return amount >= 1000 && amount <= 5000;
  if (bracket === "o5000") return amount > 5000;
  return true;
}

function getPriceBracketLabel(bracket: string): string {
  if (bracket === "u1000") return "Under KSh1,000";
  if (bracket === "1000-5000") return "KSh1,000 - KSh5,000";
  if (bracket === "o5000") return "Over KSh5,000";
  return bracket;
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const filters: Filters = {
    category: searchParams.get("category") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    availability: searchParams.get("availability") ?? undefined,
    price: searchParams.get("price") ?? undefined,
    brand: searchParams.get("brand") ?? undefined,
    age_stage: searchParams.get("age_stage") ?? undefined,
  };
  const requestedSort = searchParams.get("sort");
  const sort: SortValue = isSortValue(requestedSort) ? requestedSort : "featured";

  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const categoriesQuery = useQuery({
    queryKey: ["categories-sidebar"],
    queryFn: () => getCategories(),
    staleTime: 5 * 60 * 1000,
  });
  const categoryTree = useMemo(
    () => categoriesQuery.data?.product_categories ?? [],
    [categoriesQuery.data],
  );

  // `category` is a comma-joined list of handles → server-side OR over the
  // union of each selected handle's subtree ids (resolved from the loaded tree).
  const categoryParam = filters.category ? String(filters.category) : undefined;
  const categoryHandles = useMemo(() => parseCategoryParam(categoryParam), [categoryParam]);
  const hasCategoryFilter = categoryHandles.length > 0;

  const categoryIds = useMemo(
    () => (hasCategoryFilter ? resolveCategoryIds(categoryTree, categoryHandles) : undefined),
    [hasCategoryFilter, categoryTree, categoryHandles],
  );

  const productsQuery = useQuery({
    queryKey: ["products", "list", { ...filters, sort, page, categoryIds }],
    queryFn: () => {
      // Selected categories that resolve to no ids yield no products — don't
      // fall back to fetching the whole catalogue.
      if (hasCategoryFilter && categoryIds && categoryIds.length === 0) {
        return Promise.resolve({ products: [], count: 0, offset, limit });
      }

      return getProducts({
        limit,
        offset,
        ...(categoryIds && categoryIds.length > 0 ? { category_id: categoryIds } : {}),
        ...(filters.q ? { q: String(filters.q) } : {}),
        ...(getSortOrder(sort) ? { order: getSortOrder(sort) } : {}),
      });
    },
    // Wait for the category tree before filtering so the ids resolve correctly.
    enabled: !hasCategoryFilter || categoriesQuery.isFetched || categoriesQuery.isError,
  });

  const products = useMemo(() => productsQuery.data?.products ?? [], [productsQuery.data]);
  // Medusa can't order by calculated price, so price sorts happen client-side
  // over the current page.
  const sortedProducts = useMemo(() => {
    const copy = [...products];
    if (sort === "price_asc") {
      return copy.sort(
        (a, b) =>
          (getProductPrice(a)?.amount ?? Number.MAX_SAFE_INTEGER) -
          (getProductPrice(b)?.amount ?? Number.MAX_SAFE_INTEGER),
      );
    }
    if (sort === "price_desc") {
      return copy.sort(
        (a, b) => (getProductPrice(b)?.amount ?? 0) - (getProductPrice(a)?.amount ?? 0),
      );
    }
    if (sort === "newest") {
      return copy.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return products;
  }, [products, sort]);

  // Availability, price, brand, and stage facets, applied client-side over the current page
  // (category/sort already narrow the server query; full server-side faceting
  // is the production follow-up).
  const inStockOnly = filters.availability === "in_stock";
  const priceBracket = filters.price ? String(filters.price) : undefined;
  const brandFilter = filters.brand ? String(filters.brand) : undefined;
  const ageStageFilter = filters.age_stage ? String(filters.age_stage) : undefined;
  const visibleProducts = useMemo(() => {
    if (!inStockOnly && !priceBracket && !brandFilter && !ageStageFilter) return sortedProducts;
    return sortedProducts.filter((product) => {
      if (inStockOnly && !(product.variants ?? []).some((v) => getVariantAvailability(v).inStock)) {
        return false;
      }
      if (priceBracket) {
        const amount = getProductPrice(product)?.amount;
        if (amount == null || !matchesPriceBracket(amount, priceBracket)) return false;
      }
      if (!matchesMetadataFacet(product, "brand", brandFilter)) return false;
      if (!matchesMetadataFacet(product, "age_stage", ageStageFilter)) return false;
      return true;
    });
  }, [sortedProducts, inStockOnly, priceBracket, brandFilter, ageStageFilter]);
  const hasClientFacets = inStockOnly || !!priceBracket || !!brandFilter || !!ageStageFilter;

  const total = productsQuery.data?.count ?? 0;
  const shownCount = hasClientFacets ? visibleProducts.length : total;
  const totalPages = Math.ceil(total / limit);

  const updateQuery = useCallback(
    (newFilters: Filters) => {
      const params = new URLSearchParams();
      const nextFilters: Filters = {
        category: filters.category,
        q: filters.q,
        availability: filters.availability,
        price: filters.price,
        brand: filters.brand,
        age_stage: filters.age_stage,
        sort,
        ...newFilters,
      };
      for (const [key, value] of Object.entries(nextFilters)) {
        if (value !== undefined && value !== "") {
          params.set(key, String(value));
        }
      }
      // A new query always returns to page 1, and "featured" is the default (omit it).
      params.delete("page");
      if (params.get("sort") === "featured") params.delete("sort");
      const query = params.toString();
      router.push(query ? `/products?${query}` : "/products");
    },
    [
      filters.category,
      filters.q,
      filters.availability,
      filters.price,
      filters.brand,
      filters.age_stage,
      router,
      sort,
    ],
  );

  const isLoading = productsQuery.isLoading || (hasCategoryFilter && categoriesQuery.isLoading);

  const selectedProduct = selectedProductId
    ? products.find((p) => p.id === selectedProductId)
    : null;

  const activeFilterCount =
    categoryHandles.length +
    Object.entries(filters).filter(([key, value]) => {
      if (key === "category") return false;
      return value !== undefined && value !== "";
    }).length;

  // When exactly one category is selected we still show its name/description and
  // its children (the drill-in chips); multiple selections fall back to generic.
  const singleCategory =
    categoryHandles.length === 1 ? findMedusaCategory(categoryTree, categoryHandles[0]) : undefined;
  const headingText = selectedProductId
    ? (selectedProduct?.title ?? "Product Details")
    : (singleCategory?.name ??
      (filters.q
        ? `Search: "${filters.q}"`
        : categoryHandles.length > 1
          ? "Selected categories"
          : "All Products"));
  const headerDescription = selectedProductId
    ? undefined
    : singleCategory?.description ||
      (filters.q
        ? "Search results across Azani products."
        : categoryHandles.length > 1
          ? "Showing products across your selected baby boutique categories."
          : "Browse baby essentials, gear, clothing, toys, and care products.");
  const categoryChildren = singleCategory?.category_children ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {selectedProductId && (
                <button
                  onClick={() => setSelectedProductId(null)}
                  className="text-muted hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-foreground/20 -ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:outline-none"
                  aria-label="Back to products"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <h1 className="text-foreground text-2xl font-bold sm:text-3xl">{headingText}</h1>
            </div>
            {!selectedProductId && (
              <>
                {headerDescription && (
                  <p className="text-muted mt-1 max-w-2xl text-sm">{headerDescription}</p>
                )}
                <p className="text-muted mt-2 text-sm">
                  {shownCount} product{shownCount !== 1 ? "s" : ""} found
                </p>
              </>
            )}
          </div>

          {!selectedProductId && (
            <label className="text-muted flex w-full items-center gap-2 text-sm sm:w-auto">
              <ArrowUpDown className="h-4 w-4 shrink-0" />
              <span className="sr-only">Sort products</span>
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(event) => updateQuery({ sort: event.target.value })}
                className="border-border/60 bg-card text-foreground focus:border-secondary focus:ring-secondary/15 h-10 min-w-0 rounded-xl border px-3 text-sm transition outline-none focus:ring-2 sm:w-52"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {/* Subcategory browser — drill into the current category's children */}
        {!selectedProductId && categoryChildren.length > 0 && (
          <div className="hide-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            {categoryChildren.map((child) => (
              <button
                key={child.id}
                type="button"
                aria-label={`Browse ${child.name}`}
                onClick={() => {
                  const nextHandles = categoryHandles.includes(child.handle)
                    ? categoryHandles
                    : [...categoryHandles, child.handle];
                  updateQuery({ category: serializeCategoryParam(nextHandles) });
                }}
                className="border-border/60 bg-card text-foreground hover:border-border-hover hover:bg-foreground/[0.04] focus-visible:ring-primary/30 shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {child.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <FilterSidebar
          filters={filters}
          onFilterChange={(newFilters) => {
            setSelectedProductId(null);
            updateQuery(newFilters);
          }}
          categories={categoriesQuery.data?.product_categories ?? []}
        />

        <div className="min-w-0 flex-1">
          {activeFilterCount > 0 && !selectedProductId && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {categoryHandles.map((handle) => {
                const name = findMedusaCategory(categoryTree, handle)?.name ?? handle;
                return (
                  <span
                    key={handle}
                    className="border-border/50 bg-card inline-flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-3 text-sm"
                  >
                    <Tag className="text-muted h-3 w-3" />
                    <span className="text-foreground font-medium">{name}</span>
                    <button
                      onClick={() =>
                        updateQuery({
                          category: serializeCategoryParam(
                            categoryHandles.filter((h) => h !== handle),
                          ),
                        })
                      }
                      className="text-muted hover:bg-foreground/[0.06] hover:text-foreground ml-0.5 flex h-5 w-5 items-center justify-center rounded-full transition"
                      aria-label={`Remove ${name} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              {filters.q && (
                <span className="border-border/50 bg-card inline-flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-3 text-sm">
                  <Search className="text-muted h-3 w-3" />
                  <span className="text-foreground font-medium">
                    &ldquo;{String(filters.q)}&rdquo;
                  </span>
                  <button
                    onClick={() => updateQuery({ q: undefined })}
                    className="text-muted hover:bg-foreground/[0.06] hover:text-foreground ml-0.5 flex h-5 w-5 items-center justify-center rounded-full transition"
                    aria-label="Remove search filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {brandFilter && (
                <span className="border-border/50 bg-card inline-flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-3 text-sm">
                  <Tag className="text-muted h-3 w-3" />
                  <span className="text-foreground font-medium">Brand: {brandFilter}</span>
                  <button
                    onClick={() => updateQuery({ brand: undefined })}
                    className="text-muted hover:bg-foreground/[0.06] hover:text-foreground ml-0.5 flex h-5 w-5 items-center justify-center rounded-full transition"
                    aria-label={`Remove ${brandFilter} brand filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {ageStageFilter && (
                <span className="border-border/50 bg-card inline-flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-3 text-sm">
                  <Tag className="text-muted h-3 w-3" />
                  <span className="text-foreground font-medium">Stage: {ageStageFilter}</span>
                  <button
                    onClick={() => updateQuery({ age_stage: undefined })}
                    className="text-muted hover:bg-foreground/[0.06] hover:text-foreground ml-0.5 flex h-5 w-5 items-center justify-center rounded-full transition"
                    aria-label={`Remove ${ageStageFilter} stage filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {inStockOnly && (
                <span className="border-border/50 bg-card inline-flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-3 text-sm">
                  <Tag className="text-muted h-3 w-3" />
                  <span className="text-foreground font-medium">In stock</span>
                  <button
                    onClick={() => updateQuery({ availability: undefined })}
                    className="text-muted hover:bg-foreground/[0.06] hover:text-foreground ml-0.5 flex h-5 w-5 items-center justify-center rounded-full transition"
                    aria-label="Remove availability filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {priceBracket && (
                <span className="border-border/50 bg-card inline-flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-3 text-sm">
                  <Tag className="text-muted h-3 w-3" />
                  <span className="text-foreground font-medium">
                    Price: {getPriceBracketLabel(priceBracket)}
                  </span>
                  <button
                    onClick={() => updateQuery({ price: undefined })}
                    className="text-muted hover:bg-foreground/[0.06] hover:text-foreground ml-0.5 flex h-5 w-5 items-center justify-center rounded-full transition"
                    aria-label="Remove price filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {activeFilterCount > 1 && (
                <button
                  onClick={() => {
                    setSelectedProductId(null);
                    updateQuery({
                      category: undefined,
                      q: undefined,
                      availability: undefined,
                      price: undefined,
                      brand: undefined,
                      age_stage: undefined,
                    });
                  }}
                  className="text-secondary hover:text-secondary-hover ml-1 text-sm font-medium transition hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {selectedProductId ? (
            <ProductDetail
              productId={selectedProductId}
              onBack={() => setSelectedProductId(null)}
            />
          ) : isLoading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-border/40 aspect-[3/4] animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="border-border/50 bg-card flex flex-col items-center gap-5 rounded-2xl border p-10 text-center">
              <div className="bg-secondary-light flex h-20 w-20 items-center justify-center rounded-full">
                <ShoppingBag className="text-secondary h-8 w-8" />
              </div>
              <div>
                <p className="text-foreground text-lg font-semibold">No products found</p>
                <p className="text-muted mt-1 text-sm">
                  Try adjusting your filters or search terms.
                </p>
              </div>
              <button
                onClick={() =>
                  updateQuery({
                    category: undefined,
                    q: undefined,
                    sort: undefined,
                    availability: undefined,
                    price: undefined,
                    brand: undefined,
                    age_stage: undefined,
                  })
                }
                className={buttonVariants()}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={(id) => setSelectedProductId(id)}
                  />
                ))}
              </div>

              {totalPages > 1 && !hasClientFacets && (
                <div className="mt-8 flex justify-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set("page", String(p));
                        router.push(`/products?${params.toString()}`);
                      }}
                      className={`focus-visible:ring-primary/30 flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                        p === page
                          ? "bg-foreground text-white"
                          : "border-border/50 text-muted hover:border-border hover:text-foreground border bg-white"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsContent />
    </Suspense>
  );
}
