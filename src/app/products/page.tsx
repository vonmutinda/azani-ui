"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState, Suspense } from "react";
import { getProducts, getCategories } from "@/lib/medusa-api";
import { AlertCircle, ArrowLeft, ArrowUpDown, Search, ShoppingBag, Tag, X } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { ProductDetail } from "@/components/product-detail";
import { FilterSidebar } from "@/components/filter-sidebar";
import { MedusaProduct, MedusaProductCategory } from "@/types/medusa";
import { getProductPrice } from "@/lib/formatters";

type FilterValue = string | number | string[] | undefined;
type Filters = Record<string, FilterValue>;
type ProductsResponse = {
  products: MedusaProduct[];
  count: number;
  offset: number;
  limit: number;
};
type ProductRequestParams = Record<string, string | number | boolean | string[] | undefined>;

const PAGE_SIZE = 20;
const PRICE_SORT_BATCH_SIZE = 100;
const EMPTY_PRODUCTS: MedusaProduct[] = [];

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

function isPriceSort(sort: SortValue) {
  return sort === "price_asc" || sort === "price_desc";
}

function collectCategoryIds(cat: MedusaProductCategory): string[] {
  const ids = [cat.id];
  if (cat.category_children) {
    for (const child of cat.category_children) {
      ids.push(...collectCategoryIds(child));
    }
  }
  return ids;
}

