import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order — enter shipping details and confirm payment.",
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
