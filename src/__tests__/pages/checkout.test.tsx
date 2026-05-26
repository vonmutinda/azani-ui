import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  it("exposes accessible names for checkout address fields", async () => {
    renderWithProviders(<CheckoutPage />);

    await screen.findByText("Shipping Address");

    expect(screen.getByRole("textbox", { name: /first name/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /last name/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /phone/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /street address/i })).toBeInTheDocument();
  });

  it("keeps the checkout flow constrained on mobile-sized layouts", async () => {
    renderWithProviders(<CheckoutPage />);

    await screen.findByText("Shipping Address");

    expect(screen.getByTestId("checkout-flow-grid")).toHaveClass(
      "grid-cols-[minmax(0,1fr)]",
      "max-w-full",
    );
    expect(screen.getByTestId("checkout-primary-column")).toHaveClass("min-w-0", "max-w-full");
    expect(screen.getByTestId("checkout-address-form")).toHaveClass("min-w-0", "max-w-full");
    expect(screen.getByTestId("checkout-order-summary")).toHaveClass("min-w-0", "max-w-full");
  });

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

  it("initiates M-Pesa Express session with pp_mpesa_mpesa provider and mpesa_phone", async () => {
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [{ id: "ps_1", provider_id: "pp_mpesa_mpesa", status: "pending" }],
      },
    });

    renderWithProviders(<CheckoutPage />);

    await continueToPayment();

    const phoneInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el.getAttribute("id") === "checkout-mpesa-phone");
    expect(phoneInputs).toHaveLength(1);
    fireEvent.change(phoneInputs[0], { target: { value: "+254712345678" } });

    fireEvent.click(screen.getByRole("button", { name: "Continue to Review" }));

    await screen.findByText("Review & Place Order");
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    await waitFor(() => expect(mockInitializePaymentSession).toHaveBeenCalled());
    expect(mockInitializePaymentSession).toHaveBeenCalledWith({
      providerId: "pp_mpesa_mpesa",
      data: { mpesa_phone: "+254712345678" },
    });
  }, 30_000);

  it("does not create an order for M-Pesa Express while payment is only authorized", async () => {
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [{ id: "ps_1", provider_id: "pp_mpesa_mpesa", status: "authorized" }],
      },
    });

    renderWithProviders(<CheckoutPage />);

    await continueToPayment();

    fireEvent.click(screen.getByRole("button", { name: "Continue to Review" }));

    await screen.findByText("Review & Place Order");
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    await waitFor(() => expect(mockInitializePaymentSession).toHaveBeenCalled());
    expect(mockCompleteCart).not.toHaveBeenCalled();
    expect(await screen.findByText("Waiting for M-Pesa confirmation")).toBeInTheDocument();
  }, 30_000);

  it("does not create an order for M-Pesa Express while payment is still pending", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    await waitFor(() => expect(mockInitializePaymentSession).toHaveBeenCalled());
    expect(mockCompleteCart).not.toHaveBeenCalled();
    expect(await screen.findByText("Waiting for M-Pesa confirmation")).toBeInTheDocument();
  }, 30_000);

  it("shows Express pending state as waiting for captured payment", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    expect(await screen.findByText("Waiting for M-Pesa confirmation")).toBeInTheDocument();
    expect(
      screen.getByText(/order will be created after payment is captured/i),
    ).toBeInTheDocument();
    expect(mockCompleteCart).not.toHaveBeenCalled();
  }, 30_000);

  it("keeps Paybill order creation in an awaiting-payment confirmation state", async () => {
    mockCompleteCart.mockResolvedValue({
      type: "order",
      order: { id: "order_1", display_id: 1001, created_at: "2026-05-17T00:00:00.000Z" },
    });

    renderWithProviders(<CheckoutPage />);

    await continueToPayment();

    fireEvent.click(screen.getByLabelText(/Pay via M-Pesa Paybill/i));
    fireEvent.click(screen.getByRole("button", { name: "Continue to Review" }));

    await screen.findByText("Review & Place Order");
    fireEvent.click(screen.getByRole("button", { name: "Place Order" }));

    expect(await screen.findByText("Awaiting manual payment")).toBeInTheDocument();
    expect(screen.getByText("Account no.")).toBeInTheDocument();
    expect(screen.getByText("AZN-2605-1001R1")).toBeInTheDocument();
    expect(mockInitializePaymentSession).toHaveBeenCalledTimes(1);
    expect(mockCompleteCart).toHaveBeenCalledTimes(1);
  }, 30_000);

  it("surfaces a canceled M-Pesa payment with an option to retry", async () => {
    const canceledCart = {
      ...mockCart,
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          {
            id: "ps_1",
            provider_id: "pp_mpesa_mpesa",
            status: "pending",
            data: { status: "canceled", resultDesc: "Request cancelled by user" },
          },
        ],
      },
    };
    mockGetCart.mockResolvedValueOnce({
      ...mockCart,
      region: mockRegion,
      subtotal: 3000,
      total: 3000,
    });
    mockGetCart.mockResolvedValue(canceledCart);
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
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    expect(await screen.findByText(/Payment was canceled/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try Again/i })).toBeInTheDocument();
    expect(mockCompleteCart).not.toHaveBeenCalled();
  }, 30_000);

  it("surfaces a failed M-Pesa payment with the result description", async () => {
    const failedCart = {
      ...mockCart,
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          {
            id: "ps_1",
            provider_id: "pp_mpesa_mpesa",
            status: "pending",
            data: { status: "failed", resultDesc: "Insufficient balance" },
          },
        ],
      },
    };
    mockGetCart.mockResolvedValueOnce({
      ...mockCart,
      region: mockRegion,
      subtotal: 3000,
      total: 3000,
    });
    mockGetCart.mockResolvedValue(failedCart);
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
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    expect(await screen.findByText(/Payment failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Insufficient balance/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try Again/i })).toBeInTheDocument();
  }, 30_000);

  it("retries the STK Push from a canceled payment by re-sending the prompt", async () => {
    const canceledCart = {
      ...mockCart,
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          {
            id: "ps_1",
            provider_id: "pp_mpesa_mpesa",
            status: "pending",
            data: { status: "canceled" },
          },
        ],
      },
    };
    mockGetCart.mockResolvedValueOnce({
      ...mockCart,
      region: mockRegion,
      subtotal: 3000,
      total: 3000,
    });
    mockGetCart.mockResolvedValue(canceledCart);
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
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    await screen.findByText(/Payment was canceled/i);
    expect(mockInitializePaymentSession).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));

    await waitFor(() => expect(mockInitializePaymentSession).toHaveBeenCalledTimes(2));
  }, 30_000);

  it("shows initial elapsed-seconds badge while waiting", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    expect(await screen.findByText(/Pending payment · 0s/)).toBeInTheDocument();
  }, 30_000);

  describe("STK Push timeout UX (fake timers)", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    async function reachPendingStateUnderFakeTimers() {
      // Fake setInterval/clearInterval/Date from the start so the page's
      // elapsed-tick interval is created under our control. setTimeout is left
      // real so testing-library's waitFor polling still progresses.
      vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });

      mockInitializePaymentSession.mockResolvedValue({
        payment_collection: {
          id: "pc_1",
          payment_sessions: [{ id: "ps_1", provider_id: "pp_mpesa_mpesa", status: "pending" }],
        },
      });
      // Timeout-UX tests don't want the poke's success path to fire. Override
      // the suite-wide default so the poke gets the realistic "not_allowed"
      // 400 from a still-pending session.
      mockCompleteCart.mockRejectedValue(
        Object.assign(new Error("not authorized with the provider"), {
          status: 400,
          type: "not_allowed",
        }),
      );

      renderWithProviders(<CheckoutPage />);
      await continueToPayment();
      fireEvent.click(screen.getByRole("button", { name: "Continue to Review" }));
      await screen.findByText("Review & Place Order");
      fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));
      await screen.findByText("Waiting for M-Pesa confirmation");
    }

    it("swaps to 'Taking longer than expected' with Try Again past 60s", async () => {
      await reachPendingStateUnderFakeTimers();

      await act(async () => {
        vi.advanceTimersByTime(60_000);
      });

      expect(await screen.findByText(/Taking longer than expected/i)).toBeInTheDocument();
      expect(screen.queryByText("Waiting for M-Pesa confirmation")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Try Again/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Check Payment Status/i })).toBeInTheDocument();
    }, 30_000);

    it("finalizes the order when the cart/complete poke returns success while cart is still pending", async () => {
      // Setup: STK push fires, cart stays pending (no captured status on payment_sessions).
      // The background poke (15s interval) calls completeCart which the backend can
      // complete out-of-band once the Daraja callback authorizes the session. The
      // poke's response then carries the order — UI must flip to order-placed.
      vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });

      mockInitializePaymentSession.mockResolvedValue({
        payment_collection: {
          id: "pc_1",
          payment_sessions: [{ id: "ps_1", provider_id: "pp_mpesa_mpesa", status: "pending" }],
        },
      });
      mockCompleteCart.mockResolvedValue({
        type: "order",
        order: { id: "order_1", display_id: 1001, created_at: "2026-05-26T12:54:19.000Z" },
      });

      renderWithProviders(<CheckoutPage />);
      await continueToPayment();
      fireEvent.click(screen.getByRole("button", { name: "Continue to Review" }));
      await screen.findByText("Review & Place Order");
      fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));
      await screen.findByText("Waiting for M-Pesa confirmation");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });

      expect(await screen.findByText("Order placed")).toBeInTheDocument();
    }, 30_000);

    it("shows the timed-out branch past 90s with only a Try Again action", async () => {
      await reachPendingStateUnderFakeTimers();

      await act(async () => {
        vi.advanceTimersByTime(90_000);
      });

      expect(await screen.findByText(/STK Push timed out/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Try Again/i })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Check Payment Status/i }),
      ).not.toBeInTheDocument();
    }, 30_000);
  });

  it("creates the order when a pending M-Pesa Express payment becomes captured", async () => {
    const capturedCart = {
      ...mockCart,
      payment_collection: {
        id: "pc_1",
        payment_sessions: [{ id: "ps_1", provider_id: "pp_mpesa_mpesa", status: "captured" }],
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
        payment_sessions: [{ id: "ps_1", provider_id: "pp_mpesa_mpesa", status: "pending" }],
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
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    await screen.findByText("Waiting for M-Pesa confirmation");
    await waitFor(() => expect(mockCompleteCart).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Order placed")).toBeInTheDocument();
    expect(screen.getByText(/keep this order number for support/i)).toBeInTheDocument();
    expect(screen.queryByText(/ready in your account/i)).not.toBeInTheDocument();
  }, 30_000);
});
