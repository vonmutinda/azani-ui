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
  getCheckoutCart: (...args: unknown[]) => mockGetCart(...args),
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
  afterEach(() => vi.useRealTimers());
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
    mockCompleteCart.mockResolvedValue({ type: "order", order: { id: "order_1" } });
  });

  it("associates address labels, autofill and required semantics with their fields", async () => {
    renderWithProviders(<CheckoutPage />);
    await screen.findByText("Shipping Address");
    for (const [label, autocomplete, required] of [
      ["First Name", "given-name", true],
      ["Last Name", "family-name", true],
      ["Email", "email", false],
      ["Phone", "tel", true],
      ["Street Address", "street-address", true],
    ] as const) {
      const input = screen.getByRole("textbox", { name: new RegExp(`^${label}`) });
      expect(input).toHaveAttribute("id");
      expect(input).toHaveAttribute("autocomplete", autocomplete);
      if (required) expect(input).toBeRequired();
      else expect(input).not.toBeRequired();
    }
  });

  it("links native field validation errors and clears them when corrected", async () => {
    renderWithProviders(<CheckoutPage />);
    const firstName = await screen.findByRole("textbox", { name: /^First Name/ });
    fireEvent.invalid(firstName);
    expect(firstName).toHaveAttribute("aria-invalid", "true");
    expect(firstName).toHaveAccessibleDescription(/.+/);
    fireEvent.change(firstName, { target: { value: "Amina" } });
    expect(firstName).not.toHaveAttribute("aria-invalid", "true");
    expect(firstName).not.toHaveAttribute("aria-describedby");
    expect(mockUpdateCart).not.toHaveBeenCalled();
  });

  it("labels the amount before shipping and distinguishes a confirmed free method", async () => {
    mockGetCart.mockResolvedValueOnce({ ...mockCart, region: mockRegion });
    const { unmount } = renderWithProviders(<CheckoutPage />);
    expect(await screen.findByText("Total before shipping")).toBeInTheDocument();
    expect(screen.getByText("Calculated after your address")).toBeInTheDocument();
    unmount();
    mockGetCart.mockResolvedValue({
      ...mockCart,
      region: mockRegion,
      shipping_methods: [{ id: "sm_free", name: "Free Shipping", amount: 0 }],
    });
    renderWithProviders(<CheckoutPage />);
    expect(await screen.findByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.queryByText("Calculated after your address")).not.toBeInTheDocument();
  });

  it("shows product identity and named size and colour without repeating the unit price", async () => {
    mockGetProductsByIds.mockResolvedValue([
      {
        ...mockProduct,
        title: "Cotton everyday long sleeve shirt",
        options: [
          { id: "size", title: "Size", product_id: "prod_01", values: [] },
          { id: "colour", title: "Color", product_id: "prod_01", values: [] },
        ],
        variants: [
          {
            ...mockProduct.variants![0],
            title: "6 / Navy",
            options: [
              { id: "size_6", option_id: "size", value: "6" },
              { id: "navy", option_id: "colour", value: "Navy" },
            ],
          },
        ],
      },
    ]);
    renderWithProviders(<CheckoutPage />);
    expect(await screen.findByText("Cotton everyday long sleeve shirt")).toBeInTheDocument();
    expect(screen.getByText("Size: 6")).toBeInTheDocument();
    expect(screen.getByText("Colour: Navy")).toBeInTheDocument();
    expect(screen.getByText("Quantity: 2")).toBeInTheDocument();
    expect(screen.queryByText("KSh1,500.00")).not.toBeInTheDocument();
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

  it("restores the draft shipping address when returning to checkout", async () => {
    mockGetCart.mockResolvedValue({
      ...mockCart,
      region: mockRegion,
      email: "amina@example.com",
      shipping_address: {
        first_name: "Amina",
        last_name: "Otieno",
        address_1: "Coast Road",
        city: "Mombasa",
        province: "",
        postal_code: "80100",
        phone: "+254712345678",
        country_code: "ke",
      },
    });
    renderWithProviders(<CheckoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Back to Address" }));
    expect(screen.getByRole("textbox", { name: /^City or town/ })).toHaveValue("Mombasa");
    expect(screen.getByRole("textbox", { name: /^Street Address/ })).toHaveValue("Coast Road");
    expect(screen.queryByRole("textbox", { name: /^County/ })).not.toBeInTheDocument();
  });

  it("disables Paybill when no business number is configured", async () => {
    renderWithProviders(<CheckoutPage />);
    await continueToPayment();
    expect(screen.getByRole("radio", { name: "Pay via M-Pesa Paybill" })).toBeDisabled();
  });

  it("accepts a saved address with a city and no county", async () => {
    mockGetCustomer.mockResolvedValue({ id: "customer_1", email: "amina@example.com" });
    mockGetCustomerAddresses.mockResolvedValue([
      {
        id: "address_1",
        first_name: "Amina",
        last_name: "Otieno",
        phone: "+254712345678",
        address_1: "Coast Road",
        city: "Mombasa",
        province: "",
        country_code: "ke",
      },
    ]);
    renderWithProviders(<CheckoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Continue with Selected Address" }));
    expect(await screen.findByText("Shipping Method")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Complete selected address" }),
    ).not.toBeInTheDocument();
  });

  it("offers Nairobi express shipping using the city without asking for a county", async () => {
    mockGetShippingOptions.mockResolvedValue({
      shipping_options: [
        { id: "so_standard", name: "Standard Shipping", amount: 150 },
        { id: "so_express", name: "Express Shipping", amount: 500 },
      ],
    });
    mockUpdateCart.mockImplementation(async (input) => {
      const updated = { ...mockCart, region: mockRegion, shipping_address: input.shipping_address };
      mockGetCart.mockResolvedValue(updated);
      return { cart: updated };
    });
    renderWithProviders(<CheckoutPage />);
    await screen.findByText("Shipping Address");
    expect(screen.queryByRole("textbox", { name: /^County/ })).not.toBeInTheDocument();
    await continueToShipping();
    expect(await screen.findByText("Express Shipping")).toBeInTheDocument();
  });

  it("requires a city on a saved address and lets the customer complete it", async () => {
    mockGetCustomer.mockResolvedValue({ id: "customer_1", email: "amina@example.com" });
    mockGetCustomerAddresses.mockResolvedValue([
      {
        id: "address_1",
        first_name: "Amina",
        last_name: "Otieno",
        phone: "+254712345678",
        address_1: "Coast Road",
        city: "",
        province: "",
        country_code: "ke",
      },
    ]);
    renderWithProviders(<CheckoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Continue with Selected Address" }));
    expect(await screen.findByText(/Complete your saved address/)).toBeInTheDocument();
    expect(mockUpdateCart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Complete selected address" }));
    expect(screen.getByRole("textbox", { name: /^City or town/ })).toHaveValue("");
    expect(screen.queryByRole("textbox", { name: /^County/ })).not.toBeInTheDocument();
  });

  it("refreshes delivery services immediately after the destination changes", async () => {
    let destination = "Nairobi";
    const address = {
      first_name: "Amina",
      last_name: "Otieno",
      phone: "+254712345678",
      address_1: "Test Road",
      city: destination,
      province: destination,
      country_code: "ke",
    };
    mockUpdateCart.mockImplementation(async (input) => {
      destination = input.shipping_address.city;
      const updated = { ...mockCart, region: mockRegion, shipping_address: input.shipping_address };
      mockGetCart.mockResolvedValue(updated);
      return { cart: updated };
    });
    mockGetShippingOptions.mockImplementation(async () => ({
      shipping_options: [{ id: "so_local", name: destination + " delivery", amount: 150 }],
    }));
    mockGetCart.mockResolvedValue({ ...mockCart, region: mockRegion, shipping_address: address });
    renderWithProviders(<CheckoutPage />);
    await screen.findByText("Nairobi delivery");
    fireEvent.click(screen.getByRole("button", { name: "Back to Address" }));
    fireEvent.change(screen.getByRole("textbox", { name: /^City or town/ }), {
      target: { value: "Mombasa" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue to Shipping" }));
    expect(await screen.findByText("Mombasa delivery")).toBeInTheDocument();
    expect(screen.queryByText("Nairobi delivery")).not.toBeInTheDocument();
    expect(mockUpdateCart).toHaveBeenLastCalledWith(
      expect.objectContaining({
        shipping_address: expect.objectContaining({ city: "Mombasa", province: "" }),
      }),
    );
    expect(mockGetShippingOptions.mock.calls.length).toBeGreaterThan(1);
  });

  it("preserves the draft recipient when a saved family address has the same location and phone", async () => {
    const draft = {
      first_name: "Amina",
      last_name: "Otieno",
      address_1: "Test Road",
      phone: "+254712345678",
      city: "Nairobi",
      province: "Nairobi",
      country_code: "ke",
    };
    mockGetCart.mockResolvedValue({ ...mockCart, region: mockRegion, shipping_address: draft });
    mockGetCustomer.mockResolvedValue({ id: "customer_1", email: "amina@example.com" });
    mockGetCustomerAddresses.mockResolvedValue([{ ...draft, id: "address_1", first_name: "Sara" }]);
    renderWithProviders(<CheckoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Back to Address" }));
    expect(await screen.findByRole("textbox", { name: /^First Name/ })).toHaveValue("Amina");
    fireEvent.click(screen.getByRole("button", { name: "Continue to Shipping" }));
    await waitFor(() =>
      expect(mockUpdateCart).toHaveBeenCalledWith(
        expect.objectContaining({
          shipping_address: expect.objectContaining({ first_name: "Amina" }),
        }),
      ),
    );
  });

  async function continueToShipping() {
    await screen.findByText("Shipping Address");

    fireEvent.change(screen.getByRole("textbox", { name: /^First Name/ }), {
      target: { value: "Amina" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^Last Name/ }), {
      target: { value: "Otieno" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^Phone/ }), {
      target: { value: "+254712345678" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^Street Address/ }), {
      target: { value: "Westlands Road" },
    });

    fireEvent.change(screen.getByRole("textbox", { name: /^City or town/ }), {
      target: { value: "Nairobi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue to Shipping" }));

    await screen.findByText("Shipping Method");
  }

  async function continueToPayment() {
    await continueToShipping();
    const standardShipping = await screen.findByText("Standard Shipping");
    fireEvent.click(standardShipping.closest("button")!);

    await screen.findByText("Payment Method");
  }

  it("names both payment choices and associates the payer phone with its own label", async () => {
    renderWithProviders(<CheckoutPage />);
    await continueToPayment();
    expect(screen.getByRole("radio", { name: "M-Pesa Express" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Pay via M-Pesa Paybill" })).not.toBeChecked();
    const phone = screen.getByRole("textbox", { name: /^M-Pesa Phone Number/ });
    expect(phone).toBeRequired();
    expect(phone).toHaveAttribute("autocomplete", "tel");
    expect(phone).toHaveValue("+254712345678");
    expect(mockInitializePaymentSession).not.toHaveBeenCalled();
  });

  it("lets guests continue without sending an empty optional email", async () => {
    renderWithProviders(<CheckoutPage />);

    await screen.findByText("Shipping Address");

    fireEvent.change(screen.getByRole("textbox", { name: /^First Name/ }), {
      target: { value: "Amina" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^Last Name/ }), {
      target: { value: "Otieno" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^Phone/ }), {
      target: { value: "+254712345678" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^Street Address/ }), {
      target: { value: "Westlands Road" },
    });

    fireEvent.change(screen.getByRole("textbox", { name: /^City or town/ }), {
      target: { value: "Nairobi" },
    });
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

  it("completes an authorized Family Bank session after backend capture", async () => {
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          { id: "ps_1", provider_id: "pp_family_bank_family_bank", status: "authorized" },
        ],
      },
    });

    renderWithProviders(<CheckoutPage />);

    await continueToPayment();

    fireEvent.click(screen.getByRole("button", { name: "Continue to Review" }));

    await screen.findByText("Review & Place Order");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    await waitFor(() => expect(mockInitializePaymentSession).toHaveBeenCalled());
    await waitFor(() => expect(mockCompleteCart).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Order Placed!")).toBeInTheDocument();
  }, 30_000);

  it("does not create an order for M-Pesa Express while payment is still pending", async () => {
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          { id: "ps_1", provider_id: "pp_family_bank_family_bank", status: "pending" },
        ],
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
        payment_sessions: [
          { id: "ps_1", provider_id: "pp_family_bank_family_bank", status: "captured" },
        ],
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
        payment_sessions: [
          { id: "ps_1", provider_id: "pp_family_bank_family_bank", status: "pending" },
        ],
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

  it("routes M-Pesa Express to the Family Bank provider with the payer phone", async () => {
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          { id: "ps_1", provider_id: "pp_family_bank_family_bank", status: "pending" },
        ],
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
        providerId: "pp_family_bank_family_bank",
        data: { mpesa_phone: "+254712345678" },
      }),
    );
  }, 30_000);

  it("requires accepting the terms before the order can be placed", async () => {
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          { id: "ps_1", provider_id: "pp_family_bank_family_bank", status: "pending" },
        ],
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

  it("keeps delivery and payer edits inaccessible while a payment is unresolved", async () => {
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          { id: "ps_1", provider_id: "pp_family_bank_family_bank", status: "pending" },
        ],
      },
    });

    renderWithProviders(<CheckoutPage />);

    await continueToPayment();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Review" }));
    await screen.findByText("Review & Place Order");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));

    await screen.findByText("Payment Request Sent");
    expect(screen.queryByRole("button", { name: /Back to Review/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to Payment" })).not.toBeInTheDocument();
    expect(screen.getByText(/Cart, delivery and payer details are locked/)).toBeInTheDocument();
  }, 30_000);

  async function sendPrompt() {
    renderWithProviders(<CheckoutPage />);
    await continueToPayment();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Review" }));
    await screen.findByText("Review & Place Order");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Send M-Pesa Prompt" }));
    await waitFor(() => expect(mockInitializePaymentSession).toHaveBeenCalledTimes(1));
  }

  it.each(["pp_system_default", "pp_mpesa_mpesa"])(
    "ignores captured sessions from %s",
    async (provider_id) => {
      mockInitializePaymentSession.mockResolvedValue({
        payment_collection: {
          id: "pc_1",
          payment_sessions: [{ id: "ps_1", provider_id, status: "captured" }],
        },
      });
      await sendPrompt();
      expect(await screen.findByText("Payment Request Sent")).toBeInTheDocument();
      expect(mockCompleteCart).not.toHaveBeenCalled();
    },
  );

  it.each([
    { type: "cart", error: { message: "Payment confirmation is still processing" } },
    { type: "order" },
  ])("does not announce success for an incomplete completion response %#", async (response) => {
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          { id: "ps_1", provider_id: "pp_family_bank_family_bank", status: "authorized" },
        ],
      },
    });
    mockCompleteCart.mockResolvedValue(response);
    await sendPrompt();
    await waitFor(() => expect(mockCompleteCart).toHaveBeenCalled());
    expect(screen.queryByText("Order Placed!")).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Check order status" })).toBeInTheDocument();
    expect(mockInitializePaymentSession).toHaveBeenCalledTimes(1);
  });

  it("keeps the captured payment and retries order completion after a callback conflict", async () => {
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          { id: "ps_1", provider_id: "pp_family_bank_family_bank", status: "authorized" },
        ],
      },
    });
    mockCompleteCart.mockRejectedValueOnce(
      Object.assign(new Error("Order is processing"), { status: 409 }),
    );
    await sendPrompt();
    fireEvent.click(await screen.findByRole("button", { name: "Check order status" }));
    expect(await screen.findByText("Order Placed!")).toBeInTheDocument();
    expect(mockInitializePaymentSession).toHaveBeenCalledTimes(1);
  });

  it("disables standalone Paybill with useful availability copy", async () => {
    renderWithProviders(<CheckoutPage />);
    await continueToPayment();
    expect(screen.getByRole("radio", { name: "Pay via M-Pesa Paybill" })).toBeDisabled();
    expect(
      screen.getByText(/Paybill checkout is not available.*M-Pesa Express/),
    ).toBeInTheDocument();
  });

  it("never completes a pending or timed-out payment on an interval", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    mockInitializePaymentSession.mockResolvedValue({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          { id: "ps_1", provider_id: "pp_family_bank_family_bank", status: "pending" },
        ],
      },
    });
    await sendPrompt();
    await screen.findByText("Payment Request Sent");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(95_000);
    });
    expect(screen.getByText("STK Push timed out")).toBeInTheDocument();
    expect(mockCompleteCart).not.toHaveBeenCalled();
    expect(mockInitializePaymentSession).toHaveBeenCalledTimes(1);
  });

  it.each(["failed", "canceled"])(
    "surfaces a Family Bank %s outcome without completing",
    async (status) => {
      mockGetCart.mockResolvedValue({
        ...mockCart,
        region: mockRegion,
        payment_collection: {
          id: "pc_1",
          payment_sessions: [
            {
              id: "ps_1",
              provider_id: "pp_family_bank_family_bank",
              status: status === "failed" ? "error" : "canceled",
              data: { status },
            },
          ],
        },
      });
      mockInitializePaymentSession.mockResolvedValue({
        payment_collection: {
          id: "pc_1",
          payment_sessions: [
            { id: "ps_1", provider_id: "pp_family_bank_family_bank", status: "pending" },
          ],
        },
      });
      await sendPrompt();
      expect(
        await screen.findByText(status === "failed" ? "Payment failed" : "Payment was canceled"),
      ).toBeInTheDocument();
      expect(mockCompleteCart).not.toHaveBeenCalled();
    },
  );

  it("recovers a callback-completed cart using its existing payment", async () => {
    mockGetCart.mockResolvedValue({
      ...mockCart,
      region: mockRegion,
      completed_at: "2026-10-03T00:00:00Z",
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          { id: "ps_1", provider_id: "pp_family_bank_family_bank", status: "authorized" },
        ],
      },
    });
    renderWithProviders(<CheckoutPage />);
    expect(await screen.findByText("Order Placed!")).toBeInTheDocument();
    expect(mockInitializePaymentSession).not.toHaveBeenCalled();
  });

  it("resumes an existing pending Family Bank prompt after reload without sending another", async () => {
    mockGetCart.mockResolvedValue({
      ...mockCart,
      region: mockRegion,
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          { id: "ps_existing", provider_id: "pp_family_bank_family_bank", status: "pending" },
        ],
      },
    });
    renderWithProviders(<CheckoutPage />);
    expect(await screen.findByText("Payment Request Sent")).toBeInTheDocument();
    expect(mockInitializePaymentSession).not.toHaveBeenCalled();
    expect(mockCompleteCart).not.toHaveBeenCalled();
  });
  it("shows bank unavailability if retrying a canceled prompt fails", async () => {
    mockGetCart.mockResolvedValue({
      ...mockCart,
      region: mockRegion,
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          {
            id: "ps_1",
            provider_id: "pp_family_bank_family_bank",
            status: "canceled",
            data: { status: "canceled" },
          },
        ],
      },
    });
    mockInitializePaymentSession
      .mockResolvedValueOnce({
        payment_collection: {
          id: "pc_1",
          payment_sessions: [
            { id: "ps_1", provider_id: "pp_family_bank_family_bank", status: "pending" },
          ],
        },
      })
      .mockRejectedValueOnce(new Error("Only configured Family Bank payments are available"));
    await sendPrompt();
    await screen.findByText("Payment was canceled");
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(
      await screen.findByText("Only configured Family Bank payments are available"),
    ).toBeInTheDocument();
    expect(mockCompleteCart).not.toHaveBeenCalled();
  });
});
