import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your Kokob Baby Shop account, orders, addresses, and wishlist.",
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
