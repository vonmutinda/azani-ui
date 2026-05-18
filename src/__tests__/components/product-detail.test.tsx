import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductDetail } from "@/components/product-detail";
import { renderWithProviders } from "../test-utils";
import { mockCart, mockProduct, mockProductMinimal } from "../fixtures";

const mockGetProductById = vi.fn();
const mockAddToCart = vi.fn();
const mockGetCart = vi.fn();
const mockGetWishlistProductIds = vi.fn();
const mockToggleWishlistProduct = vi.fn();

vi.mock("@/lib/medusa-api", () => ({
  getProductById: (...args: unknown[]) => mockGetProductById(...args),
  addToCart: (...args: unknown[]) => mockAddToCart(...args),
  getCart: (...args: unknown[]) => mockGetCart(...args),
  getWishlistProductIds: (...args: unknown[]) => mockGetWishlistProductIds(...args),
  toggleWishlistProduct: (...args: unknown[]) => mockToggleWishlistProduct(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockAddToCart.mockResolvedValue({ cart: { id: "cart_01", items: [] } });
  mockGetCart.mockResolvedValue(null);
  mockGetWishlistProductIds.mockResolvedValue([]);
  mockToggleWishlistProduct.mockResolvedValue(["prod_01"]);
});

describe("ProductDetail", () => {
  it("shows loading skeleton initially", () => {
    mockGetProductById.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    expect(screen.getByText("Back to products")).toBeInTheDocument();
  });

  it("renders product title and price when loaded", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Pampers Baby Dry Diapers")).toBeInTheDocument();
    });
    expect(screen.getByText("KSh85,000.00")).toBeInTheDocument();
  });

  it("renders product description", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText("Premium diapers for all-night comfort").length).toBeGreaterThan(
        0,
      );
    });
  });

  it("structures product information into overview and essentials", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Essentials" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Care & use" })).toBeInTheDocument();
  });

  it("renders product options", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Pack Size")).toBeInTheDocument();
      expect(screen.getByText("24 Count")).toBeInTheDocument();
      expect(screen.getByText("50 Count")).toBeInTheDocument();
    });
  });

  it("calls onBack when back button is clicked", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    const onBack = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<ProductDetail productId="prod_01" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText("Pampers Baby Dry Diapers")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Back to products"));
    expect(onBack).toHaveBeenCalled();
  });

  it("renders 'Product not found' when no product", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: null });

    renderWithProviders(<ProductDetail productId="nonexistent" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Product not found")).toBeInTheDocument();
    });
  });

  it("shows Add to Cart button", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Add to Cart")).toBeInTheDocument();
    });
  });

  it("adds the selected variant and quantity to cart", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    const user = userEvent.setup();

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("50 Count")).toBeInTheDocument();
    });

    await user.click(screen.getByText("50 Count"));
    await user.click(screen.getByLabelText("Increase quantity"));
    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    expect(mockAddToCart).toHaveBeenCalledWith("variant_02", 2);
  });

  it("prevents quantity from exceeding remaining stock", async () => {
    mockGetCart.mockResolvedValue({
      ...mockCart,
      items: [{ ...mockCart.items[0], variant_id: "variant_01", quantity: 1 }],
    });
    mockGetProductById.mockResolvedValueOnce({
      product: {
        ...mockProduct,
        variants: [
          {
            ...mockProduct.variants![0],
            manage_inventory: true,
            inventory_quantity: 2,
          },
        ],
      },
    });
    const user = userEvent.setup();

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Only 2 left")).toBeInTheDocument();
    });

    const increase = screen.getByLabelText("Increase quantity");
    expect(increase).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /add to cart/i }));
    expect(mockAddToCart).toHaveBeenCalledWith("variant_01", 1);
  });

  it("does not present the per-order cap as stock for unmanaged inventory", async () => {
    mockGetProductById.mockResolvedValueOnce({
      product: {
        ...mockProduct,
        variants: [
          {
            ...mockProduct.variants![0],
            manage_inventory: false,
            inventory_quantity: 0,
          },
        ],
      },
    });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Limit 10 per order")).toBeInTheDocument();
    });

    expect(screen.queryByText(/available for this order/i)).not.toBeInTheDocument();
  });

  it("shows product image", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      const img = screen.getByAltText("Pampers Baby Dry Diapers");
      expect(img).toBeInTheDocument();
    });
  });

  it("shows a missing image fallback without rendering a broken product image", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProductMinimal });

    renderWithProviders(<ProductDetail productId="prod_02" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Image coming soon")).toBeInTheDocument();
    });

    expect(screen.queryByAltText("Baby Wipes")).not.toBeInTheDocument();
  });

  it("switches the primary image from the thumbnail rail", async () => {
    mockGetProductById.mockResolvedValueOnce({
      product: {
        ...mockProduct,
        thumbnail: "https://example.com/pampers-primary.jpg",
        images: [
          { id: "img_01", url: "https://example.com/pampers-primary.jpg" },
          { id: "img_02", url: "https://example.com/pampers-side.jpg" },
        ],
      },
    });
    const user = userEvent.setup();

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByAltText("Pampers Baby Dry Diapers")).toHaveAttribute(
        "src",
        "https://example.com/pampers-primary.jpg",
      );
    });

    await user.click(
      screen.getByRole("button", { name: "Show image 2 of Pampers Baby Dry Diapers" }),
    );

    expect(screen.getByAltText("Pampers Baby Dry Diapers")).toHaveAttribute(
      "src",
      "https://example.com/pampers-side.jpg",
    );
  });

  it("renders restrained trust and support sections", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Safe product checks")).toBeInTheDocument();
    });

    expect(screen.getByText("Delivery & returns")).toBeInTheDocument();
    expect(screen.getByText("M-Pesa ready")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp assistance")).toBeInTheDocument();
  });

  it("toggles wishlist from the detail page", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    const user = userEvent.setup();

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Pampers Baby Dry Diapers")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Add to wishlist"));

    expect(mockToggleWishlistProduct).toHaveBeenCalledWith("prod_01");
  });
});
