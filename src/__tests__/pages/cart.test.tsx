import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import CartPage from "@/app/cart/page";
import { renderWithProviders } from "../test-utils";
import { mockCart, mockEmptyCart, mockProduct } from "../fixtures";
import { addPromoCode, removeLineItem, removePromoCode, updateLineItem } from "@/lib/medusa-api";

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
      expect(screen.getByText("Total before shipping")).toBeInTheDocument();
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

it("names quantity and removal actions for the product they affect", async () => {
  mockGetCart.mockResolvedValue(mockCart);
  renderWithProviders(<CartPage />);
  await screen.findByRole("link", { name: "Proceed to Checkout" });
  const title = "Pampers Baby Dry Diapers - 24 Count";
  const quantity = screen.getByRole("textbox", { name: `Quantity for ${title}` });
  expect(quantity).toHaveValue("2");
  fireEvent.click(screen.getByRole("button", { name: `Increase quantity for ${title}` }));
  await waitFor(() => expect(updateLineItem).toHaveBeenCalledWith("item_01", 3));
  fireEvent.click(screen.getByRole("button", { name: `Decrease quantity for ${title}` }));
  await waitFor(() => expect(updateLineItem).toHaveBeenCalledWith("item_01", 1));
  fireEvent.click(screen.getByRole("button", { name: `Remove ${title} from cart` }));
  await waitFor(() => expect(removeLineItem).toHaveBeenCalledWith("item_01"));
});

it("discloses the promo field on demand and links apply errors to it", async () => {
  mockGetCart.mockResolvedValue(mockCart);
  vi.mocked(addPromoCode).mockRejectedValueOnce(new Error("This code has expired"));
  renderWithProviders(<CartPage />);
  const disclosure = await screen.findByText("Have a promo code?");
  expect(screen.getByLabelText("Promo code")).not.toBeVisible();
  fireEvent.click(disclosure);
  const input = screen.getByRole("textbox", { name: "Promo code" });
  expect(input).toBeVisible();
  fireEvent.change(input, { target: { value: "EXPIRED" } });
  fireEvent.submit(input.closest("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent("This code has expired");
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription("This code has expired");
  expect(addPromoCode).toHaveBeenCalledWith("EXPIRED");
});

it("keeps a successfully applied promo visible and exposes its removal action", async () => {
  mockGetCart.mockResolvedValueOnce(mockCart).mockResolvedValue({
    ...mockCart,
    promotions: [{ id: "promo_1", code: "WELCOME" }],
  });
  renderWithProviders(<CartPage />);
  fireEvent.click(await screen.findByText("Have a promo code?"));
  fireEvent.change(screen.getByRole("textbox", { name: "Promo code" }), {
    target: { value: "WELCOME" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  const remove = await screen.findByRole("button", { name: "Remove promo code WELCOME" });
  expect(remove).toBeVisible();
  expect(addPromoCode).toHaveBeenCalledWith("WELCOME");
  fireEvent.click(remove);
  await waitFor(() => expect(removePromoCode).toHaveBeenCalledWith("WELCOME"));
});

it("shows the selected shipping charge and a final total when shipping is known", async () => {
  mockGetCart.mockResolvedValueOnce({
    ...mockCart,
    item_subtotal: 3000,
    shipping_subtotal: 150,
    subtotal: 3150,
    shipping_total: 150,
    total: 3150,
    shipping_methods: [{ id: "sm_1", name: "Standard Shipping", amount: 150 }],
  });
  renderWithProviders(<CartPage />);
  expect(await screen.findByText("Total")).toBeInTheDocument();
  expect(screen.getByText("KSh150.00")).toBeInTheDocument();
  expect(screen.queryByText("Calculated at checkout")).not.toBeInTheDocument();
  expect(screen.queryByText(/within 24 hours/i)).not.toBeInTheDocument();
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
