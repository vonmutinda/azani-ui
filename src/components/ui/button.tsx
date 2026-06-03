import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonVariantOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary/30",
  secondary: "bg-secondary text-white hover:bg-secondary-hover focus-visible:ring-secondary/30",
  ghost: "text-foreground hover:bg-foreground/[0.04] focus-visible:ring-foreground/20",
  danger: "bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger/30",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-sm",
};

/**
 * The single source of truth for button styling. Returns a Tailwind class
 * string, so it works equally on a real `<button>`, a Next `<Link>`, or an `<a>`.
 * Touch-target height lives here so shared actions meet 44px AA by default.
 */
export function buttonVariants({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: ButtonVariantOptions = {}): string {
  return clsx(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariantOptions;

export function Button({ variant, size, fullWidth, className, type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={buttonVariants({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}
