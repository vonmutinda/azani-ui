import { ClothingIllustration } from "@/components/clothing-illustration";

type Props = { name: "shop" | "girls" | "boys" | "age" | "new" | "sale"; className?: string };

/** Decorative illustrations; the adjacent navigation label supplies the name. */
export function ShopNavIcon({ name, className = "" }: Props) {
  return (
    <ClothingIllustration
      name={name === "girls" ? "dress" : name === "boys" ? "shirt" : name}
      className={className}
    />
  );
}
