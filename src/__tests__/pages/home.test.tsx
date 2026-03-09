import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import Home from "@/app/page";
import { renderWithProviders } from "../test-utils";

vi.mock("@/lib/medusa-api", () => ({
  getCart: vi.fn().mockResolvedValue(null),
  getWishlistProductIds: vi.fn().mockResolvedValue([]),
  addToCart: vi.fn(),
  toggleWishlistProduct: vi.fn(),
  getProducts: vi.fn().mockResolvedValue({
    products: [
      {
        id: "prod_01",
        title: "Pampers Baby Dry Diapers",
        handle: "pampers-baby-dry",
        status: "published",
        is_giftcard: false,
        discountable: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        thumbnail: "https://example.com/pampers.jpg",
        variants: [
          {
            id: "variant_01",
            title: "24 Count",
            prices: [{ id: "p1", amount: 1500, currency_code: "usd" }],
          },
        ],
      },
    ],
    count: 1,
    offset: 0,
    limit: 8,
  }),
  getCategories: vi.fn().mockResolvedValue({
    product_categories: [
      {
        id: "pcat_feeding",
        name: "Feeding",
        handle: "feeding",
        description: "Everything for feeding your little one",
        rank: 0,
        parent_category_id: null,
        created_at: "",
        updated_at: "",
        category_children: [],
      },
    ],
    count: 1,
    offset: 0,
    limit: 100,
  }),
}));

describe("Home Page", () => {
  it("renders the hero section", () => {
    renderWithProviders(<Home />);
    expect(screen.getByText(/Everything Your/i)).toBeInTheDocument();
    expect(screen.getByText("Little One")).toBeInTheDocument();
  });

  it("renders 'Shop Now' link", () => {
    renderWithProviders(<Home />);
    const shopNow = screen.getByText("Shop Now");
    expect(shopNow.closest("a")).toHaveAttribute("href", "/products");
  });

  it("renders explore collection section heading", () => {
    renderWithProviders(<Home />);
    expect(screen.getByText("Explore Our Collection")).toBeInTheDocument();
  });

  it("renders shop by category section heading", () => {
    renderWithProviders(<Home />);
    expect(screen.getByText("Shop by Category")).toBeInTheDocument();
  });

  it("renders feature bar items", () => {
    renderWithProviders(<Home />);
    expect(screen.getByText("Free Shipping")).toBeInTheDocument();
    expect(screen.getByText("Safe Products")).toBeInTheDocument();
    expect(screen.getByText("Same-Day Express")).toBeInTheDocument();
    expect(screen.getByText("Expert Support")).toBeInTheDocument();
  });

  it("loads and renders product cards", async () => {
    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getAllByText("Pampers Baby Dry Diapers").length).toBeGreaterThan(0);
    });
  });

  it("loads and renders categories", async () => {
    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Feeding")).toBeInTheDocument();
    });
  });

  it("renders promotional banners", () => {
    renderWithProviders(<Home />);
    expect(screen.getByText("Adorable Baby Clothing")).toBeInTheDocument();
    expect(screen.getByText("Feeding Essentials")).toBeInTheDocument();
  });
});
