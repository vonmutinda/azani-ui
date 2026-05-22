import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import CartPage from "@/app/cart/page";
import { renderWithProviders } from "../test-utils";
import { mockCart, mockEmptyCart, mockProduct } from "../fixtures";

const mockGetCart = vi.fn();
const mockGetProductsByIds = vi.fn();
const mockUpdateLineItem = vi.fn();
const mockRemoveLineItem = vi.fn();
const mockAddPromoCode = vi.fn();
const mockRemovePromoCode = vi.fn();

vi.mock("@/lib/medusa-api", () => ({
  getCart: (...args: unknown[]) => mockGetCart(...args),
  getProductsByIds: (...args: unknown[]) => mockGetProductsByIds(...args),
  updateLineItem: (...args: unknown[]) => mockUpdateLineItem(...args),
  removeLineItem: (...args: unknown[]) => mockRemoveLineItem(...args),
  addPromoCode: (...args: unknown[]) => mockAddPromoCode(...args),
  removePromoCode: (...args: unknown[]) => mockRemovePromoCode(...args),
}));

describe("CartPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCart.mockResolvedValue(mockCart);
    mockGetProductsByIds.mockResolvedValue([mockProduct]);
    mockUpdateLineItem.mockResolvedValue({ cart: { id: "cart_01", items: [] } });
    mockRemoveLineItem.mockResolvedValue({ cart: { id: "cart_01", items: [] } });
    mockAddPromoCode.mockResolvedValue({ cart: { id: "cart_01", items: [] } });
    mockRemovePromoCode.mockResolvedValue({ cart: { id: "cart_01", items: [] } });
  });

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

  it("exposes an accessible promo code input", async () => {
    mockGetCart.mockResolvedValueOnce(mockCart);

    renderWithProviders(<CartPage />);

    expect(await screen.findByRole("textbox", { name: /promo code/i })).toBeInTheDocument();
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

  it("updates cart quantity from accessible increment controls", async () => {
    mockGetCart.mockResolvedValueOnce(mockCart);

    renderWithProviders(<CartPage />);

    const increase = await screen.findByRole("button", {
      name: /increase quantity for pampers baby dry diapers/i,
    });
    fireEvent.click(increase);

    await waitFor(() => expect(mockUpdateLineItem).toHaveBeenCalledWith("item_01", 3));
  });

  it("shows specific free delivery progress copy", async () => {
    mockGetCart.mockResolvedValueOnce(mockCart);

    renderWithProviders(<CartPage />);

    expect(await screen.findByText(/KSh7,000.00 away from free delivery/i)).toBeInTheDocument();
  });
});
