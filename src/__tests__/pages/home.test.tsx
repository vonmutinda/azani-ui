import { beforeEach, describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import Home from "@/app/page";
import { getProducts } from "@/lib/medusa-api";
import { renderWithProviders } from "../test-utils";

const clothingProduct = {
  id: "prod_01",
  title: "Kids Cotton T-Shirt",
  handle: "kids-cotton-t-shirt",
  status: "published",
  is_giftcard: false,
  discountable: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  thumbnail: "https://example.com/t-shirt.jpg",
  variants: [
    {
      id: "variant_01",
      title: "Size 5–6",
      prices: [{ id: "p1", amount: 1500, currency_code: "kes" }],
    },
  ],
};

const productResponse = {
  products: [clothingProduct],
  count: 1,
  offset: 0,
  limit: 8,
};

vi.mock("@/lib/medusa-api", () => ({
  getCart: vi.fn().mockResolvedValue(null),
  getWishlistProductIds: vi.fn().mockResolvedValue([]),
  addToCart: vi.fn(),
  toggleWishlistProduct: vi.fn(),
  getProducts: vi.fn(),
  getCategories: vi.fn().mockResolvedValue({
    product_categories: [
      {
        id: "pcat_tops",
        name: "Tops",
        handle: "tops",
        description: "Kids tops",
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
  beforeEach(() => {
    vi.mocked(getProducts).mockResolvedValue(productResponse);
  });

  it("introduces clothing for kids ages 2–12", () => {
    renderWithProviders(<Home />);
    expect(
      screen.getByRole("heading", { name: "Little clothes. Big adventures." }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/ages 2–12/i).length).toBeGreaterThan(0);
  });

  it("links each age group to the matching catalogue filter", () => {
    renderWithProviders(<Home />);
    for (const [label, age] of [
      ["2–4 years", "2-4"],
      ["5–8 years", "5-8"],
      ["9–12 years", "9-12"],
    ]) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toHaveAttribute(
        "href",
        `/products?age=${age}`,
      );
    }
  });

  it("requests new arrivals in newest order", async () => {
    renderWithProviders(<Home />);
    await waitFor(() => expect(getProducts).toHaveBeenCalledWith({ limit: 8, sort: "newest" }));
  });

  it("renders 'Shop Now' link", () => {
    renderWithProviders(<Home />);
    const shopNow = screen.getByText("Shop Now");
    expect(shopNow.closest("a")).toHaveAttribute("href", "/products");
  });

  it("renders explore collection section heading", () => {
    renderWithProviders(<Home />);
    expect(screen.getByText("New arrivals")).toBeInTheDocument();
  });

  it("renders shop by category section heading", async () => {
    renderWithProviders(<Home />);
    expect(await screen.findByText("Shop by Category")).toBeInTheDocument();
  });

  it("renders feature bar items", () => {
    renderWithProviders(<Home />);
    expect(screen.getByText("See delivery options and costs at checkout.")).toBeInTheDocument();
    expect(
      screen.getByText("Check the size guide on each product before choosing."),
    ).toBeInTheDocument();
  });

  it("loads and renders product cards", async () => {
    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getAllByText("Kids Cotton T-Shirt").length).toBeGreaterThan(0);
    });
  });

  it("loads and renders categories", async () => {
    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Tops")).toBeInTheDocument();
    });
  });

  it("renders promotional banners", () => {
    renderWithProviders(<Home />);
    expect(screen.getByText("Shop Girls")).toBeInTheDocument();
    expect(screen.getByText("Shop Boys")).toBeInTheDocument();
  });

  it("links New In and audience destinations to the clothing filters", () => {
    renderWithProviders(<Home />);

    expect(screen.getByRole("link", { name: /new in/i })).toHaveAttribute(
      "href",
      "/products?sort=newest",
    );
    expect(screen.getByRole("link", { name: "Shop Girls" })).toHaveAttribute(
      "href",
      "/products?audience=girls",
    );
    expect(screen.getByRole("link", { name: "Shop Boys" })).toHaveAttribute(
      "href",
      "/products?audience=boys",
    );
  });

  it("shows an accurate message when no clothing is available", async () => {
    vi.mocked(getProducts).mockResolvedValue({ products: [], count: 0, offset: 0, limit: 8 });
    renderWithProviders(<Home />);

    expect(
      await screen.findByText("No clothing is available right now. Please check back soon."),
    ).toBeInTheDocument();
  });
});
