import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  clearCheckoutRecovery,
  getCheckoutRecovery,
  saveCheckoutRecovery,
} from "@/lib/checkout-recovery";
import CheckoutPage from "@/app/checkout/page";
import { mockCart, mockProduct, mockRegion } from "@/__tests__/fixtures";

const api = vi.hoisted(() => ({
  getCheckoutCart: vi.fn(),
  getProductsByIds: vi.fn(),
  getCustomer: vi.fn(),
  getCustomerAddresses: vi.fn(),
  getRegions: vi.fn(),
  getShippingOptions: vi.fn(),
  addShippingMethod: vi.fn(),
  updateCart: vi.fn(),
  initializePaymentSession: vi.fn(),
  completeCart: vi.fn(),
}));
vi.mock("@/lib/medusa-api", () => api);
vi.mock("@/lib/http", () => ({ clearStoredCartId: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  api.getProductsByIds.mockResolvedValue([mockProduct]);
  api.getCustomer.mockResolvedValue(null);
  api.getCustomerAddresses.mockResolvedValue([]);
  api.getRegions.mockResolvedValue({ regions: [mockRegion] });
  api.getShippingOptions.mockResolvedValue({
    shipping_options: [{ id: "express", name: "Express Shipping", amount: 500 }],
  });
});
function setup(
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  }),
) {
  const rendered = render(
    <QueryClientProvider client={client}>
      <CheckoutPage />
    </QueryClientProvider>,
  );
  return { ...rendered, client };
}

it("refetches a fresh cached empty checkout with production freshness after shopping", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false } },
  });
  api.getCheckoutCart.mockResolvedValue(null);
  const first = setup(client);
  await screen.findByText("No items to checkout");
  first.unmount();
  localStorage.setItem("medusa_cart_id", "cart_new");
  api.getCheckoutCart.mockResolvedValue({ ...mockCart, id: "cart_new", region: mockRegion });
  await client.invalidateQueries({ queryKey: ["cart"] });
  setup(client);
  expect(await screen.findByText("Shipping Address")).toBeInTheDocument();
  expect(screen.queryByText("No items to checkout")).not.toBeInTheDocument();
});

it("refetches changed quantities on re-entry even when the same cart cache is fresh", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  });
  api.getCheckoutCart.mockResolvedValue({ ...mockCart, region: mockRegion });
  const first = setup(client);
  await screen.findByText("Quantity: 2");
  first.unmount();
  api.getCheckoutCart.mockResolvedValue({
    ...mockCart,
    region: mockRegion,
    items: mockCart.items.map((item) => ({ ...item, quantity: 3 })),
  });
  setup(client);
  expect(await screen.findByText("Quantity: 3")).toBeInTheDocument();
});

