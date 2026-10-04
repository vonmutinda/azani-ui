import Image from "next/image";

export function BrandLogo({
  className,
  placement = "header",
}: {
  className?: string;
  placement?: "header" | "footer";
}) {
  return (
    <Image
      src="/images/brand/full-logo-cutout.png"
      alt="Azani"
      width={1337}
      height={758}
      priority={placement === "header"}
      className={
        className ??
        (placement === "footer"
          ? "h-32 w-48 object-contain"
          : "h-16 w-28 object-contain sm:h-22 sm:w-40")
      }
    />
  );
}
