import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductsPage from "@/app/products/page";
import { renderWithProviders } from "../test-utils";
import { mockProduct } from "../fixtures";
import { clothingCategories as mockCategories } from "../clothing-fixtures";

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
      expect(screen.getByText("All Clothing")).toBeInTheDocument();
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
    searchParamsRef.current = new URLSearchParams("category=bottoms,sleepwear");
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
          category_id: expect.arrayContaining(["pcat_bottoms", "pcat_sleepwear"]),
        }),
      );
    });
  });

  it("labels the results as selected categories when multiple categories are active", async () => {
    searchParamsRef.current = new URLSearchParams("category=bottoms,sleepwear");
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
    searchParamsRef.current = new URLSearchParams("category=tops");
    mockGetCategories.mockResolvedValue({
      product_categories: mockCategories,
      count: 3,
      offset: 0,
      limit: 100,
    });
    mockGetProducts.mockResolvedValue({ products: [mockProduct], count: 1, offset: 0, limit: 20 });

    renderWithProviders(<ProductsPage />);

    const chip = await screen.findByRole("button", { name: "Browse T-shirts" });
    await userEvent.click(chip);

    expect(mockRouterPush).toHaveBeenCalledWith("/products?category=tops%2Ct-shirts");
  });
});

describe("Clothing facets", () => {
  it("sends size, age and colour to the server before pagination and preserves server totals", async () => {
    searchParamsRef.current = new URLSearchParams(
      "audience=girls&age=5-8&size=6+years&colour=Blue&page=2&sort=price_asc",
    );
    mockGetCategories.mockResolvedValue({ product_categories: [], count: 0 });
    mockGetProducts.mockResolvedValue({
      products: [mockProduct],
      count: 45,
      offset: 20,
      limit: 20,
      facets: { sizes: ["6 years"], colours: ["Blue"] },
    });
    renderWithProviders(<ProductsPage />);
    await waitFor(() =>
      expect(mockGetProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          audience: "girls",
          age: "5-8",
          size: "6 years",
          colour: "Blue",
          offset: 20,
          sort: "price_asc",
        }),
      ),
    );
    expect(await screen.findByText("45 products found")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Size" })).toHaveValue("6 years");
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
  });

  it("clears every clothing facet from the empty results state", async () => {
    searchParamsRef.current = new URLSearchParams(
      "audience=girls&age=5-8&size=6+years&colour=Blue&sale=true&availability=in_stock&price=u1000",
    );
    mockGetCategories.mockResolvedValue({ product_categories: mockCategories, count: 3 });
    mockGetProducts.mockResolvedValue({ products: [], count: 0, offset: 0, limit: 20 });

    renderWithProviders(<ProductsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Clear filters" }));
    expect(mockRouterPush).toHaveBeenCalledWith("/products");
  });
});

describe("Catalogue errors", () => {
  it("keeps a successful non-category listing visible when category navigation fails", async () => {
    mockGetCategories.mockRejectedValue(new Error("Categories unavailable"));
    mockGetProducts.mockResolvedValue({
      products: [mockProduct],
      count: 1,
      offset: 0,
      limit: 20,
    });

    renderWithProviders(<ProductsPage />);

    expect(await screen.findByText("Pampers Baby Dry Diapers")).toBeInTheDocument();
    expect(
      screen.queryByText("Clothing is temporarily unavailable. Please try again."),
    ).not.toBeInTheDocument();
  });

  it("shows an error when category navigation is required to resolve a filter", async () => {
    searchParamsRef.current = new URLSearchParams("category=tops");
    mockGetCategories.mockRejectedValue(new Error("Categories unavailable"));

    renderWithProviders(<ProductsPage />);

    expect(
      await screen.findByText("Clothing is temporarily unavailable. Please try again."),
    ).toBeInTheDocument();
    expect(mockGetProducts).not.toHaveBeenCalled();
  });
});

it("explains retired departments without fetching unrelated clothing", async () => {
  searchParamsRef.current = new URLSearchParams("category=feeding");
  mockGetCategories.mockResolvedValue({ product_categories: mockCategories, count: 3 });
  renderWithProviders(<ProductsPage />);
  expect(await screen.findByText("We now specialise in kids’ clothing")).toBeInTheDocument();
  expect(mockGetProducts).not.toHaveBeenCalled();
});

it("resolves former tops links to the canonical garment filter", async () => {
  searchParamsRef.current = new URLSearchParams("category=tops-t-shirts");
  mockGetCategories.mockResolvedValue({ product_categories: mockCategories, count: 3 });
  mockGetProducts.mockResolvedValue({ products: [], count: 0, offset: 0, limit: 20 });
  renderWithProviders(<ProductsPage />);
  await waitFor(() =>
    expect(mockGetProducts).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: expect.arrayContaining(["pcat_tops"]) }),
    ),
  );
});
