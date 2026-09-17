import { Ruler, Shirt, ShoppingBag, Sparkles, Tag } from "lucide-react";

import { GarmentIcon } from "@/components/garment-icon";

type Props = { name: "shop" | "girls" | "boys" | "age" | "new" | "sale"; className?: string };

/** Decorative illustrations; the adjacent navigation label supplies the name. */
export function ShopNavIcon({ name, className = "" }: Props) {
  if (name === "girls") {
    return <GarmentIcon name="dress" className={`text-primary ${className}`} />;
  }
  const icons = { shop: ShoppingBag, boys: Shirt, age: Ruler, new: Sparkles, sale: Tag };
  const colors = {
    shop: "text-secondary",
    boys: "text-secondary",
    age: "text-success-ink",
    new: "text-accent-yellow-ink",
    sale: "text-primary",
  };
  const Icon = icons[name];
  return <Icon aria-hidden="true" strokeWidth={1.5} className={`${colors[name]} ${className}`} />;
}
