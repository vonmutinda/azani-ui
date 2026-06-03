"use client";

import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { MedusaProductCategory } from "@/types/medusa";
import {
  toCategory,
  Category,
  TOP_LEVEL_HANDLES,
  parseCategoryParam,
  serializeCategoryParam,
} from "@/lib/categories";
import {
  AGE_STAGE_FILTERS,
  BRAND_FILTERS,
  parseFacetParam,
  serializeFacetParam,
} from "@/lib/product-metadata";
import { CategoryIcon } from "@/components/category-icon";

type Filters = Record<string, string | number | undefined>;

const PRICE_BRACKETS = [
  { value: "u1000", label: "Under KSh1,000" },
  { value: "1000-5000", label: "KSh1,000 – KSh5,000" },
  { value: "o5000", label: "Over KSh5,000" },
];

type Props = {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  categories: MedusaProductCategory[];
  /** Options derived from the loaded products; falls back to the canonical lists. */
  brandOptions?: string[];
  ageStageOptions?: string[];
};

function isSlugInTree(slug: string, cat: Category): boolean {
  if (cat.slug === slug) return true;
  if (cat.children) {
    return cat.children.some((child) => isSlugInTree(slug, child));
  }
  return false;
}

function CategoryItem({
  cat,
  depth,
  selectedHandles,
  onToggle,
}: {
  cat: Category;
  depth: number;
  selectedHandles: string[];
  onToggle: (slug: string) => void;
}) {
  const isActive = selectedHandles.includes(cat.slug);
  const hasChildren = cat.children && cat.children.length > 0;
  const containsSelected = selectedHandles.some((handle) => isSlugInTree(handle, cat));

  const [open, setOpen] = useState(containsSelected);

  /* eslint-disable react-hooks/set-state-in-effect -- sync open state with the selected category path */
  useEffect(() => {
    if (containsSelected) setOpen(true);
    if (!containsSelected && !isActive) setOpen(false);
  }, [containsSelected, isActive]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const indent = depth === 0 ? 0 : depth * 20;

  return (
    <div>
      <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${cat.name}`}
            className="text-muted hover:text-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition"
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-7 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onToggle(cat.slug)}
          aria-pressed={isActive}
          className={`flex min-h-11 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
            isActive
              ? "bg-primary-light text-primary font-semibold"
              : containsSelected
                ? "text-secondary font-medium"
                : "text-muted hover:bg-secondary-light hover:text-foreground"
          }`}
        >
          <CategoryIcon
            icon={cat.icon}
            size={depth === 0 ? 14 : 12}
            colored={!isActive}
            className={isActive ? "text-foreground" : ""}
          />
          <span>{cat.name}</span>
        </button>
      </div>
      {hasChildren && open && (
        <div className="mt-0.5">
          {cat.children!.map((child) => (
            <CategoryItem
              key={child.slug}
              cat={child}
              depth={depth + 1}
              selectedHandles={selectedHandles}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FilterSidebar({
  filters,
  onFilterChange,
  categories,
  brandOptions = BRAND_FILTERS,
  ageStageOptions = AGE_STAGE_FILTERS,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  const topCategories = categories
    .filter((c) => !c.parent_category_id && TOP_LEVEL_HANDLES.includes(c.handle))
    .map(toCategory);

  const selectedHandles = parseCategoryParam(
    typeof filters.category === "string" ? filters.category : undefined,
  );
  const selectedBrands = parseFacetParam(filters.brand);
  const selectedStages = parseFacetParam(filters.age_stage);

  // Count each selected value (a CSV of two brands counts as two).
  const activeFilterCount =
    selectedHandles.length +
    selectedBrands.length +
    selectedStages.length +
    Object.entries(filters).filter(([key, value]) => {
      if (key === "category" || key === "brand" || key === "age_stage") return false;
      return value !== undefined && value !== "";
    }).length;

  const setFilter = useCallback(
    (key: string, value: string | number | undefined) => {
      onFilterChange({ ...filters, [key]: value });
    },
    [filters, onFilterChange],
  );

  // Multi-select facets (brand / age & stage): toggle a value in/out of the CSV,
  // mirroring how multi-category selection works.
  const toggleFacet = useCallback(
    (key: "brand" | "age_stage", value: string) => {
      const current = parseFacetParam(filters[key]);
      const next = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value];
      onFilterChange({ ...filters, [key]: serializeFacetParam(next) });
    },
    [filters, onFilterChange],
  );

  const toggleCategory = useCallback(
    (slug: string) => {
      const current = parseCategoryParam(
        typeof filters.category === "string" ? filters.category : undefined,
      );
      const next = current.includes(slug)
        ? current.filter((handle) => handle !== slug)
        : [...current, slug];
      onFilterChange({ ...filters, category: serializeCategoryParam(next) });
    },
    [filters, onFilterChange],
  );

  useEffect(() => {
    if (!mobileOpen) return;

    mobileDrawerRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const content = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Browse
          {activeFilterCount > 0 && (
            <span className="bg-foreground rounded-full px-2 py-0.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </h3>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                category: undefined,
                q: undefined,
                availability: undefined,
                price: undefined,
                brand: undefined,
                age_stage: undefined,
              })
            }
            className="text-muted hover:text-foreground rounded-full px-1 py-1 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => setFilter("category", undefined)}
          className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
            selectedHandles.length === 0
              ? "bg-foreground/[0.06] text-foreground font-semibold"
              : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
          }`}
        >
          All Categories
        </button>
        {topCategories.map((cat) => (
          <CategoryItem
            key={cat.slug}
            cat={cat}
            depth={0}
            selectedHandles={selectedHandles}
            onToggle={toggleCategory}
          />
        ))}
      </div>

      <div className="border-border/50 border-t pt-4">
        <p className="text-foreground mb-1 text-sm font-semibold">Availability</p>
        <label className="hover:bg-foreground/[0.04] flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm transition">
          <input
            type="checkbox"
            checked={filters.availability === "in_stock"}
            onChange={(e) => setFilter("availability", e.target.checked ? "in_stock" : undefined)}
            className="accent-primary focus-visible:ring-primary/30 h-4 w-4 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          />
          <span className="text-foreground">In stock only</span>
        </label>
      </div>

      {brandOptions.length > 0 && (
        <fieldset className="border-border/50 border-t pt-4">
          <legend className="text-foreground mb-1 text-sm font-semibold">Brand</legend>
          <div className="space-y-0.5">
            {brandOptions.map((brand) => (
              <label
                key={brand}
                className="hover:bg-foreground/[0.04] flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm transition"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand)}
                  onChange={() => toggleFacet("brand", brand)}
                  className="accent-primary focus-visible:ring-primary/30 h-4 w-4 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                />
                <span className="text-foreground">{brand}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {ageStageOptions.length > 0 && (
        <fieldset className="border-border/50 border-t pt-4">
          <legend className="text-foreground mb-1 text-sm font-semibold">Age & stage</legend>
          <div className="space-y-0.5">
            {ageStageOptions.map((stage) => (
              <label
                key={stage}
                className="hover:bg-foreground/[0.04] flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm transition"
              >
                <input
                  type="checkbox"
                  checked={selectedStages.includes(stage)}
                  onChange={() => toggleFacet("age_stage", stage)}
                  className="accent-primary focus-visible:ring-primary/30 h-4 w-4 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                />
                <span className="text-foreground">{stage}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="border-border/50 border-t pt-4">
        <legend className="text-foreground mb-1 text-sm font-semibold">Price</legend>
        <div className="space-y-0.5">
          <label className="hover:bg-foreground/[0.04] flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm transition">
            <input
              type="radio"
              name="price"
              checked={!filters.price}
              onChange={() => setFilter("price", undefined)}
              className="accent-primary focus-visible:ring-primary/30 h-4 w-4 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
            <span className="text-muted">Any price</span>
          </label>
          {PRICE_BRACKETS.map((bracket) => (
            <label
              key={bracket.value}
              className="hover:bg-foreground/[0.04] flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm transition"
            >
              <input
                type="radio"
                name="price"
                checked={filters.price === bracket.value}
                onChange={() => setFilter("price", bracket.value)}
                className="accent-primary focus-visible:ring-primary/30 h-4 w-4 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              />
              <span className="text-foreground">{bracket.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="border-border text-foreground hover:bg-foreground/[0.04] flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {activeFilterCount > 0 && (
          <span className="bg-foreground rounded-full px-2 py-0.5 text-[10px] font-bold text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            data-testid="filters-drawer-backdrop"
            className="bg-foreground/20 absolute inset-0 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div
            ref={mobileDrawerRef}
            role="dialog"
            aria-label="Filters"
            aria-modal="true"
            tabIndex={-1}
            className="bg-card relative mr-auto h-full w-80 max-w-[85vw] overflow-y-auto p-6 shadow-xl focus-visible:outline-none"
          >
            {content}
          </div>
        </div>
      )}

      <aside className="hidden w-[280px] shrink-0 lg:block">
        <div className="hide-scrollbar sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {content}
        </div>
      </aside>
    </>
  );
}
