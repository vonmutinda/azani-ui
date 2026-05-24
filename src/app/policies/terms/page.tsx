import type { Metadata } from "next";
import { StoreInfoPage } from "@/components/store-info-page";
import { policyPages } from "@/lib/store-info-pages";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: policyPages.terms.description,
};

export default function TermsPolicyPage() {
  return <StoreInfoPage page={policyPages.terms} />;
}