function flattenCategories(categories: MedusaProductCategory[]): MedusaProductCategory[] {
  return categories.flatMap((category) => [
    category,
    ...flattenCategories(category.category_children ?? []),
  ]);
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

async function getProductsForPriceSort(params: ProductRequestParams): Promise<ProductsResponse> {
  const firstPage = await getProducts({
    ...params,
    limit: PRICE_SORT_BATCH_SIZE,
    offset: 0,
  });
  const products = [...firstPage.products];

  for (
    let nextOffset = PRICE_SORT_BATCH_SIZE;
    nextOffset < firstPage.count;
    nextOffset += PRICE_SORT_BATCH_SIZE
  ) {
    const page = await getProducts({
      ...params,
      limit: PRICE_SORT_BATCH_SIZE,
      offset: nextOffset,
    });
    products.push(...page.products);
  }

  return {
    products,
    count: firstPage.count,
    offset: 0,
    limit: products.length,
  };
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const searchParamString = searchParams.toString();
  const categoryHandles = useMemo(
    () => uniqueValues(new URLSearchParams(searchParamString).getAll("category")),
    [searchParamString],
  );
  const filters: Filters = {
    category: categoryHandles,
    q: searchParams.get("q") ?? undefined,
  };
  const requestedSort = searchParams.get("sort");
  const sort: SortValue = isSortValue(requestedSort) ? requestedSort : "featured";

  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = PAGE_SIZE;
  const offset = (page - 1) * limit;

  const categoriesQuery = useQuery({
    queryKey: ["categories-sidebar"],
    queryFn: () => getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const categoryLookup = useMemo(() => {
    return new Map(
      flattenCategories(categoriesQuery.data?.product_categories ?? []).map((category) => [
        category.handle,
        category,
      ]),
    );
  }, [categoriesQuery.data]);

  const selectedCategories = useMemo(
    () =>
      categoryHandles
        .map((handle) => categoryLookup.get(handle))
        .filter((category): category is MedusaProductCategory => !!category),
    [categoryHandles, categoryLookup],
  );

  const categoryIds = useMemo(() => {
    if (categoryHandles.length === 0) return undefined;
    if (!categoriesQuery.isFetched || categoriesQuery.isError) return undefined;
    if (selectedCategories.length === 0) return [];

    return uniqueValues(selectedCategories.flatMap(collectCategoryIds));
  }, [
    categoriesQuery.isError,
    categoriesQuery.isFetched,
    categoryHandles.length,
    selectedCategories,
  ]);

  const productsQuery = useQuery({
    queryKey: ["products", "list", { ...filters, sort, page, categoryIds }],
    queryFn: () => {
      if (categoryHandles.length > 0 && categoryIds && categoryIds.length === 0) {
        return Promise.resolve({ products: [], count: 0, offset, limit });
      }

      const productParams: ProductRequestParams = {
        ...(categoryIds && categoryIds.length > 0 ? { category_id: categoryIds } : {}),
        ...(filters.q ? { q: String(filters.q) } : {}),
      };

      if (isPriceSort(sort)) {
        return getProductsForPriceSort(productParams);
      }

      return getProducts({
        limit,
        offset,
        ...productParams,
        ...(getSortOrder(sort) ? { order: getSortOrder(sort) } : {}),
      });
    },
    enabled:
      categoryHandles.length === 0 || (categoriesQuery.isFetched && !categoriesQuery.isError),
  });

  const products = productsQuery.data?.products ?? EMPTY_PRODUCTS;
  const sortedProducts = useMemo(() => {
    const copy = [...products];

    if (sort === "price_asc") {
      return copy
        .sort(
          (a, b) =>
            (getProductPrice(a)?.amount ?? Number.MAX_SAFE_INTEGER) -
            (getProductPrice(b)?.amount ?? Number.MAX_SAFE_INTEGER),
        )
        .slice(offset, offset + limit);
    }

    if (sort === "price_desc") {
      return copy
        .sort((a, b) => (getProductPrice(b)?.amount ?? 0) - (getProductPrice(a)?.amount ?? 0))
        .slice(offset, offset + limit);
    }

    if (sort === "newest") {
      return copy.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    return products;
  }, [limit, offset, products, sort]);
  const total = productsQuery.data?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const updateQuery = useCallback(
    (newFilters: Filters) => {
      const params = new URLSearchParams();
      const shouldClearFilters = Object.keys(newFilters).length === 0;
      const rawCategories =
        "category" in newFilters ? newFilters.category : shouldClearFilters ? [] : filters.category;
      const nextCategories = Array.isArray(rawCategories)
        ? uniqueValues(rawCategories)
        : typeof rawCategories === "string"
          ? [rawCategories]
          : [];
      const nextQ = "q" in newFilters ? newFilters.q : shouldClearFilters ? undefined : filters.q;
      const nextSort = "sort" in newFilters ? newFilters.sort : sort;

      for (const category of nextCategories) {
        params.append("category", category);
      }
      if (nextQ !== undefined && nextQ !== "") params.set("q", String(nextQ));
      if (nextSort !== undefined && nextSort !== "" && nextSort !== "featured") {
        params.set("sort", String(nextSort));
      }

      params.delete("page");
      const query = params.toString();
      router.push(query ? `/products?${query}` : "/products");
    },
    [filters.category, filters.q, router, sort],
  );

  const categoryLookupFailed = categoryHandles.length > 0 && categoriesQuery.isError;
  const hasBrowseError = categoryLookupFailed || productsQuery.isError;
  const isLoading =
    productsQuery.isLoading || (categoryHandles.length > 0 && categoriesQuery.isLoading);
  const retryBrowsing = useCallback(() => {
    if (categoryLookupFailed) void categoriesQuery.refetch();
    if (productsQuery.isError) void productsQuery.refetch();
  }, [categoryLookupFailed, categoriesQuery, productsQuery]);

  const selectedProduct = selectedProductId
    ? products.find((p) => p.id === selectedProductId)
    : null;

  const activeFilterCount = categoryHandles.length + (filters.q ? 1 : 0);
  const singleSelectedCategory = selectedCategories.length === 1 ? selectedCategories[0] : null;

  const headingText = selectedProductId
    ? (selectedProduct?.title ?? "Product Details")
    : filters.q
      ? `Search: "${filters.q}"`
      : singleSelectedCategory
        ? singleSelectedCategory.name
        : selectedCategories.length > 1
          ? "Selected categories"
          : "All Products";
  const headerDescription = selectedProductId
    ? undefined
    : singleSelectedCategory?.description ||
      (filters.q
        ? "Search results across Azani products."
        : selectedCategories.length > 1
          ? "Showing products across your selected baby boutique categories."
          : "Browse baby essentials, gear, clothing, toys, and care products.");
  const categoryChildren = singleSelectedCategory?.category_children ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {selectedProductId && (
                <button
                  onClick={() => setSelectedProductId(null)}
                  className="az-icon-button az-focus -ml-1 flex h-9 min-h-9 w-9 min-w-9 shrink-0 rounded-full"
                  aria-label="Back to products"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <h1 className="text-foreground text-2xl font-bold">{headingText}</h1>
            </div>
            {!selectedProductId && (
              <>
                {headerDescription && (
                  <p className="text-muted mt-1 max-w-2xl text-sm">{headerDescription}</p>
                )}
                <p className="text-muted mt-2 text-sm">
                  {total} product{total !== 1 ? "s" : ""} found
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
                className="az-form-field min-w-0 px-3 sm:w-52"
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

        {!selectedProductId && categoryChildren.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categoryChildren.map((child) => (
              <button
                key={child.id}
                type="button"
                aria-label={`Browse ${child.name}`}
                onClick={() =>
                  updateQuery({ category: uniqueValues([...categoryHandles, child.handle]) })
                }
                className="az-focus border-secondary/30 bg-secondary-light text-secondary hover:border-secondary hover:bg-primary-light hover:text-primary shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition"
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
                const categoryName = categoryLookup.get(handle)?.name ?? handle;

                return (
                  <span
                    key={handle}
                    className="az-pill border-secondary/25 bg-secondary-light inline-flex border py-1 pr-1.5 pl-3 text-sm"
                  >
                    <Tag className="text-secondary h-3 w-3" />
                    <span className="text-foreground font-medium">{categoryName}</span>
                    <button
                      onClick={() =>
                        updateQuery({
                          category: categoryHandles.filter((category) => category !== handle),
                        })
                      }
                      className="az-icon-button az-focus ml-0.5 flex h-5 min-h-5 w-5 min-w-5 rounded-full"
                      aria-label={`Remove ${categoryName} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              {filters.q && (
                <span className="az-pill border-primary/20 bg-primary-light inline-flex border py-1 pr-1.5 pl-3 text-sm">
                  <Search className="text-primary h-3 w-3" />
                  <span className="text-foreground font-medium">
                    &ldquo;{String(filters.q)}&rdquo;
                  </span>
                  <button
                    onClick={() => updateQuery({ q: undefined })}
                    className="az-icon-button az-focus ml-0.5 flex h-5 min-h-5 w-5 min-w-5 rounded-full"
                    aria-label="Remove search filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {activeFilterCount > 1 && (
                <button
                  onClick={() => {
                    setSelectedProductId(null);
                    updateQuery({ category: [], q: undefined });
                  }}
                  className="text-secondary hover:text-primary ml-1 text-sm font-medium transition hover:underline"
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
                <div key={i} className="az-skeleton aspect-[3/4]" />
              ))}
            </div>
          ) : hasBrowseError ? (
            <div className="az-empty-state flex flex-col items-center gap-5 p-10">
              <div className="bg-danger-light flex h-20 w-20 items-center justify-center rounded-full">
                <AlertCircle className="text-danger h-8 w-8" />
              </div>
              <div>
                <p className="text-foreground text-lg font-semibold">
                  We couldn&apos;t load products
                </p>
                <p className="text-muted mt-1 text-sm">
                  Check your connection and try loading this browse view again.
                </p>
              </div>
              <button
                onClick={retryBrowsing}
                className="az-btn az-btn-primary az-focus rounded-full px-6 py-2.5"
                aria-label="Try loading products again"
              >
                Try again
              </button>
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="az-empty-state flex flex-col items-center gap-5 p-10">
              <div className="bg-trust-light flex h-20 w-20 items-center justify-center rounded-full">
                <ShoppingBag className="text-trust h-8 w-8" />
              </div>
              <div>
                <p className="text-foreground text-lg font-semibold">No products found</p>
                <p className="text-muted mt-1 text-sm">
                  Try adjusting your filters or search terms.
                </p>
              </div>
              <button
                onClick={() => updateQuery({ category: undefined, q: undefined, sort: undefined })}
                className="az-btn az-btn-primary az-focus rounded-full px-6 py-2.5"
                aria-label="Clear filters and browse all products"
              >
                Clear filters and browse all products
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {sortedProducts.map((product) => (
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
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set("page", String(p));
                        router.push(`/products?${params.toString()}`);
                      }}
                      className={`az-focus flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors duration-150 ${
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
