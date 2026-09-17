import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import CartPage from "@/app/cart/page";
import { renderWithProviders } from "../test-utils";
import { mockCart, mockEmptyCart, mockProduct } from "../fixtures";

const mockGetCart = vi.fn();
const mockGetProducts = vi.fn().mockResolvedValue([mockProduct]);

vi.mock("@/lib/medusa-api", () => ({
  getCart: (...args: unknown[]) => mockGetCart(...args),
  getProductsByIds: (...args: unknown[]) => mockGetProducts(...args),
  updateLineItem: vi.fn().mockResolvedValue({ cart: { id: "cart_01", items: [] } }),
  removeLineItem: vi.fn().mockResolvedValue({ cart: { id: "cart_01", items: [] } }),
  addPromoCode: vi.fn().mockResolvedValue({ cart: { id: "cart_01", items: [] } }),
  removePromoCode: vi.fn().mockResolvedValue({ cart: { id: "cart_01", items: [] } }),
}));

describe("CartPage", () => {
  it("renders empty cart state when no items", async () => {
    mockGetCart.mockResolvedValueOnce(mockEmptyCart);

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    });
  });

  it("renders empty cart state when cart is null", async () => {
    mockGetCart.mockResolvedValueOnce(null);

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    });
  });

  it("renders cart items when cart has products", async () => {
    mockGetCart.mockResolvedValueOnce(mockCart);

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText("Pampers Baby Dry Diapers - 24 Count")).toBeInTheDocument();
    });
  });

  it("shows order summary section with totals", async () => {
    mockGetCart.mockResolvedValueOnce(mockCart);

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText("Order Summary")).toBeInTheDocument();
      expect(screen.getAllByText("Subtotal").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Total")).toBeInTheDocument();
    });
  });

  it("shows checkout link", async () => {
    mockGetCart.mockResolvedValueOnce(mockCart);

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      const checkoutLink = screen.getByText("Proceed to Checkout");
      expect(checkoutLink.closest("a")).toHaveAttribute("href", "/checkout");
    });
  });

  it("shows start shopping link on empty cart", async () => {
    mockGetCart.mockResolvedValueOnce(mockEmptyCart);

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      const link = screen.getByText(/Start Shopping/);
      expect(link.closest("a")).toHaveAttribute("href", "/products");
    });
  });

  it("displays item quantity", async () => {
    mockGetCart.mockResolvedValueOnce(mockCart);

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText(/× 2/)).toBeInTheDocument();
    });
  });

  it("displays formatted item total", async () => {
    mockGetCart.mockResolvedValueOnce(mockCart);

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getAllByText("KSh3,000.00").length).toBeGreaterThanOrEqual(1);
    });
  });
});

it("blocks checkout for retired products even when the cart has stale variant stock", async () => {
  mockGetCart.mockResolvedValueOnce({
    ...mockCart,
    items: mockCart.items.map((item) => ({ ...item, variant: mockProduct.variants![0] })),
  });
  mockGetProducts.mockResolvedValueOnce([]);
  renderWithProviders(<CartPage />);
  await screen.findByText(/Some items are no longer available/);
  expect(screen.queryByRole("link", { name: "Proceed to Checkout" })).not.toBeInTheDocument();
});

it("blocks a removed size even when the product and cached variant still exist", async () => {
  mockGetCart.mockResolvedValueOnce({
    ...mockCart,
    items: mockCart.items.map((item) => ({ ...item, variant: mockProduct.variants![0] })),
  });
  mockGetProducts.mockResolvedValueOnce([{ ...mockProduct, variants: [] }]);
  renderWithProviders(<CartPage />);
  await screen.findByText(/Some items are no longer available/);
  expect(screen.queryByRole("link", { name: "Proceed to Checkout" })).not.toBeInTheDocument();
});

it("blocks checkout when the requested quantity exceeds current managed stock", async () => {
  const liveVariant = {
    ...mockProduct.variants![0],
    manage_inventory: true,
    allow_backorder: false,
    inventory_quantity: 1,
  };
  mockGetCart.mockResolvedValueOnce({
    ...mockCart,
    items: mockCart.items.map((item) => ({ ...item, quantity: 2, variant: liveVariant })),
  });
  mockGetProducts.mockResolvedValueOnce([{ ...mockProduct, variants: [liveVariant] }]);

  renderWithProviders(<CartPage />);

  await screen.findByText(/Some items are no longer available/);
  expect(screen.queryByRole("link", { name: "Proceed to Checkout" })).not.toBeInTheDocument();
});

it("allows checkout when current stock covers a quantity above the quantity control cap", async () => {
  const liveVariant = {
    ...mockProduct.variants![0],
    manage_inventory: true,
    allow_backorder: false,
    inventory_quantity: 20,
  };
  mockGetCart.mockResolvedValueOnce({
    ...mockCart,
    items: mockCart.items.map((item) => ({ ...item, quantity: 12, variant: liveVariant })),
  });
  mockGetProducts.mockResolvedValueOnce([{ ...mockProduct, variants: [liveVariant] }]);

  renderWithProviders(<CartPage />);

  expect(await screen.findByRole("link", { name: "Proceed to Checkout" })).toHaveAttribute(
    "href",
    "/checkout",
  );
  expect(screen.queryByText(/Some items are no longer available/)).not.toBeInTheDocument();
});

it("blocks checkout and offers a retry when availability cannot be checked", async () => {
  mockGetCart.mockResolvedValueOnce(mockCart);
  mockGetProducts.mockRejectedValueOnce(new Error("Catalogue unavailable"));

  renderWithProviders(<CartPage />);

  await screen.findByText(/couldn’t check item availability/i);
  expect(screen.queryByText(/Some items are no longer available/)).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Proceed to Checkout" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("link", { name: "Proceed to Checkout" })).toHaveAttribute(
    "href",
    "/checkout",
  );
});
