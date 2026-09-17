import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductDetail } from "@/components/product-detail";
import { renderWithProviders } from "../test-utils";
import { mockProduct } from "../fixtures";
import type { MedusaProduct } from "@/types/medusa";

const mockGetProductById = vi.fn();
const mockAddToCart = vi.fn();
const mockGetWishlistProductIds = vi.fn();
const mockToggleWishlistProduct = vi.fn();
const mockGetProducts = vi.fn();

vi.mock("@/lib/medusa-api", () => ({
  getProductById: (...args: unknown[]) => mockGetProductById(...args),
  addToCart: (...args: unknown[]) => mockAddToCart(...args),
  getCart: vi.fn().mockResolvedValue(null),
  getWishlistProductIds: (...args: unknown[]) => mockGetWishlistProductIds(...args),
  toggleWishlistProduct: (...args: unknown[]) => mockToggleWishlistProduct(...args),
  getProducts: (...args: unknown[]) => mockGetProducts(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWishlistProductIds.mockResolvedValue([]);
  mockToggleWishlistProduct.mockResolvedValue(["prod_01"]);
  mockGetProducts.mockResolvedValue({ products: [] });
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
      expect(screen.getByRole("heading", { name: "Pampers Baby Dry Diapers" })).toBeInTheDocument();
    });
    expect(screen.getByText("KSh85,000.00")).toBeInTheDocument();
  });

  it("uses the page heading for a standalone product", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} headingLevel={1} />);
    expect(
      await screen.findByRole("heading", { level: 1, name: mockProduct.title }),
    ).toBeInTheDocument();
  });

  it("keeps embedded product headings below the page heading", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    expect(
      await screen.findByRole("heading", { level: 2, name: mockProduct.title }),
    ).toBeInTheDocument();
  });

  it("groups product options under their accessible option name", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    const options = await screen.findByRole("group", { name: "Pack Size" });
    expect(within(options).getByRole("button", { name: "24 Count" })).toBeInTheDocument();
    expect(within(options).getByRole("button", { name: "50 Count" })).toBeInTheDocument();
  });

  it("names quantity controls and prevents going below one or above available stock", async () => {
    mockGetProductById.mockResolvedValueOnce({
      product: {
        ...mockProduct,
        variants: [{ ...mockProduct.variants![0], manage_inventory: true, inventory_quantity: 2 }],
      },
    });
    const user = userEvent.setup();
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    const decrease = await screen.findByRole("button", { name: "Decrease quantity" });
    const increase = screen.getByRole("button", { name: "Increase quantity" });
    expect(decrease).toBeDisabled();
    await user.click(increase);
    expect(screen.getByLabelText("Selected quantity")).toHaveTextContent("2");
    expect(increase).toBeDisabled();
    expect(decrease).toBeEnabled();
    await user.click(decrease);
    expect(screen.getByLabelText("Selected quantity")).toHaveTextContent("1");
    expect(decrease).toBeDisabled();
  });

  it("renders product description", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Premium diapers for all-night comfort")).toBeInTheDocument();
    });
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
      expect(screen.getByRole("heading", { name: "Pampers Baby Dry Diapers" })).toBeInTheDocument();
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

  it("shows product image", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      const img = screen.getByAltText("Pampers Baby Dry Diapers");
      expect(img).toBeInTheDocument();
    });
  });

  it("toggles wishlist from the detail page", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    const user = userEvent.setup();

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Pampers Baby Dry Diapers" })).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Add to wishlist"));

    expect(mockToggleWishlistProduct).toHaveBeenCalledWith("prod_01");
  });

  it("renders a breadcrumb linking home and the product category", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    const nav = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");

    const categoryLink = within(nav).getByRole("link", { name: "Diapers" });
    expect(categoryLink).toHaveAttribute("href", "/products?category=diapers");

    const current = within(nav).getByText("Pampers Baby Dry Diapers");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("disables an option value that has no in-stock variant", async () => {
    const productWithSoldOut: MedusaProduct = {
      ...mockProduct,
      variants: [
        mockProduct.variants![0], // 24 Count — in stock
        // 50 Count — managed inventory, zero on hand → sold out
        { ...mockProduct.variants![1], manage_inventory: true, inventory_quantity: 0 },
      ],
    };
    mockGetProductById.mockResolvedValueOnce({ product: productWithSoldOut });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    expect(screen.getByRole("button", { name: /24 Count/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /50 Count/i })).toBeDisabled();
  });

  it("clears an incompatible clothing option and requires an explicit replacement", async () => {
    const product: MedusaProduct = {
      ...mockProduct,
      options: [
        {
          id: "opt_size",
          title: "Size",
          product_id: "prod_01",
          values: [
            { id: "ov_s", value: "S", option_id: "opt_size" },
            { id: "ov_m", value: "M", option_id: "opt_size" },
          ],
        },
        {
          id: "opt_color",
          title: "Color",
          product_id: "prod_01",
          values: [
            { id: "ov_red", value: "Red", option_id: "opt_color" },
            { id: "ov_blue", value: "Blue", option_id: "opt_color" },
          ],
        },
      ],
      variants: [
        {
          id: "v_s_red",
          title: "S / Red",
          options: [
            { id: "ov_s", value: "S", option_id: "opt_size" },
            { id: "ov_red", value: "Red", option_id: "opt_color" },
          ],
          prices: [{ id: "p1", amount: 1000, currency_code: "kes" }],
        },
        {
          id: "v_s_blue",
          title: "S / Blue",
          options: [
            { id: "ov_s", value: "S", option_id: "opt_size" },
            { id: "ov_blue", value: "Blue", option_id: "opt_color" },
          ],
          prices: [{ id: "p2", amount: 1000, currency_code: "kes" }],
        },
        {
          // M / Red is the only sold-out combination
          id: "v_m_red",
          title: "M / Red",
          manage_inventory: true,
          inventory_quantity: 0,
          options: [
            { id: "ov_m", value: "M", option_id: "opt_size" },
            { id: "ov_red", value: "Red", option_id: "opt_color" },
          ],
          prices: [{ id: "p3", amount: 1000, currency_code: "kes" }],
        },
        {
          id: "v_m_blue",
          title: "M / Blue",
          options: [
            { id: "ov_m", value: "M", option_id: "opt_size" },
            { id: "ov_blue", value: "Blue", option_id: "opt_color" },
          ],
          prices: [{ id: "p4", amount: 1000, currency_code: "kes" }],
        },
      ],
    };
    mockGetProductById.mockResolvedValueOnce({ product });
    const user = userEvent.setup();

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    // Explicitly choose S / Red, then switch to M where Red is sold out.
    await user.click(screen.getByRole("button", { name: "S" }));
    await user.click(screen.getByRole("button", { name: "Red" }));
    await user.click(screen.getByRole("button", { name: "M" }));

    // No colour is silently substituted. The customer must choose Blue.
    expect(screen.getByRole("button", { name: "M" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Choose size and colour" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Blue" }));
    expect(screen.getByRole("button", { name: "Add to Cart" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Red" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the original price and discount when the selected variant is on sale", async () => {
    const discounted: MedusaProduct = {
      ...mockProduct,
      variants: [
        {
          ...mockProduct.variants![0],
          calculated_price: {
            calculated_amount: 85000,
            original_amount: 100000,
            currency_code: "kes",
          },
        },
        mockProduct.variants![1],
      ],
    };
    mockGetProductById.mockResolvedValueOnce({ product: discounted });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    // Selected (first) variant is discounted 100,000 → 85,000.
    expect(screen.getByText("KSh100,000.00")).toBeInTheDocument();
    expect(screen.getByText("-15%")).toBeInTheDocument();
  });

  it("links to delivery and returns policies without promising universal free delivery", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    expect(screen.getByRole("link", { name: "Delivery policy" })).toHaveAttribute(
      "href",
      "/policies/shipping",
    );
    expect(screen.queryByText(/Free delivery on orders/i)).not.toBeInTheDocument();
    expect(screen.getByText("Pay securely with M-Pesa")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /returns/i })).toHaveAttribute(
      "href",
      "/policies/returns",
    );
  });

  it("shows the star rating and review count when the product has rating metadata", async () => {
    const rated: MedusaProduct = {
      ...mockProduct,
      metadata: { rating: 4.5, review_count: 128 },
    };
    mockGetProductById.mockResolvedValueOnce({ product: rated });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    expect(screen.getByText(/128 reviews/i)).toBeInTheDocument();
    expect(screen.queryByText("No reviews yet")).not.toBeInTheDocument();
  });

  it("omits ratings when there is no actual review data", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    expect(screen.queryByText("No reviews yet")).not.toBeInTheDocument();
  });

  it("does not present a rating without a positive review count", async () => {
    mockGetProductById.mockResolvedValueOnce({
      product: { ...mockProduct, metadata: { rating: 4.5, review_count: 0 } },
    });
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: mockProduct.title });
    expect(screen.queryByText(/0 reviews/i)).not.toBeInTheDocument();
  });

  it("shows the description in an accordion section open by default", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    expect(screen.getByRole("button", { name: "Description" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("Premium diapers for all-night comfort")).toBeInTheDocument();
  });

  it("expands a collapsed accordion section on click", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    const user = userEvent.setup();

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    const deliveryToggle = screen.getByRole("button", { name: /Delivery & returns/i });
    expect(deliveryToggle).toHaveAttribute("aria-expanded", "false");

    await user.click(deliveryToggle);
    expect(deliveryToggle).toHaveAttribute("aria-expanded", "true");
  });

  it("renders related products from the same category", async () => {
    const related1 = {
      ...mockProduct,
      id: "prod_rel_1",
      title: "Baby Wipes Sensitive",
      handle: "baby-wipes-sensitive",
    };
    const related2 = {
      ...mockProduct,
      id: "prod_rel_2",
      title: "Newborn Onesie",
      handle: "newborn-onesie",
    };
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    // Includes the current product, which must be filtered out of the row.
    mockGetProducts.mockResolvedValue({ products: [related1, related2, mockProduct] });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    expect(await screen.findByText("You may also like")).toBeInTheDocument();
    expect(screen.getByText("Baby Wipes Sensitive")).toBeInTheDocument();
    expect(screen.getByText("Newborn Onesie")).toBeInTheDocument();
  });

  it("hides the related section when there are no other products in the category", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    mockGetProducts.mockResolvedValue({ products: [mockProduct] });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });
    await waitFor(() => expect(mockGetProducts).toHaveBeenCalled());

    expect(screen.queryByText("You may also like")).not.toBeInTheDocument();
  });
});
