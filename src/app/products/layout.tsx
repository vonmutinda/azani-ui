import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse our full range of baby products — diapers, feeding essentials, clothing, toys, and more.",
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