it.each([
  { sessions: [] },
  {
    sessions: [{ id: "replacement", provider_id: "pp_family_bank_family_bank", status: "pending" }],
  },
  {
    sessions: [
      { id: "replacement", provider_id: "pp_family_bank_family_bank", status: "authorized" },
    ],
  },
])(
  "shows safe recovery on reload when the tracked session is missing or replaced %#",
  async ({ sessions }) => {
    localStorage.setItem(
      "azani_checkout_recovery",
      JSON.stringify({ cartId: mockCart.id, sessionId: "original", state: "unresolved" }),
    );
    api.getCheckoutCart.mockResolvedValue({
      ...mockCart,
      region: mockRegion,
      payment_collection: { id: "pc", payment_sessions: sessions },
    });
    setup();
    expect(await screen.findByText("Payment needs confirmation")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check Payment Status" }));
    await waitFor(() => expect(api.getCheckoutCart.mock.calls.length).toBeGreaterThan(1));
    expect(api.initializePaymentSession).not.toHaveBeenCalled();
    expect(api.completeCart).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Send M-Pesa Prompt" })).not.toBeInTheDocument();
  },
);

it("keeps safe recovery visible when fetching the tracked cart fails", async () => {
  localStorage.setItem(
    "azani_checkout_recovery",
    JSON.stringify({ cartId: mockCart.id, sessionId: "original", state: "unresolved" }),
  );
  api.getCheckoutCart.mockRejectedValue(new Error("Cart status unavailable"));
  setup();
  expect(await screen.findByText("Payment needs confirmation")).toBeInTheDocument();
  expect(screen.queryByText("No items to checkout")).not.toBeInTheDocument();
  expect(api.initializePaymentSession).not.toHaveBeenCalled();
  expect(api.completeCart).not.toHaveBeenCalled();
});

it("refreshes a mounted empty checkout when another tab creates the shopping cart", async () => {
  api.getCheckoutCart.mockResolvedValue(null);
  setup();
  await screen.findByText("No items to checkout");
  api.getCheckoutCart.mockResolvedValue({ ...mockCart, id: "cart_new", region: mockRegion });
  act(() => {
    localStorage.setItem("medusa_cart_id", "cart_new");
    window.dispatchEvent(new StorageEvent("storage", { key: "medusa_cart_id" }));
  });
  expect(await screen.findByText("Shipping Address")).toBeInTheDocument();
});

it.each(["canceled", "pending", "authorized"])(
  "keeps an unidentified retry in safe recovery when only its excluded %s session is returned",
  async (status) => {
    localStorage.setItem(
      "azani_checkout_recovery",
      JSON.stringify({
        cartId: mockCart.id,
        sessionId: null,
        state: "unresolved",
        attemptId: "retry_attempt",
        phase: "session",
        previousSessionId: "old_session",
      }),
    );
    api.getCheckoutCart.mockResolvedValue({
      ...mockCart,
      region: mockRegion,
      payment_collection: {
        id: "pc",
        payment_sessions: [
          { id: "old_session", provider_id: "pp_family_bank_family_bank", status },
        ],
      },
    });
    setup();
    expect(await screen.findByText("Payment needs confirmation")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check Payment Status" }));
    await waitFor(() => expect(api.getCheckoutCart.mock.calls.length).toBeGreaterThan(1));
    expect(screen.queryByText("Shipping Address")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Send M-Pesa Prompt|Try Again/ }),
    ).not.toBeInTheDocument();
    expect(api.initializePaymentSession).not.toHaveBeenCalled();
    expect(api.completeCart).not.toHaveBeenCalled();
  },
);

afterEach(() => vi.useRealTimers());

function uncertainCart(status?: string) {
  return {
    ...mockCart,
    region: mockRegion,
    payment_collection: {
      id: "pc",
      payment_sessions: status
        ? [{ id: "actual_new", provider_id: "pp_family_bank_family_bank", status }]
        : [],
    },
  };
}
async function mountUncertainPayment(sessionId: string | null = null) {
  localStorage.setItem(
    "azani_checkout_recovery",
    JSON.stringify({
      cartId: mockCart.id,
      sessionId,
      state: "unresolved",
      attemptId: "uncertain",
      phase: "session",
    }),
  );
  api.getCheckoutCart.mockResolvedValue(uncertainCart());
  const rendered = setup();
  await screen.findByText("Payment needs confirmation");
  return rendered;
}

it.each([
  { response: { type: "order", order: { id: "order_recovered" } }, expected: "Order Placed!" },
  {
    response: { type: "cart", error: { message: "Still processing" } },
    expected: "Confirming your order",
  },
])(
  "resumes a newly discovered authorized session and validates its completion response %#",
  async ({ response, expected }) => {
    api.completeCart.mockResolvedValue(response);
    const { client } = await mountUncertainPayment();
    api.getCheckoutCart.mockResolvedValue(uncertainCart("authorized"));
    fireEvent.click(screen.getByRole("button", { name: "Check Payment Status" }));
    expect(await screen.findByText(expected)).toBeInTheDocument();
    expect(api.completeCart).toHaveBeenCalledTimes(1);
    expect(api.initializePaymentSession).not.toHaveBeenCalled();
    expect(screen.queryByText("Shipping Address")).not.toBeInTheDocument();
    await act(async () => {
      await client.refetchQueries({ queryKey: ["checkout-cart"] });
    });
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.queryByText("Payment Request Sent")).not.toBeInTheDocument();
    expect(api.completeCart).toHaveBeenCalledTimes(1);
  },
);

it("resumes discovered pending payment, preserves its clock through status updates, then completes authorization", async () => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
  api.completeCart.mockResolvedValue({ type: "order", order: { id: "order_recovered" } });
  await mountUncertainPayment();
  api.getCheckoutCart.mockResolvedValue(uncertainCart("pending"));
  fireEvent.click(screen.getByRole("button", { name: "Check Payment Status" }));
  await screen.findByText("Payment Request Sent");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(61_000);
  });
  expect(screen.getByText("Taking longer than expected")).toBeInTheDocument();
  api.getCheckoutCart.mockResolvedValue({
    ...uncertainCart("pending"),
    updated_at: "2026-10-04T12:00:00Z",
  });
  const callsBeforeRefresh = api.getCheckoutCart.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "Check Payment Status" }));
  await waitFor(() =>
    expect(api.getCheckoutCart.mock.calls.length).toBeGreaterThan(callsBeforeRefresh),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(screen.getByText("STK Push timed out")).toBeInTheDocument();
  expect(api.completeCart).not.toHaveBeenCalled();
  api.getCheckoutCart.mockResolvedValue(uncertainCart("authorized"));
  fireEvent.click(screen.getByRole("button", { name: "Check Payment Status" }));
  expect(await screen.findByText("Order Placed!")).toBeInTheDocument();
  expect(api.completeCart).toHaveBeenCalledTimes(1);
  expect(api.initializePaymentSession).not.toHaveBeenCalled();
});

