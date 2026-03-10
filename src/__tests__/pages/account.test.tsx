import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountPage from "@/app/account/page";
import { renderWithProviders } from "../test-utils";
import { formatOrderRef } from "@/lib/formatters";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockSearchParamGet = vi.fn();
const mockGetCustomer = vi.fn();
const mockUpdateCustomer = vi.fn();
const mockGetCustomerAddresses = vi.fn();
const mockAddCustomerAddress = vi.fn();
const mockUpdateCustomerAddress = vi.fn();
const mockDeleteCustomerAddress = vi.fn();
const mockGetOrders = vi.fn();
const mockGetOrderById = vi.fn();
const mockGetProductsByIds = vi.fn();
const mockGetWishlistProductIds = vi.fn();
const mockResendVerificationEmail = vi.fn();
const mockClearAuthToken = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => ({ get: mockSearchParamGet }),
}));

vi.mock("@/lib/medusa-api", () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  updateCustomer: (...args: unknown[]) => mockUpdateCustomer(...args),
  getCustomerAddresses: (...args: unknown[]) => mockGetCustomerAddresses(...args),
  addCustomerAddress: (...args: unknown[]) => mockAddCustomerAddress(...args),
  updateCustomerAddress: (...args: unknown[]) => mockUpdateCustomerAddress(...args),
  deleteCustomerAddress: (...args: unknown[]) => mockDeleteCustomerAddress(...args),
  getOrders: (...args: unknown[]) => mockGetOrders(...args),
  getOrderById: (...args: unknown[]) => mockGetOrderById(...args),
  getProductsByIds: (...args: unknown[]) => mockGetProductsByIds(...args),
  getWishlistProductIds: (...args: unknown[]) => mockGetWishlistProductIds(...args),
  resendVerificationEmail: (...args: unknown[]) => mockResendVerificationEmail(...args),
}));

vi.mock("@/lib/http", () => ({
  clearAuthToken: (...args: unknown[]) => mockClearAuthToken(...args),
}));

const customer = {
  id: "cus_1",
  email: "jane@example.com",
  first_name: "Jane",
  last_name: "Doe",
  phone: "+251911000000",
  has_account: true,
  metadata: { email_verified: true },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCustomerAddresses.mockResolvedValue([]);
  mockGetOrders.mockResolvedValue([]);
  mockGetProductsByIds.mockResolvedValue([]);
  mockGetWishlistProductIds.mockResolvedValue([]);
  mockSearchParamGet.mockReturnValue(null);
});

