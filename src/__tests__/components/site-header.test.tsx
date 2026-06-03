import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/site-header";
import { renderWithProviders } from "../test-utils";
import { mockCart, mockCategories } from "../fixtures";

const { mockGetCart, mockGetCategories, mockGetCustomer } = vi.hoisted(() => ({
  mockGetCart: vi.fn(),
  mockGetCategories: vi.fn(),
  mockGetCustomer: vi.fn(),
}));

vi.mock("@/lib/medusa-api", () => ({
  getCart: (...args: unknown[]) => mockGetCart(...args),
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}));

describe("SiteHeader", () => {
  it("does not server-render the cart quantity from client cache", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["cart"], {
      ...mockCart,
      items: [{ ...mockCart.items[0], quantity: 7 }],
    });

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <SiteHeader />
      </QueryClientProvider>,
    );

    expect(html).toContain("Cart");
    expect(html).not.toContain(">7</span>");
  });

  it("keeps mobile subcategories collapsed until a category is expanded", async () => {
    const user = userEvent.setup();
    mockGetCategories.mockResolvedValue({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });
    mockGetCart.mockResolvedValue(null);
    mockGetCustomer.mockResolvedValue(null);

    renderWithProviders(<SiteHeader />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const mobileMenu = await screen.findByRole("navigation", { name: "Mobile menu" });
    await waitFor(() =>
      expect(within(mobileMenu).getByText("Bath & Diapering")).toBeInTheDocument(),
    );
    expect(within(mobileMenu).queryByText("Diapers & Pull-Ups")).not.toBeInTheDocument();

    await user.click(within(mobileMenu).getByRole("button", { name: "Expand Bath & Diapering" }));

    expect(within(mobileMenu).getByText("Diapers & Pull-Ups")).toBeInTheDocument();
  });

  it("uses a single desktop categories control instead of overflowing category tabs", async () => {
    const user = userEvent.setup();
    mockGetCategories.mockResolvedValue({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });
    mockGetCart.mockResolvedValue(null);
    mockGetCustomer.mockResolvedValue(null);

    renderWithProviders(<SiteHeader />);

    const categoriesButton = await screen.findByRole("button", { name: "Browse categories" });
    expect(categoriesButton).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Bath & Diapering" })).not.toBeInTheDocument();

    await user.hover(categoriesButton);

    expect(await screen.findByRole("link", { name: "Bath & Diapering" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Shop all" })).toEqual(
      expect.arrayContaining([expect.objectContaining({ href: "http://localhost:3000/products" })]),
    );
  });
});