it.each(["canceled", "error"])(
  "surfaces the discovered session's %s outcome without another prompt",
  async (status) => {
    await mountUncertainPayment();
    api.getCheckoutCart.mockResolvedValue(uncertainCart("pending"));
    fireEvent.click(screen.getByRole("button", { name: "Check Payment Status" }));
    await screen.findByText("Payment Request Sent");
    api.getCheckoutCart.mockResolvedValue(uncertainCart(status));
    fireEvent.click(screen.getByRole("button", { name: "Check Payment Status" }));
    expect(
      await screen.findByText(status === "canceled" ? "Payment was canceled" : "Payment failed"),
    ).toBeInTheDocument();
    expect(api.completeCart).not.toHaveBeenCalled();
    expect(api.initializePaymentSession).not.toHaveBeenCalled();
  },
);

it("resumes a known tracked session that first appears on a later status check", async () => {
  api.completeCart.mockResolvedValue({ type: "order", order: { id: "order_recovered" } });
  await mountUncertainPayment("actual_new");
  api.getCheckoutCart.mockResolvedValue(uncertainCart("authorized"));
  fireEvent.click(screen.getByRole("button", { name: "Check Payment Status" }));
  expect(await screen.findByText("Order Placed!")).toBeInTheDocument();
  expect(api.completeCart).toHaveBeenCalledTimes(1);
  expect(api.initializePaymentSession).not.toHaveBeenCalled();
});

async function discoverWhileRetrying(
  outcome: "resolve" | "authorize" | "reject" = "reject",
  discoveredStatus = "pending",
) {
  const oldCart = (status: string) => {
    const value = uncertainCart(status);
    value.payment_collection.payment_sessions[0].id = "old";
    return value;
  };
  api.getCheckoutCart.mockResolvedValue(oldCart("pending"));
  const { client } = setup();
  await screen.findByText("Payment Request Sent");
  api.getCheckoutCart.mockResolvedValue(oldCart("canceled"));
  fireEvent.click(await screen.findByRole("button", { name: "Check Payment Status" }));
  await screen.findByText("Payment was canceled");
  let resolveInitiation!: (value: unknown) => void;
  let rejectInitiation!: (error: Error) => void;
  api.initializePaymentSession.mockImplementation(() => {
    saveCheckoutRecovery({
      cartId: mockCart.id,
      sessionId: null,
      state: "unresolved",
      attemptId: "retry",
      phase: "session",
      previousSessionId: "old",
    });
    return new Promise((resolve, reject) => {
      resolveInitiation = resolve;
      rejectInitiation = reject;
    });
  });
  fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
  await screen.findByText("Payment Request Sent");
  api.getCheckoutCart.mockResolvedValue(uncertainCart(discoveredStatus));
  fireEvent.click(await screen.findByRole("button", { name: "Check Payment Status" }));
  await act(async () => {
    await client.refetchQueries({ queryKey: ["checkout-cart"] });
  });
  await vi.waitFor(() => expect(getCheckoutRecovery()?.sessionId).toBe("actual_new"));
  return () =>
    outcome === "reject"
      ? rejectInitiation(new Error("Session response lost"))
      : resolveInitiation({
          payment_collection: uncertainCart(outcome === "authorize" ? "authorized" : "pending")
            .payment_collection,
        });
}

