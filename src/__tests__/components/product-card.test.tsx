import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "@/components/product-card";
import { renderWithProviders } from "../test-utils";
import { mockProduct, mockProductMinimal } from "../fixtures";

const mockAddToCart = vi.fn().mockResolvedValue({ cart: { id: "cart_01", items: [] } });
const mockGetCart = vi.fn().mockResolvedValue(null);
const mockGetWishlistProductIds = vi.fn().mockResolvedValue([]);
const mockToggleWishlistProduct = vi.fn();

vi.mock("@/lib/medusa-api", () => ({
  addToCart: (...args: unknown[]) => mockAddToCart(...args),
  getCart: (...args: unknown[]) => mockGetCart(...args),
  getWishlistProductIds: (...args: unknown[]) => mockGetWishlistProductIds(...args),
  toggleWishlistProduct: (...args: unknown[]) => mockToggleWishlistProduct(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCart.mockResolvedValue(null);
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
    expect(screen.getByText("KSh85,000.00")).toBeInTheDocument();
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
    expect(screen.getByTestId("product-card-media")).toHaveClass("aspect-[4/5]");
  });

  it("keeps long titles clamped inside a stable product card", () => {
    const longNameProduct = {
      ...mockProduct,
      title:
        "Pampers Premium Care Extra Soft Overnight Diapers Jumbo Monthly Value Pack Size 4 With Aloe",
    };

    renderWithProviders(<ProductCard product={longNameProduct} />);

    expect(screen.getByTestId("product-card-title")).toHaveClass("line-clamp-2");
    expect(screen.getByTestId("product-card-media")).toHaveClass("aspect-[4/5]");
  });

  it("shows sale treatment when the variant has an original price", () => {
    const saleProduct = {
      ...mockProduct,
      variants: [
        {
          ...mockProduct.variants![0],
          calculated_price: {
            calculated_amount: 68000,
            original_amount: 85000,
            currency_code: "kes",
          },
        },
      ],
    };

    renderWithProviders(<ProductCard product={saleProduct} />);

    expect(screen.getByText("KSh68,000.00")).toBeInTheDocument();
    expect(screen.getByText("KSh85,000.00")).toHaveClass("line-through");
    expect(screen.getByText("Sale")).toBeInTheDocument();
  });

  it("shows low-stock and out-of-stock states without hiding the quick-add control", () => {
    const lowStockProduct = {
      ...mockProduct,
      variants: [
        {
          ...mockProduct.variants![0],
          manage_inventory: true,
          inventory_quantity: 2,
        },
      ],
    };
    const outOfStockProduct = {
      ...mockProduct,
      id: "prod_out",
      title: "Sold Out Diapers",
      variants: [
        {
          ...mockProduct.variants![0],
          id: "variant_out",
          manage_inventory: true,
          inventory_quantity: 0,
        },
      ],
    };

    const { rerender } = renderWithProviders(<ProductCard product={lowStockProduct} />);

    expect(screen.getByText("Only 2 left")).toBeInTheDocument();
    expect(screen.getByLabelText("Quick add Pampers Baby Dry Diapers")).toBeEnabled();

    rerender(<ProductCard product={outOfStockProduct} />);

    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.getByLabelText("Sold Out Diapers is out of stock")).toBeDisabled();
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
    expect(screen.getByLabelText("Quick add Pampers Baby Dry Diapers")).toBeInTheDocument();
  });

  it("does not add unavailable products to the cart", async () => {
    const user = userEvent.setup();
    const unavailableProduct = {
      ...mockProduct,
      variants: [
        {
          ...mockProduct.variants![0],
          manage_inventory: true,
          inventory_quantity: 0,
          allow_backorder: false,
        },
      ],
    };

    renderWithProviders(<ProductCard product={unavailableProduct} />);

    await user.click(screen.getByLabelText("Pampers Baby Dry Diapers is out of stock"));
    expect(mockAddToCart).not.toHaveBeenCalled();
  });

  it("does not show add-to-cart when no variant", () => {
    renderWithProviders(<ProductCard product={mockProductMinimal} />);
    expect(screen.queryByLabelText(/quick add/i)).not.toBeInTheDocument();
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

    await user.click(screen.getByLabelText("Add Pampers Baby Dry Diapers to wishlist"));

    expect(mockToggleWishlistProduct).toHaveBeenCalledWith("prod_01");
  });

  it("quick-adds the purchasable variant", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProductCard product={mockProduct} />);

    await user.click(screen.getByLabelText("Quick add Pampers Baby Dry Diapers"));

    expect(mockAddToCart).toHaveBeenCalledWith("variant_01", 1);
  });

  it("blocks quick add when cart already has the max inventory quantity", async () => {
    const user = userEvent.setup();
    const limitedProduct = {
      ...mockProduct,
      variants: [
        {
          ...mockProduct.variants![0],
          manage_inventory: true,
          inventory_quantity: 2,
        },
      ],
    };
    mockGetCart.mockResolvedValue({
      id: "cart_01",
      currency_code: "kes",
      items: [{ id: "item_01", variant_id: "variant_01", quantity: 2 }],
      total: 0,
      subtotal: 0,
      discount_total: 0,
      shipping_total: 0,
      tax_total: 0,
      item_total: 0,
    });

    renderWithProviders(<ProductCard product={limitedProduct} />);

    const button = await screen.findByLabelText(
      "Maximum Pampers Baby Dry Diapers quantity already in cart",
    );
    await user.click(button);

    expect(mockAddToCart).not.toHaveBeenCalled();
    expect(screen.getByText("Max in cart")).toBeInTheDocument();
  });

  it("does not call onSelect when card action buttons are pressed", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderWithProviders(<ProductCard product={mockProduct} onSelect={onSelect} />);

    await user.click(screen.getByLabelText("Add Pampers Baby Dry Diapers to wishlist"));
    await user.click(screen.getByLabelText("Quick add Pampers Baby Dry Diapers"));

    expect(onSelect).not.toHaveBeenCalled();
  });
});
