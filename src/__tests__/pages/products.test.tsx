import { beforeEach, describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductsPage from "@/app/products/page";
import { renderWithProviders } from "../test-utils";
import { mockProduct, mockCategory, mockCategories } from "../fixtures";

const mockGetProducts = vi.fn();
const mockGetCategories = vi.fn();
const mockGetCategoryByHandle = vi.fn();
const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationMocks.push,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => navigationMocks.searchParams,
}));

vi.mock("@/lib/medusa-api", () => ({
  getProducts: (...args: unknown[]) => mockGetProducts(...args),
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
  getCategoryByHandle: (...args: unknown[]) => mockGetCategoryByHandle(...args),
  getCart: vi.fn().mockResolvedValue(null),
  getWishlistProductIds: vi.fn().mockResolvedValue([]),
  toggleWishlistProduct: vi.fn(),
  addToCart: vi.fn(),
}));

describe("ProductsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationMocks.searchParams = new URLSearchParams();
    mockGetCategoryByHandle.mockResolvedValue(null);
  });

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
    expect(screen.getByText("Clear filters and browse all products")).toBeInTheDocument();
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

  it("renders a category header with child category navigation", async () => {
    navigationMocks.searchParams = new URLSearchParams("category=bath-diapering");
    mockGetCategoryByHandle.mockResolvedValueOnce(mockCategory);
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
      expect(screen.getByRole("heading", { name: "Bath & Diapering" })).toBeInTheDocument();
    });
    expect(screen.getByText("Everything for bath time and diaper changes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse Diapers & Pull-Ups" })).toBeInTheDocument();
  });

  it("passes category descendants and sort order to the products request", async () => {
    navigationMocks.searchParams = new URLSearchParams("category=bath-diapering&sort=newest");
    mockGetCategoryByHandle.mockResolvedValueOnce(mockCategory);
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
      expect(mockGetProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          category_id: ["pcat_bath_diapering", "pcat_diapers", "pcat_wipes"],
          order: "-created_at",
        }),
      );
    });
  });

  it("updates shareable query state when sort changes", async () => {
    const user = userEvent.setup();
    navigationMocks.searchParams = new URLSearchParams("category=feeding&q=bottle&page=3");
    mockGetProducts.mockResolvedValueOnce({
      products: [mockProduct],
      count: 1,
      offset: 40,
      limit: 20,
    });
    mockGetCategories.mockResolvedValueOnce({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });

    renderWithProviders(<ProductsPage />);

    await user.selectOptions(await screen.findByLabelText("Sort products"), "price_asc");

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/products?category=feeding&q=bottle&sort=price_asc",
    );
  });

  it("clears filters from the empty state recovery action", async () => {
    const user = userEvent.setup();
    navigationMocks.searchParams = new URLSearchParams(
      "q=notfound&category=feeding&sort=price_desc",
    );
    mockGetProducts.mockResolvedValueOnce({ products: [], count: 0, offset: 0, limit: 20 });
    mockGetCategories.mockResolvedValueOnce({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });

    renderWithProviders(<ProductsPage />);

    await user.click(
      await screen.findByRole("button", { name: "Clear filters and browse all products" }),
    );

    expect(navigationMocks.push).toHaveBeenCalledWith("/products");
  });
});
