import type { Metadata } from "next";
import { StoreInfoPage } from "@/components/store-info-page";
import { policyPages } from "@/lib/store-info-pages";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: policyPages.privacy.description,
};

export default function PrivacyPolicyPage() {
  return <StoreInfoPage page={policyPages.privacy} />;
}
