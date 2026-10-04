import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
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
