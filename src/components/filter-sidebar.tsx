"use client";

import { ChevronDown, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { MedusaProductCategory } from "@/types/medusa";
import { toKokobCategory, KokobCategory, TOP_LEVEL_HANDLES } from "@/lib/categories";
import { CategoryIcon } from "@/components/category-icon";

type Filters = Record<string, string | number | undefined>;

type Props = {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  categories: MedusaProductCategory[];
};

function isSlugInTree(slug: string, cat: KokobCategory): boolean {
  if (cat.slug === slug) return true;
  if (cat.children) {
    return cat.children.some((child) => isSlugInTree(slug, child));
  }
  return false;
}

function CategoryItem({
  cat,
  depth,
  activeSlug,
  onSelect,
}: {
  cat: KokobCategory;
  depth: number;
  activeSlug?: string;
  onSelect: (slug: string | undefined) => void;
}) {
  const isActive = activeSlug === cat.slug;
  const hasChildren = cat.children && cat.children.length > 0;
  const containsActive = activeSlug ? isSlugInTree(activeSlug, cat) : false;

  const [open, setOpen] = useState(containsActive);

  /* eslint-disable react-hooks/set-state-in-effect -- sync open state with active category */
  useEffect(() => {
    if (containsActive) setOpen(true);
    if (!containsActive && !isActive) setOpen(false);
  }, [containsActive, isActive]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const indent = depth === 0 ? 0 : 12 + depth * 16;

  return (
    <div>
      <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
        {hasChildren ? (
          <button
            onClick={() => setOpen(!open)}
            className="text-muted-light hover:text-muted focus-visible:ring-primary/20 flex shrink-0 items-center justify-center rounded-full p-2 transition focus-visible:ring-2 focus-visible:outline-none"
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <button
          onClick={() => onSelect(isActive ? undefined : cat.slug)}
          className={`focus-visible:ring-primary/20 flex flex-1 items-center gap-2 rounded-2xl px-2.5 py-2.5 text-left text-[13px] transition focus-visible:ring-2 focus-visible:outline-none ${
            isActive
              ? "bg-secondary-light text-secondary font-semibold"
              : "text-foreground hover:bg-background hover:text-foreground"
          }`}
        >
          {depth === 0 && (
            <CategoryIcon
              icon={cat.icon}
              size={14}
              colored={!isActive}
              className={isActive ? "text-secondary" : ""}
            />
          )}
          <span className="truncate">{cat.name}</span>
        </button>
      </div>
      {hasChildren && open && (
        <div className="mt-0.5">
          {cat.children!.map((child) => (
            <CategoryItem
              key={child.slug}
              cat={child}
              depth={depth + 1}
              activeSlug={activeSlug}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FilterSidebar({ filters, onFilterChange, categories }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const topCategories = categories
    .filter((c) => !c.parent_category_id && TOP_LEVEL_HANDLES.includes(c.handle))
    .map(toKokobCategory);

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== "",
  ).length;

  const setFilter = useCallback(
    (key: string, value: string | number | undefined) => {
      onFilterChange({ ...filters, [key]: value });
    },
    [filters, onFilterChange],
  );

  const clearAll = useCallback(() => onFilterChange({}), [onFilterChange]);

  const content = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-foreground rounded-full px-2 py-0.5 text-[10px] text-white">
              {activeFilterCount}
            </span>
          )}
        </h3>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-secondary focus-visible:ring-secondary/20 rounded text-[11px] font-medium transition hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-1">
        <h4 className="text-foreground mb-1 text-[13px] font-semibold">Categories</h4>
        <button
          onClick={() => setFilter("category", undefined)}
          className={`focus-visible:ring-primary/20 flex w-full items-center gap-2 rounded-2xl px-2.5 py-2.5 text-left text-[13px] transition focus-visible:ring-2 focus-visible:outline-none ${
            !filters.category
              ? "bg-secondary-light text-secondary font-semibold"
              : "text-foreground hover:bg-background"
          }`}
        >
          All Categories
        </button>
        {topCategories.map((cat) => (
          <CategoryItem
            key={cat.slug}
            cat={cat}
            depth={0}
            activeSlug={filters.category ? String(filters.category) : undefined}
            onSelect={(slug) => setFilter("category", slug)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="border-border bg-card text-foreground hover:border-border-hover hover:bg-background focus-visible:ring-border flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:hidden"
      >
        <SlidersHorizontal className="text-foreground h-4 w-4" />
        Filters
        {activeFilterCount > 0 && (
          <span className="bg-foreground rounded-full px-2 py-0.5 text-[10px] text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="bg-foreground/30 absolute inset-0 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="border-border bg-card relative ml-auto h-full w-80 max-w-[85vw] overflow-y-auto border-l p-6 shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="text-muted hover:text-foreground focus-visible:ring-primary/20 absolute top-4 right-4 rounded-full p-2.5 transition focus-visible:ring-2 focus-visible:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
            {content}
          </div>
        </div>
      )}

      <aside className="hidden w-[260px] shrink-0 lg:block">
        <div className="border-border bg-card sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-2xl border p-5 shadow-sm">
          {content}
        </div>
      </aside>
    </>
  );
}
