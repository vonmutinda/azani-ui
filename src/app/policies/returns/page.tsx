import type { Metadata } from "next";
import { StoreInfoPage } from "@/components/store-info-page";
import { policyPages } from "@/lib/store-info-pages";

export const metadata: Metadata = {
  title: "Returns & Exchanges",
  description: policyPages.returns.description,
};

export default function ReturnsPolicyPage() {
  return <StoreInfoPage page={policyPages.returns} />;
}
