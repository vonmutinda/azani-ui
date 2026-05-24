import type { Metadata } from "next";
import { StoreInfoPage } from "@/components/store-info-page";
import { contactPage } from "@/lib/store-info-pages";

export const metadata: Metadata = {
  title: "Contact Azani",
  description: contactPage.description,
};

export default function ContactPage() {
  return <StoreInfoPage page={contactPage} />;
}
