"use client";

import { ChevronDown, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useState, useEffect, useCallback, useRef, useId } from "react";
import { MedusaProductCategory } from "@/types/medusa";
import {
  toCategory,
  Category,
  TOP_LEVEL_HANDLES,
  parseCategoryParam,
  serializeCategoryParam,
} from "@/lib/categories";
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
  facets?: { sizes: string[]; colours: string[] };
  resultCount?: number;
  isUpdating?: boolean;
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
            className="text-muted hover:text-foreground focus-visible:ring-primary flex h-11 w-8 shrink-0 items-center justify-center rounded-lg transition focus-visible:ring-2 focus-visible:outline-none"
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
  facets,
  resultCount,
  isUpdating = false,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerId = useId();

  const topCategories = categories
    .filter((c) => !c.parent_category_id && TOP_LEVEL_HANDLES.includes(c.handle))
    .map(toCategory);

  const selectedHandles = parseCategoryParam(
    typeof filters.category === "string" ? filters.category : undefined,
  );

  const activeFilterCount =
    selectedHandles.length +
    Object.entries(filters).filter(([key, value]) => {
      if (key === "category") return false;
      return value !== undefined && value !== "";
    }).length;

  const setFilter = useCallback(
    (key: string, value: string | number | undefined) => {
      onFilterChange({ ...filters, [key]: value });
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

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const focusableElements = () =>
      Array.from(
        mobileDrawerRef.current?.querySelectorAll<HTMLElement>(
          ':is(button, select, input, a[href], [tabindex="0"]):not(:disabled)',
        ) ?? [],
      );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
      }
      if (event.key !== "Tab") return;
      const controls = focusableElements();
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const keepFocusInDrawer = (event: FocusEvent) => {
      if (event.target instanceof Node && !mobileDrawerRef.current?.contains(event.target)) {
        closeButtonRef.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const handleViewportChange = () => {
      if (desktop.matches) setMobileOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", keepFocusInDrawer);
    desktop.addEventListener("change", handleViewportChange);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", keepFocusInDrawer);
      desktop.removeEventListener("change", handleViewportChange);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [mobileOpen]);

  const content = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
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
                audience: undefined,
                age: undefined,
                size: undefined,
                colour: undefined,
                sale: undefined,
              })
            }
            className="text-muted hover:text-foreground min-h-11 rounded-lg px-1 py-1 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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

      <div className="space-y-3 border-t pt-4">
        {[
          {
            key: "audience",
            label: "Shop for",
            values: [
              ["girls", "Girls"],
              ["boys", "Boys"],
            ],
          },
          {
            key: "age",
            label: "Age",
            values: [
              ["2-4", "2–4 years"],
              ["5-8", "5–8 years"],
              ["9-12", "9–12 years"],
            ],
          },
          {
            key: "size",
            label: "Size",
            values: (facets?.sizes ?? []).map((value) => [value, value]),
          },
          {
            key: "colour",
            label: "Colour",
            values: (facets?.colours ?? []).map((value) => [value, value]),
          },
        ].map(({ key, label, values }) => (
          <label key={key} className="block text-sm font-medium">
            {label}
            <select
              aria-label={label}
              value={String(filters[key] ?? "")}
              onChange={(event) => setFilter(key, event.target.value || undefined)}
              className="border-border focus-visible:ring-primary mt-1 block min-h-11 w-full rounded-lg border bg-white px-2.5 py-2 focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="">
                All {label === "Shop for" ? "children" : label.toLowerCase() + "s"}
              </option>
              {Array.from(
                new Set([
                  ...values.map(([v]) => v),
                  ...(filters[key] ? [String(filters[key])] : []),
                ]),
              ).map((value) => (
                <option key={value} value={value}>
                  {values.find(([v]) => v === value)?.[1] ?? value}
                </option>
              ))}
            </select>
          </label>
        ))}
        <p className="text-muted text-xs">
          Age is a guide. Check the product’s size information before choosing.
        </p>
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
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-expanded={mobileOpen}
        aria-controls={mobileOpen ? drawerId : undefined}
        className="border-border text-foreground hover:bg-foreground/[0.04] flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border bg-white px-3 py-2.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:hidden"
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
        <div className="fixed inset-0 z-[70] flex lg:hidden">
          <div
            data-testid="filters-drawer-backdrop"
            className="bg-foreground/20 absolute inset-0 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div
            ref={mobileDrawerRef}
            id={drawerId}
            role="dialog"
            aria-label="Filters"
            aria-modal="true"
            aria-describedby={`${drawerId}-description`}
            tabIndex={-1}
            className="bg-card relative mr-auto flex h-dvh w-96 max-w-[92vw] flex-col shadow-xl focus-visible:outline-none"
          >
            <div className="border-border flex shrink-0 items-center justify-between border-b px-5 py-3">
              <h2 className="text-lg font-semibold">Refine your selection</h2>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close filters"
                onClick={() => setMobileOpen(false)}
                className="text-muted hover:text-foreground focus-visible:ring-primary flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <X className="h-4 w-4" /> Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <p id={`${drawerId}-description`} className="text-muted mb-4 text-xs">
                Filters update as you choose. Show items to return to the collection.
              </p>
              {content}
            </div>
            <div className="border-border shrink-0 border-t bg-white px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setMobileOpen(false)}
                className="bg-primary hover:bg-primary-hover focus-visible:ring-primary min-h-11 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-70"
              >
                {isUpdating
                  ? "Updating items…"
                  : resultCount === undefined
                    ? "Show items"
                    : `Show ${resultCount} item${resultCount === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <aside
        aria-label="Product filters"
        aria-hidden={mobileOpen || undefined}
        inert={mobileOpen}
        className="hidden w-52 shrink-0 lg:row-span-2 lg:block"
      >
        <div className="sticky top-36 max-h-[calc(100dvh-10rem)] overflow-y-auto pr-2">
          {!mobileOpen && content}
        </div>
      </aside>
    </>
  );
}
