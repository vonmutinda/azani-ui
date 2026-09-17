import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CheckoutPage from "@/app/checkout/page";
import { renderWithProviders } from "../test-utils";
import { mockCart, mockProduct, mockRegion } from "../fixtures";

const mockGetCart = vi.fn();
const mockGetProductsByIds = vi.fn();
const mockUpdateCart = vi.fn();
const mockGetRegions = vi.fn();
const mockGetCustomer = vi.fn();
const mockGetCustomerAddresses = vi.fn();
const mockGetShippingOptions = vi.fn();
const mockAddShippingMethod = vi.fn();
const mockInitializePaymentSession = vi.fn();
const mockCompleteCart = vi.fn();

vi.mock("@/lib/medusa-api", () => ({
  getCart: (...args: unknown[]) => mockGetCart(...args),
  getProductsByIds: (...args: unknown[]) => mockGetProductsByIds(...args),
  updateCart: (...args: unknown[]) => mockUpdateCart(...args),
  getRegions: (...args: unknown[]) => mockGetRegions(...args),
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  getCustomerAddresses: (...args: unknown[]) => mockGetCustomerAddresses(...args),
  getShippingOptions: (...args: unknown[]) => mockGetShippingOptions(...args),
  addShippingMethod: (...args: unknown[]) => mockAddShippingMethod(...args),
  initializePaymentSession: (...args: unknown[]) => mockInitializePaymentSession(...args),
  completeCart: (...args: unknown[]) => mockCompleteCart(...args),
}));

vi.mock("@/lib/http", () => ({
  clearStoredCartId: vi.fn(),
}));

