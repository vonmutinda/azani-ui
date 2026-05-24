import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "@/components/site-footer";

describe("SiteFooter", () => {
  it("keeps the footer brand mark compact with a tight clickable target", () => {
    render(<SiteFooter />);

    const brandLink = screen.getByRole("link", { name: "Azani" });
    const logo = screen.getByAltText("Azani");

    expect(brandLink).toHaveClass("block");
    expect(brandLink).toHaveClass("w-fit");
    expect(brandLink).toHaveClass("rounded-md");
    expect(logo).toHaveClass("h-12");
    expect(logo).toHaveClass("sm:h-14");
    expect(logo).not.toHaveClass("h-16");
  });

  it("links to customer policy and contact pages", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("link", { name: "Shipping Policy" })).toHaveAttribute(
      "href",
      "/policies/shipping",
    );
    expect(screen.getByRole("link", { name: "Returns & Exchanges" })).toHaveAttribute(
      "href",
      "/policies/returns",
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/policies/privacy",
    );
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute(
      "href",
      "/policies/terms",
    );
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  });
});
