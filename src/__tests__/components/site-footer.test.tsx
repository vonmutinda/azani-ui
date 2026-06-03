import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "@/components/site-footer";
import { renderWithProviders } from "../test-utils";

describe("SiteFooter", () => {
  it("does not show payment reassurance in the footer", () => {
    renderWithProviders(<SiteFooter />);

    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText("hello@azani.shop")).toBeInTheDocument();
    expect(within(footer).getByText(/follow us/i)).toBeInTheDocument();
    expect(within(footer).queryByText("M-Pesa accepted")).not.toBeInTheDocument();
    expect(within(footer).queryByText("Secure mobile checkout")).not.toBeInTheDocument();
  });
});
