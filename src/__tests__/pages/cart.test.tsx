import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import CartPage from "@/app/cart/page";
import { renderWithProviders } from "../test-utils";
import { mockCart, mockEmptyCart } from "../fixtures";

const mockGetCart = vi.fn();

vi.mock("@/lib/medusa-api", () => ({
  getCart: (...args: unknown[]) => mockGetCart(...args),
  getProductsByIds: vi.fn().mockResolvedValue([]),
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
