"use client";

import { ChevronDown, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { MedusaProductCategory } from "@/types/medusa";
import { toKokobCategory, KokobCategory, TOP_LEVEL_HANDLES, findCategory } from "@/lib/categories";
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

  useEffect(() => {
    if (containsActive) setOpen(true);
    if (!containsActive && !isActive) setOpen(false);
  }, [containsActive, isActive]);

  const indent = depth === 0 ? 0 : 12 + depth * 16;

  return (
    <div>
      <div
        className="flex items-center"
        style={{ paddingLeft: `${indent}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setOpen(!open)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-light transition hover:text-muted"
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <button
          onClick={() => onSelect(isActive ? undefined : cat.slug)}
          className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition ${
            isActive
              ? "bg-primary-light font-semibold text-primary"
              : "text-foreground hover:bg-primary-light/50 hover:text-primary"
          }`}
        >
          {depth === 0 && <CategoryIcon icon={cat.icon} size={14} className={isActive ? "text-primary" : "text-muted"} />}
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
    .filter((c) => TOP_LEVEL_HANDLES.includes(c.handle))
    .map(toKokobCategory);

  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length;

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
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-white">{activeFilterCount}</span>
          )}
        </h3>
        {activeFilterCount > 0 && (
          <button onClick={clearAll} className="text-[11px] font-medium text-primary hover:underline">
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-1">
        <h4 className="mb-1 text-[13px] font-semibold text-foreground">Categories</h4>
        <button
          onClick={() => setFilter("category", undefined)}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition ${
            !filters.category ? "bg-primary-light font-semibold text-primary" : "text-foreground hover:bg-primary-light/50"
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
        className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/30 lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        Filters
        {activeFilterCount > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-white">{activeFilterCount}</span>
        )}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative ml-auto h-full w-80 max-w-[85vw] overflow-y-auto bg-card p-6 shadow-xl">
            <button onClick={() => setMobileOpen(false)} className="absolute right-4 top-4 rounded-full p-1 text-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            {content}
          </div>
        </div>
      )}

      <aside className="hidden w-[260px] shrink-0 lg:block">
        <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-sm">
          {content}
        </div>
      </aside>
    </>
  );
}