describe("AccountPage", () => {
  it("shows loading state while fetching", () => {
    mockGetCustomer.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<AccountPage />);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("renders customer details when authenticated", async () => {
    mockGetCustomer.mockResolvedValue(customer);

    renderWithProviders(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Jane Doe" })).toBeInTheDocument();
    });
    expect(screen.getAllByText("jane@example.com").length).toBeGreaterThan(0);
  });

  it("redirects to login when the session is unavailable", async () => {
    mockGetCustomer.mockResolvedValue(null);

    renderWithProviders(<AccountPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/account/login");
    });
  });

  it("signs out and routes home", async () => {
    mockGetCustomer.mockResolvedValue(customer);

    const user = userEvent.setup();
    renderWithProviders(<AccountPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Sign Out").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByText("Sign Out")[0]);

    expect(mockClearAuthToken).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("opens deep-linked orders and resolves fallback product images", async () => {
    mockGetCustomer.mockResolvedValue(customer);
    mockSearchParamGet.mockImplementation((key: string) => (key === "order" ? "order_1" : null));
    mockGetOrders.mockResolvedValue([
      {
        id: "order_1",
        display_id: 101,
        email: customer.email,
        currency_code: "etb",
        items: [
          {
            id: "item_1",
            title: "Baby Lotion",
            quantity: 1,
            variant_id: "variant_1",
            product_id: "prod_1",
            unit_price: 100,
            original_total: 100,
            total: 100,
            subtotal: 100,
            discount_total: 0,
            tax_total: 0,
          },
        ],
        total: 100,
        subtotal: 100,
        shipping_total: 0,
        tax_total: 0,
        discount_total: 0,
        status: "completed",
        fulfillment_status: "fulfilled",
        payment_status: "captured",
        created_at: new Date().toISOString(),
      },
    ]);
    mockGetProductsByIds.mockResolvedValue([
      {
        id: "prod_1",
        title: "Baby Lotion",
        handle: "baby-lotion",
        thumbnail: "https://example.com/lotion.jpg",
        status: "published",
        is_giftcard: false,
        discountable: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    mockGetOrderById.mockResolvedValue({
      id: "order_1",
      display_id: 101,
      email: customer.email,
      currency_code: "etb",
      items: [
        {
          id: "item_1",
          title: "Baby Lotion",
          quantity: 1,
          variant_id: "variant_1",
          product_id: "prod_1",
          unit_price: 100,
          original_total: 100,
          total: 100,
          subtotal: 100,
          discount_total: 0,
          tax_total: 0,
        },
      ],
      total: 100,
      subtotal: 100,
      shipping_total: 0,
      tax_total: 0,
      discount_total: 0,
      status: "completed",
      fulfillment_status: "fulfilled",
      payment_status: "captured",
      created_at: new Date().toISOString(),
    });

    renderWithProviders(<AccountPage />);

    await waitFor(() => {
      expect(screen.getAllByAltText("Baby Lotion").length).toBeGreaterThan(0);
    });
    const expectedRef = formatOrderRef(101, undefined, "order_1");
    expect(screen.getAllByText(expectedRef).length).toBeGreaterThan(0);
    expect(screen.getByText("Qty: 1")).toBeInTheDocument();
  });

  describe("order journey status mapping", () => {
    function makeOrder(overrides: {
      status?: string;
      fulfillment_status?: string;
      payment_status?: string;
    }) {
      return {
        id: "order_j",
        display_id: 200,
        email: customer.email,
        currency_code: "etb",
        items: [
          {
            id: "item_j",
            title: "Test Item",
            quantity: 1,
            variant_id: "var_j",
            product_id: "prod_j",
            unit_price: 50,
            original_total: 50,
            total: 50,
            subtotal: 50,
            discount_total: 0,
            tax_total: 0,
          },
        ],
        total: 50,
        subtotal: 50,
        shipping_total: 0,
        tax_total: 0,
        discount_total: 0,
        status: overrides.status ?? "pending",
        fulfillment_status: overrides.fulfillment_status ?? "not_fulfilled",
        payment_status: overrides.payment_status ?? "captured",
        created_at: new Date().toISOString(),
      };
    }

    async function renderOrderWithStatuses(overrides: {
      status?: string;
      fulfillment_status?: string;
      payment_status?: string;
    }) {
      const order = makeOrder(overrides);
      mockGetCustomer.mockResolvedValue(customer);
      mockSearchParamGet.mockImplementation((key: string) => (key === "order" ? order.id : null));
      mockGetOrders.mockResolvedValue([order]);
      mockGetOrderById.mockResolvedValue(order);
      mockGetProductsByIds.mockResolvedValue([]);

      renderWithProviders(<AccountPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Item")).toBeInTheDocument();
      });
    }

    it("shows Ordered as active for a new unfulfilled order", async () => {
      await renderOrderWithStatuses({
        status: "pending",
        fulfillment_status: "not_fulfilled",
        payment_status: "not_paid",
      });

      expect(screen.getAllByText("Ordered").length).toBeGreaterThan(0);
      const journeyLabels = ["Ordered", "Confirmed", "Shipped", "Delivered"];
      for (const label of journeyLabels) {
        expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      }
    });

    it("shows Confirmed after admin fulfils items", async () => {
      await renderOrderWithStatuses({
        status: "pending",
        fulfillment_status: "fulfilled",
        payment_status: "captured",
      });

      const badges = screen.getAllByText("Confirmed");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows Confirmed for partially_fulfilled status", async () => {
      await renderOrderWithStatuses({
        status: "pending",
        fulfillment_status: "partially_fulfilled",
        payment_status: "captured",
      });

      const badges = screen.getAllByText("Confirmed");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows Confirmed via payment authorization even when not_fulfilled", async () => {
      await renderOrderWithStatuses({
        status: "pending",
        fulfillment_status: "not_fulfilled",
        payment_status: "authorized",
      });

      const badges = screen.getAllByText("Confirmed");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows Shipped after admin marks as shipped", async () => {
      await renderOrderWithStatuses({
        status: "pending",
        fulfillment_status: "shipped",
        payment_status: "captured",
      });

      const badges = screen.getAllByText("Shipped");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows Shipped for partially_shipped status", async () => {
      await renderOrderWithStatuses({
        status: "pending",
        fulfillment_status: "partially_shipped",
        payment_status: "captured",
      });

      const badges = screen.getAllByText("Shipped");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows Delivered when fulfillment_status is delivered", async () => {
      await renderOrderWithStatuses({
        status: "pending",
        fulfillment_status: "delivered",
        payment_status: "captured",
      });

      const badges = screen.getAllByText("Delivered");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows Delivered when order status is completed", async () => {
      await renderOrderWithStatuses({
        status: "completed",
        fulfillment_status: "fulfilled",
        payment_status: "captured",
      });

      const badges = screen.getAllByText("Delivered");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows Canceled when order status is canceled", async () => {
      await renderOrderWithStatuses({
        status: "canceled",
        fulfillment_status: "not_fulfilled",
        payment_status: "not_paid",
      });

      const badges = screen.getAllByText("Canceled");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows Canceled when payment_status is canceled", async () => {
      await renderOrderWithStatuses({
        status: "pending",
        fulfillment_status: "not_fulfilled",
        payment_status: "canceled",
      });

      const badges = screen.getAllByText("Canceled");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows Refunded for refunded payment", async () => {
      await renderOrderWithStatuses({
        status: "pending",
        fulfillment_status: "not_fulfilled",
        payment_status: "refunded",
      });

      const badges = screen.getAllByText("Refunded");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows Refunded for partially_refunded payment", async () => {
      await renderOrderWithStatuses({
        status: "pending",
        fulfillment_status: "shipped",
        payment_status: "partially_refunded",
      });

      const badges = screen.getAllByText("Refunded");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows Returned for returned fulfillment", async () => {
      await renderOrderWithStatuses({
        status: "pending",
        fulfillment_status: "returned",
        payment_status: "captured",
      });

      const badges = screen.getAllByText("Returned");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows Returned for partially_returned fulfillment", async () => {
      await renderOrderWithStatuses({
        status: "pending",
        fulfillment_status: "partially_returned",
        payment_status: "captured",
      });

      const badges = screen.getAllByText("Returned");
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it("falls back to variant-linked product media when order item product is missing", async () => {
    mockGetCustomer.mockResolvedValue(customer);
    mockSearchParamGet.mockImplementation((key: string) => (key === "order" ? "order_2" : null));
    mockGetOrders.mockResolvedValue([
      {
        id: "order_2",
        display_id: 102,
        email: customer.email,
        currency_code: "etb",
        items: [
          {
            id: "item_2",
            title: "Nursing Pillow",
            quantity: 1,
            variant_id: "variant_2",
            product_id: "prod_2",
            unit_price: 150,
            original_total: 150,
            total: 150,
            subtotal: 150,
            discount_total: 0,
            tax_total: 0,
            variant: {
              id: "variant_2",
              title: "Default",
              product: {
                id: "prod_2",
                thumbnail: "https://example.com/pillow.jpg",
                images: [],
              },
            },
          },
        ],
        total: 150,
        subtotal: 150,
        shipping_total: 0,
        tax_total: 0,
        discount_total: 0,
        status: "completed",
        fulfillment_status: "fulfilled",
        payment_status: "captured",
        created_at: new Date().toISOString(),
      },
    ]);
    mockGetOrderById.mockResolvedValue({
      id: "order_2",
      display_id: 102,
      email: customer.email,
      currency_code: "etb",
      items: [
        {
          id: "item_2",
          title: "Nursing Pillow",
          quantity: 1,
          variant_id: "variant_2",
          product_id: "prod_2",
          unit_price: 150,
          original_total: 150,
          total: 150,
          subtotal: 150,
          discount_total: 0,
          tax_total: 0,
          variant: {
            id: "variant_2",
            title: "Default",
            product: {
              id: "prod_2",
              thumbnail: "https://example.com/pillow.jpg",
              images: [],
            },
          },
        },
      ],
      total: 150,
      subtotal: 150,
      shipping_total: 0,
      tax_total: 0,
      discount_total: 0,
      status: "completed",
      fulfillment_status: "fulfilled",
      payment_status: "captured",
      created_at: new Date().toISOString(),
    });

    renderWithProviders(<AccountPage />);

    await waitFor(() => {
      expect(screen.getAllByAltText("Nursing Pillow").length).toBeGreaterThan(0);
    });
  });
});
