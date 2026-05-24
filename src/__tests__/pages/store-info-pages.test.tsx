import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ShippingPolicyPage from "@/app/policies/shipping/page";
import ReturnsPolicyPage from "@/app/policies/returns/page";
import PrivacyPolicyPage from "@/app/policies/privacy/page";
import TermsPolicyPage from "@/app/policies/terms/page";
import ContactPage from "@/app/contact/page";

describe("store information pages", () => {
  it("renders the shipping policy with Azani delivery details", () => {
    render(<ShippingPolicyPage />);

    expect(screen.getByRole("heading", { name: "Shipping Policy" })).toBeInTheDocument();
    expect(
      screen.getByText(/Free delivery is available for orders over KSh5,000/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Nairobi and delivery across Kenya/i).length).toBeGreaterThan(0);
  });

  it("renders the returns policy with hygiene-sensitive exclusions", () => {
    render(<ReturnsPolicyPage />);

    expect(screen.getByRole("heading", { name: "Returns & Exchanges" })).toBeInTheDocument();
    expect(screen.getByText(/within 3 days of delivery/i)).toBeInTheDocument();
    expect(
      screen.getByText(/opened feeding, bath, diapering, or personal-care items/i),
    ).toBeInTheDocument();
  });

  it("renders the privacy policy with customer data usage", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
    expect(
      screen.getByText(/order processing, delivery, support, fraud prevention/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/We do not sell customer personal information/i)).toBeInTheDocument();
  });

  it("keeps policy pages compact enough for first-screen content", () => {
    render(<PrivacyPolicyPage />);

    const backLink = screen.getByRole("link", { name: /Back to home/i });
    const article = backLink.closest("article");
    const quickFacts = screen.getByLabelText("Privacy Policy quick facts");

    expect(article).toHaveClass("py-6");
    expect(article).toHaveClass("lg:py-8");
    expect(backLink).toHaveClass("mb-5");
    expect(quickFacts).toHaveClass("mt-6");
    expect(screen.getByTestId("store-info-content")).toHaveClass("mt-8");
  });

  it("renders terms with ordering and payment expectations", () => {
    render(<TermsPolicyPage />);

    expect(screen.getByRole("heading", { name: "Terms of Service" })).toBeInTheDocument();
    expect(
      screen.getByText(/M-Pesa, card, or supported mobile-money payment/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Orders are confirmed after payment is received/i)).toBeInTheDocument();
  });

  it("renders contact options for customer support", () => {
    render(<ContactPage />);

    expect(screen.getByRole("heading", { name: "Contact Azani" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Call Azani/i })).toHaveAttribute(
      "href",
      "tel:+254700000000",
    );
    expect(screen.getByRole("link", { name: /Email Azani/i })).toHaveAttribute(
      "href",
      "mailto:hello@azani.shop",
    );
  });
});
