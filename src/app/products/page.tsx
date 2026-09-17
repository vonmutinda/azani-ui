"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import { getProducts, getCategories } from "@/lib/medusa-api";
import { ArrowUpDown, Search, ShoppingBag, Tag, X } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { ProductDetail } from "@/components/product-detail";
import { FilterSidebar } from "@/components/filter-sidebar";
import { CatalogueCategories } from "@/components/catalogue-categories";
import { buttonVariants } from "@/components/ui/button";

import {
  parseCategoryParam,
  serializeCategoryParam,
  resolveCategoryIds,
  findMedusaCategory,
  resolveClothingCategoryHandle,
  isRetiredCategoryHandle,
} from "@/lib/categories";

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

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const previousProductId = useRef(selectedProductId);

  useLayoutEffect(() => {
    if (previousProductId.current === selectedProductId) return;
    previousProductId.current = selectedProductId;
    // Inline detail changes do not pass through Next's route scroll handling.
    // Reset after the new layout commits so its heading clears the sticky header.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [selectedProductId]);

  const filters: Filters = {
    category: searchParams.get("category") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    availability: searchParams.get("availability") ?? undefined,
    price: searchParams.get("price") ?? undefined,
    audience: searchParams.get("audience") ?? undefined,
    age: searchParams.get("age") ?? undefined,
    size: searchParams.get("size") ?? undefined,
    colour: searchParams.get("colour") ?? undefined,
    sale: searchParams.get("sale") ?? undefined,
  };
  const requestedSort = searchParams.get("sort");
  const sort: SortValue = isSortValue(requestedSort) ? requestedSort : "featured";

  const parsedPage = Number(searchParams.get("page") ?? 1);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
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
  const requestedHandles = useMemo(() => parseCategoryParam(categoryParam), [categoryParam]);
  const retiredDepartment = requestedHandles.some(isRetiredCategoryHandle);
  const categoryHandles = useMemo(
    () =>
      Array.from(
        new Set(
          requestedHandles
            .filter((handle) => handle !== "clothing")
            .map((handle) => resolveClothingCategoryHandle(handle) ?? handle),
        ),
      ),
    [requestedHandles],
  );
  useEffect(() => {
    const canonical = serializeCategoryParam(categoryHandles);
    if (!retiredDepartment && canonical !== categoryParam) {
      const params = new URLSearchParams(searchParams.toString());
      if (canonical) params.set("category", canonical);
      else params.delete("category");
      router.replace(params.size ? `/products?${params}` : "/products");
    }
  }, [categoryHandles, categoryParam, retiredDepartment, router, searchParams]);
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
      if (retiredDepartment || (hasCategoryFilter && categoryIds && categoryIds.length === 0)) {
        return Promise.resolve({ products: [], count: 0, offset, limit });
      }

      return getProducts({
        limit,
        offset,
        ...(categoryIds && categoryIds.length > 0 ? { category_id: categoryIds } : {}),
        ...(filters.q ? { q: String(filters.q) } : {}),
        sort,
        audience: filters.audience,
        age: filters.age,
        size: filters.size,
        colour: filters.colour,
        sale: filters.sale,
        availability: filters.availability,
        price: filters.price,
      });
    },
    // Wait for the category tree before filtering so the ids resolve correctly.
    enabled: !hasCategoryFilter || categoriesQuery.isFetched || categoriesQuery.isError,
  });

  const products = useMemo(() => productsQuery.data?.products ?? [], [productsQuery.data]);
  const visibleProducts = products;
  const total = productsQuery.data?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const updateQuery = useCallback(
    (newFilters: Filters) => {
      const params = new URLSearchParams();
      const nextFilters: Filters = {
        category: filters.category,
        q: filters.q,
        availability: filters.availability,
        price: filters.price,
        audience: filters.audience,
        age: filters.age,
        size: filters.size,
        colour: filters.colour,
        sale: filters.sale,
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
      filters.audience,
      filters.age,
      filters.size,
      filters.colour,
      filters.sale,
      router,
      sort,
    ],
  );

  const isLoading = productsQuery.isLoading || (hasCategoryFilter && categoriesQuery.isLoading);
  const isUpdating = isLoading || productsQuery.isFetching;
  const hasResultsError = productsQuery.isError || (hasCategoryFilter && categoriesQuery.isError);

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
  const headingText =
    singleCategory?.name ??
    (filters.q
      ? `Search: "${filters.q}"`
      : categoryHandles.length > 1
        ? "Selected categories"
        : filters.audience === "girls"
          ? "Girls’ Clothing"
          : filters.audience === "boys"
            ? "Boys’ Clothing"
            : filters.age
              ? `Clothing for ages ${filters.age}`
              : filters.sale
                ? "Sale"
                : sort === "newest"
                  ? "New arrivals"
                  : "All Clothing");
  const headerDescription = selectedProductId
    ? undefined
    : singleCategory?.description ||
      (filters.q
        ? "Search results across Azani products."
        : categoryHandles.length > 1
          ? "Clothing across your selected garment categories."
          : "Clothing for children aged 2–12. Choose a size to find an available fit.");
  const isUnfilteredSale = Boolean(filters.sale) && activeFilterCount === 1;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {!selectedProductId && (
        <div className="mb-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-foreground text-2xl font-bold sm:text-3xl">{headingText}</h1>
              </div>
              {!selectedProductId && (
                <>
                  {headerDescription && (
                    <p className="text-muted mt-1 max-w-2xl text-sm">{headerDescription}</p>
                  )}
                </>
              )}
            </div>

            {!selectedProductId && (
              <p role="status" aria-live="polite" className="text-muted shrink-0 text-sm">
                {isUpdating
                  ? productsQuery.data
                    ? "Updating clothing…"
                    : "Loading clothing…"
                  : hasResultsError
                    ? "Results unavailable"
                    : `${total} product${total === 1 ? "" : "s"} found`}
              </p>
            )}
          </div>
        </div>
      )}

      {!selectedProductId && !retiredDepartment && (
        <CatalogueCategories
          categories={categoryTree}
          products={products}
          selectedHandles={categoryHandles}
          onSelect={(handle) =>
            updateQuery({
              category: serializeCategoryParam(
                categoryHandles.includes(handle)
                  ? categoryHandles.filter((selected) => selected !== handle)
                  : [...categoryHandles, handle],
              ),
            })
          }
        />
      )}

      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-4 lg:grid-cols-[208px_minmax(0,1fr)] lg:gap-x-8 ${selectedProductId ? "" : "lg:grid-rows-[44px_1fr]"}`}
      >
        {!selectedProductId && (
          <FilterSidebar
            filters={filters}
            onFilterChange={(newFilters) => {
              setSelectedProductId(null);
              updateQuery(newFilters);
            }}
            categories={categoriesQuery.data?.product_categories ?? []}
            facets={
              productsQuery.data && "facets" in productsQuery.data
                ? productsQuery.data.facets
                : undefined
            }
            resultCount={productsQuery.data && !hasResultsError ? total : undefined}
            isUpdating={isUpdating}
          />
        )}

        {!selectedProductId && (
          <label className="text-muted flex min-w-0 items-center justify-end gap-2 text-sm lg:col-start-2">
            <ArrowUpDown className="hidden h-4 w-4 shrink-0 sm:block" />
            <span className="sr-only">Sort products</span>
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(event) => updateQuery({ sort: event.target.value })}
              className="border-border bg-card text-foreground focus-visible:ring-primary min-h-11 w-44 min-w-0 rounded-lg border px-2.5 text-sm focus-visible:ring-2 focus-visible:outline-none sm:w-52"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <div
          className={`col-span-2 min-w-0 ${selectedProductId ? "" : "lg:col-span-1 lg:col-start-2"}`}
        >
          {activeFilterCount > 0 && !selectedProductId && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {categoryHandles.map((handle) => {
                const name = findMedusaCategory(categoryTree, handle)?.name ?? handle;
                return (
                  <span
                    key={handle}
                    className="border-border bg-card inline-flex items-center gap-1 rounded-lg border pl-2.5 text-sm"
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
                      className="text-muted hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-primary flex h-11 w-9 items-center justify-center rounded-lg transition focus-visible:ring-2 focus-visible:outline-none"
                      aria-label={`Remove ${name} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              {filters.q && (
                <span className="border-border bg-card inline-flex items-center gap-1 rounded-lg border pl-2.5 text-sm">
                  <Search className="text-muted h-3 w-3" />
                  <span className="text-foreground font-medium">
                    &ldquo;{String(filters.q)}&rdquo;
                  </span>
                  <button
                    onClick={() => updateQuery({ q: undefined })}
                    className="text-muted hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-primary flex h-11 w-9 items-center justify-center rounded-lg transition focus-visible:ring-2 focus-visible:outline-none"
                    aria-label="Remove search filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setSelectedProductId(null);
                    updateQuery({
                      category: undefined,
                      q: undefined,
                      availability: undefined,
                      price: undefined,
                      audience: undefined,
                      age: undefined,
                      size: undefined,
                      colour: undefined,
                      sale: undefined,
                    });
                  }}
                  className="text-muted hover:text-foreground focus-visible:ring-primary min-h-11 rounded-lg px-2 text-xs font-medium underline underline-offset-4 transition focus-visible:ring-2 focus-visible:outline-none"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {selectedProductId ? (
            <ProductDetail
              key={selectedProductId}
              productId={selectedProductId}
              headingLevel={1}
              onBack={() => setSelectedProductId(null)}
            />
          ) : isLoading ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-border/40 aspect-[3/4] animate-pulse rounded-xl" />
              ))}
            </div>
          ) : hasResultsError ? (
            <div role="alert" className="rounded-xl border p-8">
              <p>Clothing is temporarily unavailable. Please try again.</p>
              <button
                onClick={() => {
                  productsQuery.refetch();
                  categoriesQuery.refetch();
                }}
                className={buttonVariants()}
              >
                Try again
              </button>
            </div>
          ) : retiredDepartment ? (
            <div className="rounded-xl border p-8 text-center">
              <h2 className="text-lg font-semibold">We now specialise in kids’ clothing</h2>
              <p className="text-muted my-3">
                This department has retired. Explore clothing for children aged 2–12.
              </p>
              <button className={buttonVariants()} onClick={() => router.push("/products")}>
                Shop clothing
              </button>
            </div>
          ) : visibleProducts.length === 0 && isUnfilteredSale ? (
            <div className="border-border bg-card flex flex-col items-center gap-4 rounded-xl border px-6 py-12 text-center">
              <Tag className="text-muted h-7 w-7" />
              <div>
                <h2 className="text-xl font-semibold">No offers right now</h2>
                <p className="text-muted mt-2 max-w-sm text-sm">
                  Explore the latest arrivals for children aged 2–12.
                </p>
              </div>
              <Link href="/products?sort=newest" className={buttonVariants()}>
                Shop new arrivals
              </Link>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="border-border bg-card flex flex-col items-center gap-5 rounded-xl border p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center">
                <ShoppingBag className="text-muted h-7 w-7" />
              </div>
              <div>
                <h2 className="text-foreground text-lg font-semibold">No products found</h2>
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
                    audience: undefined,
                    age: undefined,
                    size: undefined,
                    colour: undefined,
                    sale: undefined,
                  })
                }
                className={buttonVariants()}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 lg:grid-cols-3">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={(id) => setSelectedProductId(id)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      aria-label={`Page ${p}`}
                      aria-current={p === page ? "page" : undefined}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set("page", String(p));
                        router.push(`/products?${params.toString()}`);
                      }}
                      className={`focus-visible:ring-primary/30 flex h-11 w-11 items-center justify-center rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
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
