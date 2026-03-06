import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "@/components/product-card";
import { renderWithProviders } from "../test-utils";
import { mockProduct, mockProductMinimal } from "../fixtures";

const mockAddToCart = vi.fn().mockResolvedValue({ cart: { id: "cart_01", items: [] } });
const mockGetWishlistProductIds = vi.fn().mockResolvedValue([]);
const mockToggleWishlistProduct = vi.fn();

vi.mock("@/lib/medusa-api", () => ({
  addToCart: (...args: unknown[]) => mockAddToCart(...args),
  getWishlistProductIds: (...args: unknown[]) => mockGetWishlistProductIds(...args),
  toggleWishlistProduct: (...args: unknown[]) => mockToggleWishlistProduct(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWishlistProductIds.mockResolvedValue([]);
  mockToggleWishlistProduct.mockResolvedValue(["prod_01"]);
});

describe("ProductCard", () => {
  it("renders the product title", () => {
    renderWithProviders(<ProductCard product={mockProduct} />);
    expect(screen.getAllByText("Pampers Baby Dry Diapers").length).toBeGreaterThanOrEqual(1);
  });

  it("renders formatted price", () => {
    renderWithProviders(<ProductCard product={mockProduct} />);
    expect(screen.getByText("Br85,000.00")).toBeInTheDocument();
  });

  it("renders product image", () => {
    renderWithProviders(<ProductCard product={mockProduct} />);
    const img = screen.getByAltText("Pampers Baby Dry Diapers");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/pampers.jpg");
  });

  it("renders 'No image' fallback when no thumbnail", () => {
    renderWithProviders(<ProductCard product={mockProductMinimal} />);
    expect(screen.getByText("No image")).toBeInTheDocument();
  });

  it("shows 'New' badge for recently created product", () => {
    const recentProduct = {
      ...mockProduct,
      created_at: new Date().toISOString(),
    };
    renderWithProviders(<ProductCard product={recentProduct} />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("does not show 'New' badge for old product", () => {
    const oldProduct = {
      ...mockProduct,
      created_at: "2023-01-01T00:00:00Z",
    };
    renderWithProviders(<ProductCard product={oldProduct} />);
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("has add to cart button when variant exists", () => {
    renderWithProviders(<ProductCard product={mockProduct} />);
    expect(screen.getByTitle("Add to cart")).toBeInTheDocument();
  });

  it("does not show add-to-cart when no variant", () => {
    renderWithProviders(<ProductCard product={mockProductMinimal} />);
    expect(screen.queryByTitle("Add to cart")).not.toBeInTheDocument();
  });

  it("links to product detail page", () => {
    renderWithProviders(<ProductCard product={mockProduct} />);
    const links = screen.getAllByRole("link");
    expect(links.some((link) => link.getAttribute("href") === "/products/prod_01")).toBe(true);
  });

  it("calls onSelect callback on click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderWithProviders(<ProductCard product={mockProduct} onSelect={onSelect} />);
    const link = screen.getAllByRole("link")[0];
    await user.click(link);

    expect(onSelect).toHaveBeenCalledWith("prod_01");
  });

  it("shows '--' when product has no price", () => {
    renderWithProviders(<ProductCard product={mockProductMinimal} />);
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("toggles wishlist state from the heart button", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProductCard product={mockProduct} />);

    await user.click(screen.getByLabelText("Add to wishlist"));

    expect(mockToggleWishlistProduct).toHaveBeenCalledWith("prod_01");
  });
});
