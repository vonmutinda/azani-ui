"use client";

import { ChevronDown, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { MedusaProductCategory } from "@/types/medusa";
import { toCategory, Category, TOP_LEVEL_HANDLES } from "@/lib/categories";
import { CategoryIcon } from "@/components/category-icon";

type Filters = Record<string, string | number | undefined>;

type Props = {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  categories: MedusaProductCategory[];
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
  activeSlug,
  onSelect,
}: {
  cat: Category;
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
            aria-label={`${open ? "Collapse" : "Expand"} ${cat.name}`}
            className="az-icon-button az-focus h-7 min-h-7 w-7 min-w-7 shrink-0 rounded-md"
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
          aria-current={isActive ? "true" : undefined}
          className={`az-focus flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${
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
    .map(toCategory);

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== "",
  ).length;

  const setFilter = useCallback(
    (key: string, value: string | number | undefined) => {
      onFilterChange({ ...filters, [key]: value });
    },
    [filters, onFilterChange],
  );

  const renderContent = (titleId: string) => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 id={titleId} className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="az-pill az-pill-neutral px-2 py-0.5 text-[10px]">
              {activeFilterCount}
            </span>
          )}
        </h3>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => onFilterChange({})}
            className="az-focus text-muted hover:text-foreground rounded-full text-xs font-medium transition"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-0.5">
        <button
          onClick={() => setFilter("category", undefined)}
          className={`az-focus flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${
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
      <div className="lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open filters"
          className="az-btn az-btn-outline az-focus flex w-full rounded-full px-4 py-2.5"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="az-pill az-pill-neutral px-2 py-0.5 text-[10px]">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="filters-title-mobile"
          className="fixed inset-0 z-50 flex lg:hidden"
        >
          <div
            aria-hidden="true"
            className="bg-foreground/20 absolute inset-0 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="bg-card relative ml-auto h-full w-80 max-w-[85vw] overflow-y-auto p-6 shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close filters"
              className="az-icon-button az-focus absolute top-4 right-4 p-2"
            >
              <X className="h-5 w-5" />
            </button>
            {renderContent("filters-title-mobile")}
          </div>
        </div>
      )}

      <aside className="hidden w-[280px] shrink-0 lg:block">
        <div className="hide-scrollbar sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {renderContent("filters-title-desktop")}
        </div>
      </aside>
    </>
  );
}
