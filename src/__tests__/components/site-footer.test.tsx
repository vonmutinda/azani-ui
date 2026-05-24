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
});
