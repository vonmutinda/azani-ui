"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState, Suspense } from "react";
import { getProducts, getCategories, getCategoryByHandle } from "@/lib/medusa-api";
import { ProductCard } from "@/components/product-card";
import { ProductDetail } from "@/components/product-detail";
import { FilterSidebar } from "@/components/filter-sidebar";
import { MedusaProductCategory } from "@/types/medusa";

type Filters = Record<string, string | number | undefined>;

/** Collect all IDs from a category and its descendants */
function collectCategoryIds(cat: MedusaProductCategory): string[] {
  const ids = [cat.id];
  if (cat.category_children) {
    for (const child of cat.category_children) {
      ids.push(...collectCategoryIds(child));
    }
  }
  return ids;
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const filters: Filters = {
    category: searchParams.get("category") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  };

  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const categoryHandle = filters.category ? String(filters.category) : undefined;
  const categoryQuery = useQuery({
    queryKey: ["category", categoryHandle],
    queryFn: () => getCategoryByHandle(categoryHandle!),
    enabled: !!categoryHandle,
  });

  const categoryIds = useMemo(() => {
    if (!categoryQuery.data) return undefined;
    return collectCategoryIds(categoryQuery.data);
  }, [categoryQuery.data]);

  const productsQuery = useQuery({
    queryKey: ["products", "list", { ...filters, page, categoryIds }],
    queryFn: () =>
      getProducts({
        limit,
        offset,
        ...(categoryIds && categoryIds.length > 0 ? { category_id: categoryIds } : {}),
        ...(filters.q ? { q: String(filters.q) } : {}),
      }),
    enabled: !categoryHandle || !!categoryIds || categoryQuery.isError,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories-sidebar"],
    queryFn: () => getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const products = productsQuery.data?.products ?? [];
  const total = productsQuery.data?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const updateFilters = useCallback(
    (newFilters: Filters) => {
      setSelectedProductId(null);
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(newFilters)) {
        if (value !== undefined && value !== "") {
          params.set(key, String(value));
        }
      }
      router.push(`/products?${params.toString()}`);
    },
    [router],
  );

  const isLoading = productsQuery.isLoading || (!!categoryHandle && categoryQuery.isLoading);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {categoryQuery.data?.name ?? (filters.q ? `Search: "${filters.q}"` : "All Products")}
        </h1>
        {!selectedProductId && (
          <p className="mt-1 text-sm text-muted">
            {total} product{total !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      <div className="flex gap-8">
        <FilterSidebar
          filters={filters}
          onFilterChange={updateFilters}
          categories={categoriesQuery.data?.product_categories ?? []}
        />

        <div className="flex-1 min-w-0">
          {selectedProductId ? (
            <ProductDetail
              productId={selectedProductId}
              onBack={() => setSelectedProductId(null)}
            />
          ) : isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-border/40" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <p className="text-sm text-muted">No products found. Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
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
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition ${
                        p === page
                          ? "bg-primary text-white"
                          : "border border-border text-muted hover:border-primary hover:text-primary"
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
