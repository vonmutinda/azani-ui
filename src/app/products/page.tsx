"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState, Suspense } from "react";
import { getProducts, getCategories, getCategoryByHandle } from "@/lib/medusa-api";
import { ShoppingBag } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { ProductDetail } from "@/components/product-detail";
import { FilterSidebar } from "@/components/filter-sidebar";
import { MedusaProductCategory } from "@/types/medusa";

type Filters = Record<string, string | number | undefined>;

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
      {!selectedProductId && (
        <div className="mb-5">
          <h1 className="text-foreground text-xl font-bold sm:text-2xl">
            {categoryQuery.data?.name ?? (filters.q ? `Search: "${filters.q}"` : "All Products")}
          </h1>
          <p className="text-muted mt-1 text-sm">
            {total} product{total !== 1 ? "s" : ""} found
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <FilterSidebar
          filters={filters}
          onFilterChange={(newFilters) => {
            setSelectedProductId(null);
            updateFilters(newFilters);
          }}
          categories={categoriesQuery.data?.product_categories ?? []}
        />

        {selectedProductId ? (
          <div className="min-w-0 flex-1">
            <ProductDetail
              productId={selectedProductId}
              onBack={() => {
                setSelectedProductId(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-border/40 aspect-[3/4] animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="border-border bg-card flex flex-col items-center gap-5 rounded-2xl border p-10 text-center shadow-sm">
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
                  onClick={() => updateFilters({})}
                  className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={(id) => {
                        setSelectedProductId(id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
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
                        className={`focus-visible:ring-primary/30 flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                          p === page
                            ? "bg-foreground text-white shadow-sm"
                            : "border-border text-muted hover:border-border-hover hover:text-foreground border bg-white"
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
        )}
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