describe("CheckoutPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCart.mockResolvedValue({
      ...mockCart,
      region: mockRegion,
      subtotal: 3000,
      total: 3000,
    });
    mockGetProductsByIds.mockResolvedValue([mockProduct]);
    mockGetCustomer.mockResolvedValue(null);
    mockGetCustomerAddresses.mockResolvedValue([]);
    mockGetRegions.mockResolvedValue({ regions: [mockRegion], count: 1 });
    mockGetShippingOptions.mockResolvedValue({
      shipping_options: [{ id: "so_standard", name: "Standard Shipping", amount: 150 }],
    });
    mockUpdateCart.mockResolvedValue({ cart: mockCart });
    mockAddShippingMethod.mockResolvedValue({ cart: mockCart });
    mockInitializePaymentSession.mockResolvedValue({ payment_collection: { id: "pc_1" } });
    mockCompleteCart.mockResolvedValue({ type: "order" });
  });

  it("blocks checkout when a retired product still has cached stock in the cart", async () => {
    mockGetCart.mockResolvedValue({
      ...mockCart,
      items: mockCart.items.map((item) => ({ ...item, variant: mockProduct.variants![0] })),
    });
    mockGetProductsByIds.mockResolvedValue([]);
    renderWithProviders(<CheckoutPage />);
    await screen.findByText(/Some items in your cart are no longer available/);
    expect(screen.getByRole("button", { name: "Continue to Shipping" })).toBeDisabled();
  });

  it("blocks a removed size instead of trusting the cached cart variant", async () => {
    mockGetCart.mockResolvedValue({
      ...mockCart,
      items: mockCart.items.map((item) => ({ ...item, variant: mockProduct.variants![0] })),
    });
    mockGetProductsByIds.mockResolvedValue([{ ...mockProduct, variants: [] }]);
    renderWithProviders(<CheckoutPage />);
    await screen.findByText(/Some items in your cart are no longer available/);
    expect(screen.getByRole("button", { name: "Continue to Shipping" })).toBeDisabled();
  });

  it("waits for the clothing catalogue before allowing checkout to continue", async () => {
    mockGetProductsByIds.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CheckoutPage />);
    await screen.findByText("Shipping Address");
    expect(screen.getByRole("button", { name: "Continue to Shipping" })).toBeDisabled();
  });

  it("blocks checkout when the requested quantity exceeds current managed stock", async () => {
    const liveVariant = {
      ...mockProduct.variants![0],
      manage_inventory: true,
      allow_backorder: false,
      inventory_quantity: 1,
    };
    mockGetCart.mockResolvedValue({
      ...mockCart,
      region: mockRegion,
      items: mockCart.items.map((item) => ({ ...item, quantity: 2, variant: liveVariant })),
    });
    mockGetProductsByIds.mockResolvedValue([{ ...mockProduct, variants: [liveVariant] }]);

    renderWithProviders(<CheckoutPage />);

    await screen.findByText(/Some items in your cart are no longer available/);
    expect(screen.getByRole("button", { name: "Continue to Shipping" })).toBeDisabled();
  });

  it("allows checkout when current stock covers a quantity above the quantity control cap", async () => {
    const liveVariant = {
      ...mockProduct.variants![0],
      manage_inventory: true,
      allow_backorder: false,
      inventory_quantity: 20,
    };
    mockGetCart.mockResolvedValue({
      ...mockCart,
      region: mockRegion,
      items: mockCart.items.map((item) => ({ ...item, quantity: 12, variant: liveVariant })),
    });
    mockGetProductsByIds.mockResolvedValue([{ ...mockProduct, variants: [liveVariant] }]);

    renderWithProviders(<CheckoutPage />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue to Shipping" })).toBeEnabled(),
    );
    expect(
      screen.queryByText(/Some items in your cart are no longer available/),
    ).not.toBeInTheDocument();
  });

  it("blocks checkout and offers a retry when availability cannot be checked", async () => {
    mockGetProductsByIds.mockRejectedValueOnce(new Error("Catalogue unavailable"));

    renderWithProviders(<CheckoutPage />);

    await screen.findByText(/couldn’t check item availability/i);
    expect(
      screen.queryByText(/Some items in your cart are no longer available/),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to Shipping" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue to Shipping" })).toBeEnabled(),
    );
  });

  async function continueToPayment() {
    await screen.findByText("Shipping Address");

    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "Amina" } });
    fireEvent.change(textboxes[1], { target: { value: "Otieno" } });
    fireEvent.change(textboxes[3], { target: { value: "+254712345678" } });
    fireEvent.change(textboxes[4], { target: { value: "Westlands Road" } });

    fireEvent.click(screen.getByRole("button", { name: "Continue to Shipping" }));

    await screen.findByText("Shipping Method");
    const standardShipping = await screen.findByText("Standard Shipping");
    fireEvent.click(standardShipping.closest("button")!);

    await screen.findByText("Payment Method");
  }

  it("lets guests continue without sending an empty optional email", async () => {
    renderWithProviders(<CheckoutPage />);

    await screen.findByText("Shipping Address");

    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "Amina" } });
    fireEvent.change(textboxes[1], { target: { value: "Otieno" } });
    fireEvent.change(textboxes[3], { target: { value: "+254712345678" } });
    fireEvent.change(textboxes[4], { target: { value: "Westlands Road" } });

    fireEvent.click(screen.getByRole("button", { name: "Continue to Shipping" }));

    await waitFor(() => expect(mockUpdateCart).toHaveBeenCalled());
    expect(mockUpdateCart.mock.calls[0][0]).toEqual(
      expect.not.objectContaining({ email: expect.anything() }),
    );
    expect(mockUpdateCart.mock.calls[0][0]).toMatchObject({
      shipping_address: expect.objectContaining({
        first_name: "Amina",
        last_name: "Otieno",
        phone: "+254712345678",
        address_1: "Westlands Road",
      }),
    });
  }, 30_000);

  it("does not create an order for M-Pesa Express while payment is only authorized", async () => {
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [{ id: "ps_1", provider_id: "pp_mpesa", status: "authorized" }],
      },
    });

    renderWithProviders(<CheckoutPage />);

    await continueToPayment();

    fireEvent.click(screen.getByRole("button", { name: "Continue to Review" }));

    await screen.findByText("Review & Place Order");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    await waitFor(() => expect(mockInitializePaymentSession).toHaveBeenCalled());
    expect(mockCompleteCart).not.toHaveBeenCalled();
    expect(await screen.findByText("Payment Request Sent")).toBeInTheDocument();
  }, 30_000);

  it("does not create an order for M-Pesa Express while payment is still pending", async () => {
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [{ id: "ps_1", provider_id: "pp_mpesa", status: "pending" }],
      },
    });

    renderWithProviders(<CheckoutPage />);

    await continueToPayment();

    fireEvent.click(screen.getByRole("button", { name: "Continue to Review" }));

    await screen.findByText("Review & Place Order");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    await waitFor(() => expect(mockInitializePaymentSession).toHaveBeenCalled());
    expect(mockCompleteCart).not.toHaveBeenCalled();
    expect(await screen.findByText("Payment Request Sent")).toBeInTheDocument();
  }, 30_000);

  it("creates the order when a pending M-Pesa Express payment becomes captured", async () => {
    const capturedCart = {
      ...mockCart,
      payment_collection: {
        id: "pc_1",
        payment_sessions: [{ id: "ps_1", provider_id: "pp_mpesa", status: "captured" }],
      },
    };
    mockGetCart.mockResolvedValueOnce({
      ...mockCart,
      region: mockRegion,
      subtotal: 3000,
      total: 3000,
    });
    mockGetCart.mockResolvedValue(capturedCart);
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [{ id: "ps_1", provider_id: "pp_mpesa", status: "pending" }],
      },
    });
    mockCompleteCart.mockResolvedValue({
      type: "order",
      order: { id: "order_1", display_id: 1001, created_at: "2026-05-17T00:00:00.000Z" },
    });

    renderWithProviders(<CheckoutPage />);

    await continueToPayment();

    fireEvent.click(screen.getByRole("button", { name: "Continue to Review" }));

    await screen.findByText("Review & Place Order");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    await screen.findByText("Payment Request Sent");
    await waitFor(() => expect(mockCompleteCart).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Order Placed!")).toBeInTheDocument();
  }, 30_000);

  it("routes M-Pesa Express to the pp_mpesa_mpesa provider with the payer phone", async () => {
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [{ id: "ps_1", provider_id: "pp_mpesa_mpesa", status: "pending" }],
      },
    });

    renderWithProviders(<CheckoutPage />);

    await continueToPayment();

    fireEvent.click(screen.getByRole("button", { name: "Continue to Review" }));

    await screen.findByText("Review & Place Order");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    await waitFor(() =>
      expect(mockInitializePaymentSession).toHaveBeenCalledWith({
        providerId: "pp_mpesa_mpesa",
        data: { mpesa_phone: "+254712345678" },
      }),
    );
  }, 30_000);

  it("requires accepting the terms before the order can be placed", async () => {
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [{ id: "ps_1", provider_id: "pp_mpesa_mpesa", status: "pending" }],
      },
    });

    renderWithProviders(<CheckoutPage />);

    await continueToPayment();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Review" }));
    await screen.findByText("Review & Place Order");

    const placeOrder = screen.getByRole("button", { name: "Send M-Pesa Prompt" });
    expect(placeOrder).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(placeOrder).toBeEnabled();
    expect(mockInitializePaymentSession).not.toHaveBeenCalled();
  }, 30_000);

  it("returns to the review step from the pending screen instead of leaving checkout", async () => {
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [{ id: "ps_1", provider_id: "pp_mpesa_mpesa", status: "pending" }],
      },
    });

    renderWithProviders(<CheckoutPage />);

    await continueToPayment();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Review" }));
    await screen.findByText("Review & Place Order");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    await screen.findByText("Payment Request Sent");
    fireEvent.click(screen.getByRole("button", { name: /Back to Review/i }));

    expect(await screen.findByText("Review & Place Order")).toBeInTheDocument();
  }, 30_000);
});
