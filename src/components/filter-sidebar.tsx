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

  const indent = depth === 0 ? 0 : depth * 20;

  return (
    <div>
      <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
        {hasChildren ? (
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Collapse category" : "Expand category"}
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
          onClick={() => onSelect(isActive ? undefined : cat.slug)}
          className={`flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
            isActive
              ? "bg-foreground/[0.06] text-foreground font-semibold"
              : containsActive
                ? "text-foreground font-medium"
                : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
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
      </div>

      <div className="space-y-0.5">
        <button
          onClick={() => setFilter("category", undefined)}
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
            !filters.category
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
            className="bg-foreground/20 absolute inset-0 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="bg-card relative ml-auto h-full w-80 max-w-[85vw] overflow-y-auto p-6 shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close filters"
              className="text-muted hover:text-foreground absolute top-4 right-4 rounded-lg p-2 transition focus-visible:ring-2 focus-visible:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
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
