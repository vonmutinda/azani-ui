"use client";

import { Check } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { ClothingIllustration } from "@/components/clothing-illustration";
import { findMedusaCategory, getCategoryIcon, TOP_LEVEL_HANDLES } from "@/lib/categories";
import type { MedusaProductCategory } from "@/types/medusa";

type Props = {
  categories: MedusaProductCategory[];
  selectedHandles: string[];
  onSelect: (handle: string) => void;
  onClear: () => void;
};

export function CatalogueCategories({ categories, selectedHandles, onSelect, onClear }: Props) {
  const selected = selectedHandles.flatMap((handle) => {
    const category = findMedusaCategory(categories, handle);
    return category ? [category] : [];
  });
  const shortcuts = Array.from(
    new Map(
      [
        ...categories.filter(
          (category) => !category.parent_category_id && TOP_LEVEL_HANDLES.includes(category.handle),
        ),
        ...(selected.length === 1 ? (selected[0].category_children ?? []) : []),
        ...selected,
      ].map((category) => [category.id, category]),
    ).values(),
  );
  if (!shortcuts.length) return null;

  const rowClass = (active: boolean) =>
    `group flex min-h-12 w-full items-center gap-3 rounded-xl border px-2.5 py-1.5 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none ${active ? "border-primary/25 bg-primary-light text-primary" : "border-transparent text-foreground hover:bg-background hover:border-border"}`;
  const marker = (active: boolean) =>
    active && <Check aria-hidden="true" className="ml-auto h-4 w-4 shrink-0" />;
  return (
    <section aria-label="Shop by garment">
      <h3 className="text-foreground mb-2 text-sm font-bold">Category</h3>
      <div className="space-y-1">
        <button
          type="button"
          aria-label="Browse all clothing"
          aria-pressed={!selectedHandles.length}
          onClick={onClear}
          className={rowClass(!selectedHandles.length)}
        >
          <ClothingIllustration name="shop" size={34} />
          <span>All clothing</span>
          {marker(!selectedHandles.length)}
        </button>
        {shortcuts.map((category) => {
          const active = selectedHandles.includes(category.handle);
          return (
            <button
              key={category.id}
              type="button"
              aria-label={`Browse ${category.name}`}
              aria-pressed={active}
              onClick={() => onSelect(category.handle)}
              className={rowClass(active)}
            >
              <CategoryIcon icon={getCategoryIcon(category.handle)} size={34} />
              <span className="leading-snug">{category.name}</span>
              {marker(active)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
