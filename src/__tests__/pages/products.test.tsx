import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductsPage from "@/app/products/page";
import { renderWithProviders } from "../test-utils";
import { mockProduct, mockCategories } from "../fixtures";

const mockGetProducts = vi.fn();
const mockGetCategories = vi.fn();

vi.mock("@/lib/medusa-api", () => ({
  getProducts: (...args: unknown[]) => mockGetProducts(...args),
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
  getCart: vi.fn().mockResolvedValue(null),
  getWishlistProductIds: vi.fn().mockResolvedValue([]),
  toggleWishlistProduct: vi.fn(),
  addToCart: vi.fn(),
}));

// Override the global next/navigation mock with a controllable searchParams so
// we can exercise the category-filter wiring.
const { searchParamsRef, mockRouterPush } = vi.hoisted(() => ({
  searchParamsRef: { current: new URLSearchParams() },
  mockRouterPush: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/products",
  useSearchParams: () => searchParamsRef.current,
  useParams: () => ({}),
}));

beforeEach(() => {
  vi.clearAllMocks();
  searchParamsRef.current = new URLSearchParams();
  mockRouterPush.mockReset();
});

describe("ProductsPage", () => {
  it("renders the products heading", async () => {
    mockGetProducts.mockResolvedValueOnce({
      products: [mockProduct],
      count: 1,
      offset: 0,
      limit: 20,
    });
    mockGetCategories.mockResolvedValueOnce({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });

    renderWithProviders(<ProductsPage />);
    await waitFor(() => {
      expect(screen.getByText("All Products")).toBeInTheDocument();
    });
  });

  it("renders product cards when products are loaded", async () => {
    mockGetProducts.mockResolvedValueOnce({
      products: [mockProduct],
      count: 1,
      offset: 0,
      limit: 20,
    });
    mockGetCategories.mockResolvedValueOnce({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });

    renderWithProviders(<ProductsPage />);
    await waitFor(() => {
      expect(screen.getByText("Pampers Baby Dry Diapers")).toBeInTheDocument();
    });
  });

  it("renders empty state when no products", async () => {
    mockGetProducts.mockResolvedValueOnce({ products: [], count: 0, offset: 0, limit: 20 });
    mockGetCategories.mockResolvedValueOnce({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });

    renderWithProviders(<ProductsPage />);
    await waitFor(() => {
      expect(screen.getByText(/no products/i)).toBeInTheDocument();
    });
  });

  it("renders filter sidebar", async () => {
    mockGetProducts.mockResolvedValueOnce({
      products: [mockProduct],
      count: 1,
      offset: 0,
      limit: 20,
    });
    mockGetCategories.mockResolvedValueOnce({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });

    renderWithProviders(<ProductsPage />);
    await waitFor(() => {
      expect(screen.getAllByText("Filters").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("filters by multiple selected categories (server-side OR via category_id)", async () => {
    searchParamsRef.current = new URLSearchParams("category=feeding,clothing");
    mockGetCategories.mockResolvedValue({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });
    mockGetProducts.mockResolvedValue({ products: [mockProduct], count: 1, offset: 0, limit: 20 });

    renderWithProviders(<ProductsPage />);

    // Both selected handles resolve to their ids and are passed as a category_id
    // array — a server-side OR across the two categories.
    await waitFor(() => {
      expect(mockGetProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          category_id: expect.arrayContaining(["pcat_feeding", "pcat_clothing"]),
        }),
      );
    });
  });

  it("labels the results as selected categories when multiple categories are active", async () => {
    searchParamsRef.current = new URLSearchParams("category=feeding,clothing");
    mockGetCategories.mockResolvedValue({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });
    mockGetProducts.mockResolvedValue({ products: [mockProduct], count: 1, offset: 0, limit: 20 });

    renderWithProviders(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Selected categories" })).toBeInTheDocument();
    });
  });

  it("adds a subcategory chip to the existing category filter", async () => {
    searchParamsRef.current = new URLSearchParams("category=bath-diapering");
    mockGetCategories.mockResolvedValue({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });
    mockGetProducts.mockResolvedValue({ products: [mockProduct], count: 1, offset: 0, limit: 20 });

    renderWithProviders(<ProductsPage />);

    const chip = await screen.findByRole("button", { name: "Browse Diapers & Pull-Ups" });
    await userEvent.click(chip);

    expect(mockRouterPush).toHaveBeenCalledWith(
      "/products?category=bath-diapering%2Cdiapers-pull-ups",
    );
  });

  it("filters the current product page by brand metadata", async () => {
    const otherProduct = {
      ...mockProduct,
      id: "prod_02",
      title: "WaterWipes Baby Wipes",
      metadata: { ...mockProduct.metadata, brand: "WaterWipes", age_stage: "Newborn+" },
    };
    searchParamsRef.current = new URLSearchParams("brand=Pampers");
    mockGetCategories.mockResolvedValue({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });
    mockGetProducts.mockResolvedValue({
      products: [mockProduct, otherProduct],
      count: 2,
      offset: 0,
      limit: 20,
    });

    renderWithProviders(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText("Pampers Baby Dry Diapers")).toBeInTheDocument();
      expect(screen.queryByText("WaterWipes Baby Wipes")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Brand: Pampers")).toBeInTheDocument();
  });

  it("writes brand and stage facets into the product query string", async () => {
    mockGetProducts.mockResolvedValue({ products: [mockProduct], count: 1, offset: 0, limit: 20 });
    mockGetCategories.mockResolvedValue({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });

    renderWithProviders(<ProductsPage />);

    await screen.findByText("Pampers Baby Dry Diapers");
    await userEvent.click(screen.getByRole("checkbox", { name: /Pampers/i }));

    expect(mockRouterPush).toHaveBeenCalledWith("/products?brand=Pampers");
  });

  it("filters by multiple brands as an OR over the window", async () => {
    const waterwipes = {
      ...mockProduct,
      id: "prod_ww",
      title: "WaterWipes Baby Wipes",
      metadata: { ...mockProduct.metadata, brand: "WaterWipes" },
    };
    const chicco = {
      ...mockProduct,
      id: "prod_ch",
      title: "Chicco Convertible Car Seat",
      metadata: { ...mockProduct.metadata, brand: "Chicco" },
    };
    searchParamsRef.current = new URLSearchParams("brand=Pampers,WaterWipes");
    mockGetCategories.mockResolvedValue({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });
    mockGetProducts.mockResolvedValue({
      products: [mockProduct, waterwipes, chicco],
      count: 3,
      offset: 0,
      limit: 100,
    });

    renderWithProviders(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText("Pampers Baby Dry Diapers")).toBeInTheDocument();
      expect(screen.getByText("WaterWipes Baby Wipes")).toBeInTheDocument();
    });
    // Chicco is excluded — its brand isn't in the selection.
    expect(screen.queryByText("Chicco Convertible Car Seat")).not.toBeInTheDocument();
    // One removable chip per selected brand value.
    expect(screen.getByText("Brand: Pampers")).toBeInTheDocument();
    expect(screen.getByText("Brand: WaterWipes")).toBeInTheDocument();
  });

  it("adds a second brand to the query string as a comma-joined list", async () => {
    const waterwipes = {
      ...mockProduct,
      id: "prod_ww",
      title: "WaterWipes Baby Wipes",
      metadata: { ...mockProduct.metadata, brand: "WaterWipes" },
    };
    searchParamsRef.current = new URLSearchParams("brand=Pampers");
    mockGetCategories.mockResolvedValue({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });
    mockGetProducts.mockResolvedValue({
      products: [mockProduct, waterwipes],
      count: 2,
      offset: 0,
      limit: 100,
    });

    renderWithProviders(<ProductsPage />);

    await screen.findByText("Pampers Baby Dry Diapers");
    // The WaterWipes option stays available even though it's filtered out of the grid.
    await userEvent.click(screen.getByRole("checkbox", { name: /WaterWipes/i }));

    expect(mockRouterPush).toHaveBeenCalledWith("/products?brand=Pampers%2CWaterWipes");
  });
});