it.each(["resolve", "reject"] as const)(
  "preserves discovered pending payment and its clock after a late initiation %s, then completes authorization",
  async (outcome) => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    api.completeCart.mockResolvedValue({ type: "order", order: { id: "order_recovered" } });
    const rejectInitiation = await discoverWhileRetrying(outcome);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });
    expect(screen.getByText("Taking longer than expected")).toBeInTheDocument();
    await act(async () => {
      rejectInitiation();
    });
    expect(screen.getByText("Taking longer than expected")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Check Payment Status" })).toBeInTheDocument();
    expect(screen.queryByText("Shipping Address")).not.toBeInTheDocument();
    const callsBefore = api.getCheckoutCart.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(screen.getByText("STK Push timed out")).toBeInTheDocument();
    expect(api.getCheckoutCart.mock.calls.length).toBeGreaterThan(callsBefore);
    api.getCheckoutCart.mockResolvedValue(uncertainCart("authorized"));
    fireEvent.click(await screen.findByRole("button", { name: "Check Payment Status" }));
    expect(await screen.findByText("Order Placed!")).toBeInTheDocument();
    expect(api.initializePaymentSession).toHaveBeenCalledTimes(1);
    expect(api.completeCart).toHaveBeenCalledTimes(1);
  },
);

it.each(
  [
    { status: "canceled", expected: "Payment was canceled", response: null },
    { status: "error", expected: "Payment failed", response: null },
    {
      status: "authorized",
      expected: "Order Placed!",
      response: { type: "order", order: { id: "order_recovered" } },
    },
    {
      status: "authorized",
      expected: "Confirming your order",
      response: { type: "cart", error: { message: "Still processing" } },
    },
    { status: "authorized", expected: "Confirming your order", response: { type: "conflict" } },
  ].flatMap((test) =>
    ["resolve", "authorize", "reject"].map((outcome) => ({
      ...test,
      outcome: outcome as "resolve" | "authorize" | "reject",
    })),
  ),
)(
  "preserves the observed $expected outcome after late initiation $outcome",
  async ({ status, expected, response, outcome }) => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    api.completeCart.mockImplementation(async () => {
      if (response?.type === "order") clearCheckoutRecovery(mockCart.id);
      if (response?.type === "conflict") throw new Error("Cart completion conflict (409)");
      return response;
    });
    const rejectInitiation = await discoverWhileRetrying(outcome);
    api.getCheckoutCart.mockResolvedValue(uncertainCart(status));
    fireEvent.click(await screen.findByRole("button", { name: "Check Payment Status" }));
    await screen.findByText(expected);
    await act(async () => {
      rejectInitiation();
    });
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.queryByText("Shipping Address")).not.toBeInTheDocument();
    expect(api.initializePaymentSession).toHaveBeenCalledTimes(1);
    expect(api.completeCart).toHaveBeenCalledTimes(status === "authorized" ? 1 : 0);
    const callsBefore = api.getCheckoutCart.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(api.getCheckoutCart).toHaveBeenCalledTimes(callsBefore);
  },
);

it.each(["resolve", "authorize", "reject"] as const)(
  "does not repeat completion while its first request is in flight after late initiation %s",
  async (outcome) => {
    let finishOrder!: (value: unknown) => void;
    api.completeCart.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishOrder = resolve;
        }),
    );
    const finishInitiation = await discoverWhileRetrying(outcome);
    api.getCheckoutCart.mockResolvedValue(uncertainCart("authorized"));
    fireEvent.click(await screen.findByRole("button", { name: "Check Payment Status" }));
    await waitFor(() => expect(api.completeCart).toHaveBeenCalledTimes(1));
    await act(async () => {
      finishInitiation();
    });
    expect(api.completeCart).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Confirming your order")).toBeInTheDocument();
    expect(screen.queryByText("Shipping Address")).not.toBeInTheDocument();
    expect(screen.queryByText("Review & Place Order")).not.toBeInTheDocument();
    await act(async () => {
      clearCheckoutRecovery(mockCart.id);
      finishOrder({ type: "order", order: { id: "order_recovered" } });
    });
    expect(await screen.findByText("Order Placed!")).toBeInTheDocument();
    expect(api.initializePaymentSession).toHaveBeenCalledTimes(1);
  },
);

it.each(
  ["canceled", "error"].flatMap((status) =>
    ["resolve", "authorize", "reject"].map((outcome) => ({
      status,
      outcome: outcome as "resolve" | "authorize" | "reject",
    })),
  ),
)(
  "preserves directly discovered $status during retry after late initiation $outcome",
  async ({ status, outcome }) => {
    const finishInitiation = await discoverWhileRetrying(outcome, status);
    const expected = status === "canceled" ? "Payment was canceled" : "Payment failed";
    await screen.findByText(expected);
    await act(async () => {
      finishInitiation();
    });
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(api.completeCart).not.toHaveBeenCalled();
    expect(api.initializePaymentSession).toHaveBeenCalledTimes(1);
  },
);
