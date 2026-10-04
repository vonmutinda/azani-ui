import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Kids Clothing",
  description:
    "Browse Azani kids clothing for ages 2–12 by garment type, audience, age, size and colour.",
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
