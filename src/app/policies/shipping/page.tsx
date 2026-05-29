import type { Metadata } from "next";
import { StoreInfoPage } from "@/components/store-info-page";
import { policyPages } from "@/lib/store-info-pages";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: policyPages.shipping.description,
};

export default function ShippingPolicyPage() {
  return <StoreInfoPage page={policyPages.shipping} />;
}
