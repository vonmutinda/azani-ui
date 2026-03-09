import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review the items in your shopping cart before checkout.",
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
