"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { CategoryIcon } from "@/components/category-icon";
import {
  collectCategoryIds,
  findMedusaCategory,
  getCategoryIcon,
  TOP_LEVEL_HANDLES,
} from "@/lib/categories";
import { resolveProductImage } from "@/lib/formatters";
import type { MedusaProduct, MedusaProductCategory } from "@/types/medusa";

type Props = {
  categories: MedusaProductCategory[];
  products: MedusaProduct[];
  selectedHandles: string[];
  onSelect: (handle: string) => void;
};

export function CatalogueCategories({ categories, products, selectedHandles, onSelect }: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const selection = selectedHandles.join(",");
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

  useEffect(() => {
    const rail = railRef.current;
    const selectedShortcut = rail?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!rail || !selectedShortcut) return;
    // Reveal the selection within the rail without moving the page vertically.
    const railBounds = rail.getBoundingClientRect();
    const shortcutBounds = selectedShortcut.getBoundingClientRect();
    if (shortcutBounds.left < railBounds.left) {
      rail.scrollLeft -= railBounds.left - shortcutBounds.left;
    } else if (shortcutBounds.right > railBounds.right) {
      rail.scrollLeft += shortcutBounds.right - railBounds.right;
    }
  }, [selection, categories]);

  if (shortcuts.length === 0) return null;

  return (
    <section aria-label="Shop by garment" className="mb-5">
      <div ref={railRef} className="flex gap-2.5 overflow-x-auto pb-2">
        {shortcuts.map((category) => {
          const categoryIds = new Set(collectCategoryIds(category));
          const image = products
            .filter((product) => product.categories?.some((entry) => categoryIds.has(entry.id)))
            .map(resolveProductImage)
            .find(Boolean);
          const isSelected = selectedHandles.includes(category.handle);
          return (
            <button
              key={category.id}
              type="button"
              aria-label={`Browse ${category.name}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(category.handle)}
              className={`group focus-visible:ring-primary flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl border p-2 text-center text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-28 ${isSelected ? "border-primary bg-primary-light text-primary" : "border-border text-foreground hover:border-primary bg-white"}`}
            >
              <span className="bg-background relative flex h-16 w-full items-center justify-center overflow-hidden rounded-lg sm:h-20">
                {image ? (
                  <Image src={image} alt="" fill sizes="96px" className="object-cover" />
                ) : (
                  <CategoryIcon
                    icon={getCategoryIcon(category.handle)}
                    size={26}
                    className="text-muted"
                  />
                )}
              </span>
              <span className="my-auto">{category.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
