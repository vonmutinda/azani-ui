import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/site-header";
import { mockCart, mockCategories } from "../fixtures";
import { getCart, getCategories, getCustomer } from "@/lib/medusa-api";

vi.mock("@/lib/medusa-api", () => ({
  getCart: vi.fn(),
  getCategories: vi.fn(),
  getCustomer: vi.fn(),
}));

const allTopCategories = [
  mockCategories[1],
  mockCategories[0],
  {
    id: "pcat_nursery",
    name: "Nursery",
    handle: "nursery",
    rank: 2,
    parent_category_id: null,
    created_at: "",
    updated_at: "",
    category_children: [],
  },
  {
    id: "pcat_baby_gear",
    name: "Baby Gear",
    handle: "baby-gear",
    rank: 3,
    parent_category_id: null,
    created_at: "",
    updated_at: "",
    category_children: [],
  },
  mockCategories[2],
  {
    id: "pcat_toys_books",
    name: "Toys & Books",
    handle: "toys-books",
    rank: 5,
    parent_category_id: null,
    created_at: "",
    updated_at: "",
    category_children: [],
  },
  {
    id: "pcat_mom_maternity",
    name: "Mom & Maternity",
    handle: "mom-maternity",
    rank: 6,
    parent_category_id: null,
    created_at: "",
    updated_at: "",
    category_children: [],
  },
];

function renderHeader(queryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SiteHeader />
    </QueryClientProvider>,
  );
}

describe("SiteHeader", () => {
  beforeEach(() => {
    vi.mocked(getCategories).mockResolvedValue({
      product_categories: allTopCategories,
      count: allTopCategories.length,
      offset: 0,
      limit: 100,
    });
    vi.mocked(getCart).mockResolvedValue(mockCart);
    vi.mocked(getCustomer).mockResolvedValue(null);
  });

  it("renders the boutique header hierarchy and expected category links", async () => {
    renderHeader();

    expect(screen.getAllByText("Free delivery over KSh5,000").length).toBeGreaterThan(0);
    expect(screen.getByText("Safe & certified products")).toBeInTheDocument();
    expect(screen.getByAltText("Azani")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account/login");
    expect(screen.getByRole("link", { name: "Wishlist" })).toHaveAttribute(
      "href",
      "/account/wishlist",
    );
    expect(screen.getByRole("link", { name: "Cart" })).toHaveAttribute("href", "/cart");

    for (const category of [
      "Feeding",
      "Bath & Diapering",
      "Nursery",
      "Baby Gear",
      "Clothing",
      "Toys & Books",
      "Mom & Maternity",
    ]) {
      expect(await screen.findByRole("link", { name: new RegExp(category) })).toBeInTheDocument();
    }
  });

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

  it("shows the hydrated cart quantity from the client cache without changing the cart target", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["cart"], {
      ...mockCart,
      items: [{ ...mockCart.items[0], quantity: 7 }],
    });

    renderHeader(queryClient);

    await waitFor(() => expect(screen.getByText("7")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Cart" })).toHaveAttribute("href", "/cart");
  });

  it("presents the cart as a compact nav control with an overlay count", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["cart"], {
      ...mockCart,
      items: [{ ...mockCart.items[0], quantity: 7 }],
    });

    renderHeader(queryClient);

    const cartLink = screen.getByRole("link", { name: "Cart" });
    expect(cartLink).toHaveClass("w-11");
    expect(cartLink).toHaveClass("rounded-xl");
    expect(cartLink).not.toHaveClass("az-btn-primary");

    const badge = await screen.findByTestId("header-cart-count");
    expect(badge).toHaveTextContent("7");
    expect(badge).toHaveClass("absolute");
    expect(badge).toHaveClass("-top-1");
    expect(badge).toHaveClass("-right-1");
  });

  it("keeps the trust bar slim so the fixed desktop header uses less vertical space", () => {
    renderHeader();

    const trustBar = screen.getByTestId("header-trust-bar");

    expect(trustBar).toHaveClass("h-7");
    expect(trustBar).not.toHaveClass("h-8");
  });

  it("keeps the offer strip compact on mobile and tablet while hiding it on desktop", () => {
    renderHeader();

    const offerStrip = screen.getByTestId("header-offer-strip");

    expect(offerStrip).toHaveClass("border-b");
    expect(offerStrip).toHaveClass("lg:hidden");
    expect(within(offerStrip).getByRole("link", { name: /Diaper deals/i })).toHaveAttribute(
      "href",
      "/products?category=bath-diapering",
    );
    expect(within(offerStrip).getByRole("link", { name: /Newborn checklist/i })).toHaveAttribute(
      "href",
      "/products?category=nursery",
    );
    expect(within(offerStrip).getByRole("link", { name: /Same-day Nairobi/i })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("opens desktop search inline with the header actions", async () => {
    const user = userEvent.setup();
    renderHeader();

    const searchToggle = screen.getByRole("button", { name: "Search" });
    expect(searchToggle).toHaveAttribute("aria-expanded", "false");
    expect(searchToggle).toHaveAttribute("aria-controls", "desktop-product-search");

    await user.click(searchToggle);

    expect(screen.getByRole("button", { name: "Close search" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    const desktopSearch = screen.getByRole("search", { name: "Desktop product search" });
    expect(desktopSearch).toHaveAttribute("id", "desktop-product-search");
    expect(desktopSearch).toBeInTheDocument();
    expect(desktopSearch).toHaveClass("hidden");
    expect(desktopSearch).toHaveClass("lg:flex");
    expect(screen.queryByTestId("desktop-search-below-header")).not.toBeInTheDocument();
  });

  it("opens and closes the mobile menu with category and commerce actions", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const mobileNav = screen.getByRole("navigation", { name: "Mobile navigation" });

    expect(mobileNav).toBeInTheDocument();
    expect(within(mobileNav).getByRole("link", { name: "Cart" })).toHaveAttribute("href", "/cart");
    expect(within(mobileNav).getByRole("link", { name: "Wishlist" })).toHaveAttribute(
      "href",
      "/account/wishlist",
    );
    expect(within(mobileNav).getByRole("link", { name: "Account" })).toHaveAttribute(
      "href",
      "/account/login",
    );
    expect(within(mobileNav).getByRole("link", { name: /Bath & Diapering/ })).toHaveAttribute(
      "href",
      "/products?category=bath-diapering",
    );

    await user.click(screen.getByRole("button", { name: "Close menu" }));

    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();
  });

  it("lets keyboard users move from a desktop category trigger into its mega menu", async () => {
    const user = userEvent.setup();
    renderHeader();

    const bathCategory = await screen.findByRole("link", { name: /Bath & Diapering/ });

    await act(async () => {
      bathCategory.focus();
    });

    const shopAllBath = await screen.findByRole("link", { name: "Shop all Bath & Diapering" });
    await user.tab();

    expect(shopAllBath).toHaveFocus();
  });
});
