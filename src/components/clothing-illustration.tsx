import Image from "next/image";

export type ClothingIllustrationName =
  | "shop"
  | "dress"
  | "shirt"
  | "age"
  | "new"
  | "sale"
  | "trousers"
  | "outfit"
  | "jacket"
  | "sleepwear"
  | "socks";

/** Decorative artwork: the adjacent navigation/category text provides its name. */
export function ClothingIllustration({
  name,
  size = 36,
  className = "",
}: {
  name: ClothingIllustrationName;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={`/images/icons/enamel/${name}.webp`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      unoptimized
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
