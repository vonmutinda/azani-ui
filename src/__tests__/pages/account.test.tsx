import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountPage from "@/app/account/page";
import { renderWithProviders } from "../test-utils";

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockGetCustomer = vi.fn();
const mockUpdateCustomer = vi.fn();
const mockGetCustomerAddresses = vi.fn();
const mockAddCustomerAddress = vi.fn();
const mockUpdateCustomerAddress = vi.fn();
const mockDeleteCustomerAddress = vi.fn();
const mockGetOrders = vi.fn();
const mockGetOrderById = vi.fn();
vi.mock("@/lib/medusa-api", () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  updateCustomer: (...args: unknown[]) => mockUpdateCustomer(...args),
  getCustomerAddresses: (...args: unknown[]) => mockGetCustomerAddresses(...args),
  addCustomerAddress: (...args: unknown[]) => mockAddCustomerAddress(...args),
  updateCustomerAddress: (...args: unknown[]) => mockUpdateCustomerAddress(...args),
  deleteCustomerAddress: (...args: unknown[]) => mockDeleteCustomerAddress(...args),
  getOrders: (...args: unknown[]) => mockGetOrders(...args),
  getOrderById: (...args: unknown[]) => mockGetOrderById(...args),
}));

const mockClearAuthToken = vi.fn();
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
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCustomerAddresses.mockResolvedValue([]);
  mockGetOrders.mockResolvedValue([]);
});

describe("AccountPage", () => {
  it("shows loading state while fetching", () => {
    mockGetCustomer.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AccountPage />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("renders customer data", async () => {
    mockGetCustomer.mockResolvedValue(customer);

    renderWithProviders(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText("Welcome back, Jane!")).toBeInTheDocument();
    });
    expect(screen.getAllByText("jane@example.com").length).toBeGreaterThan(0);
  });

  it("redirects to login when not authenticated", async () => {
    mockGetCustomer.mockResolvedValue(null);

    renderWithProviders(<AccountPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/account/login");
    });
  });

  it("signs out and redirects to home", async () => {
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

  it("renders nav buttons (Profile, Orders)", async () => {
    mockGetCustomer.mockResolvedValue(customer);

    renderWithProviders(<AccountPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Profile").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Orders").length).toBeGreaterThan(0);
  });

  it("profile edit mode — click Edit, change name, Save calls updateCustomer", async () => {
    mockGetCustomer.mockResolvedValue(customer);
    mockUpdateCustomer.mockResolvedValue({ ...customer, first_name: "Janet" });

    const user = userEvent.setup();
    renderWithProviders(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Edit"));

    const firstNameInput = screen.getByDisplayValue("Jane");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Janet");

    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockUpdateCustomer).toHaveBeenCalledWith({
        first_name: "Janet",
        last_name: "Doe",
        phone: "+251911000000",
      });
    });
  });

  it("profile section shows delivery addresses", async () => {
    mockGetCustomer.mockResolvedValue(customer);
    mockGetCustomerAddresses.mockResolvedValue([
      {
        id: "addr_1",
        first_name: "Jane",
        last_name: "Doe",
        address_1: "123 Main St",
        city: "Addis Ababa",
        province: "AA",
        postal_code: "1000",
        country_code: "et",
        phone: "+251911000000",
      },
    ]);

    renderWithProviders(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText("Delivery Addresses")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("123 Main St")).toBeInTheDocument();
    });
    expect(screen.getByText("Addis Ababa, AA 1000")).toBeInTheDocument();
  });

  it("orders section empty state", async () => {
    mockGetCustomer.mockResolvedValue(customer);
    mockGetOrders.mockResolvedValue([]);

    const user = userEvent.setup();
    renderWithProviders(<AccountPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Orders").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByRole("button", { name: /Orders/i })[0]);

    await waitFor(() => {
      expect(screen.getAllByText("No orders yet").length).toBeGreaterThan(0);
    });
  });

  it("orders section with order data", async () => {
    mockGetCustomer.mockResolvedValue(customer);
    mockGetOrders.mockResolvedValue([
      {
        id: "order_123",
        display_id: 42,
        email: "jane@example.com",
        currency_code: "etb",
        items: [],
        total: 50000,
        subtotal: 45000,
        shipping_total: 5000,
        tax_total: 0,
        discount_total: 0,
        status: "completed",
        fulfillment_status: "fulfilled",
        payment_status: "captured",
        created_at: "2025-06-01T00:00:00.000Z",
      },
    ]);

    const user = userEvent.setup();
    renderWithProviders(<AccountPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Orders").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByRole("button", { name: /Orders/i })[0]);

    await waitFor(() => {
      expect(screen.getAllByText("Order #42").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("completed").length).toBeGreaterThan(0);
  });

  it("shows latest orders first", async () => {
    mockGetCustomer.mockResolvedValue(customer);
    mockGetOrders.mockResolvedValue([
      {
        id: "order_old",
        display_id: 41,
        email: "jane@example.com",
        currency_code: "etb",
        items: [],
        total: 40000,
        subtotal: 35000,
        shipping_total: 5000,
        tax_total: 0,
        discount_total: 0,
        status: "completed",
        fulfillment_status: "fulfilled",
        payment_status: "captured",
        created_at: "2025-05-01T00:00:00.000Z",
      },
      {
        id: "order_new",
        display_id: 42,
        email: "jane@example.com",
        currency_code: "etb",
        items: [],
        total: 50000,
        subtotal: 45000,
        shipping_total: 5000,
        tax_total: 0,
        discount_total: 0,
        status: "completed",
        fulfillment_status: "fulfilled",
        payment_status: "captured",
        created_at: "2025-06-01T00:00:00.000Z",
      },
    ]);

    const user = userEvent.setup();
    renderWithProviders(<AccountPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Orders").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByRole("button", { name: /Orders/i })[0]);

    await waitFor(() => {
      expect(screen.getByText("Newest orders appear first.")).toBeInTheDocument();
    });

    const orderButtons = screen.getAllByRole("button").filter((button) =>
      button.textContent?.includes("Order #"),
    );

    expect(orderButtons[0]).toHaveTextContent("Order #42");
    expect(orderButtons[1]).toHaveTextContent("Order #41");
  });

  it("clicking an order shows order detail inline", async () => {
    mockGetCustomer.mockResolvedValue(customer);
    mockGetOrders.mockResolvedValue([
      {
        id: "order_123",
        display_id: 42,
        email: "jane@example.com",
        currency_code: "etb",
        items: [],
        total: 50000,
        subtotal: 45000,
        shipping_total: 5000,
        tax_total: 0,
        discount_total: 0,
        status: "completed",
        fulfillment_status: "fulfilled",
        payment_status: "captured",
        created_at: "2025-06-01T00:00:00.000Z",
      },
    ]);
    mockGetOrderById.mockResolvedValue({
      id: "order_123",
      display_id: 42,
      email: "jane@example.com",
      currency_code: "etb",
      items: [
        {
          id: "item_1",
          title: "Baby Onesie",
          thumbnail: "https://example.com/onesie.jpg",
          quantity: 2,
          unit_price: 15000,
          total: 30000,
          original_total: 30000,
          subtotal: 30000,
          discount_total: 0,
          tax_total: 0,
        },
      ],
      shipping_address: {
        first_name: "Jane",
        last_name: "Doe",
        address_1: "123 Main St",
        city: "Addis Ababa",
        province: "AA",
        postal_code: "1000",
      },
      total: 35000,
      subtotal: 30000,
      shipping_total: 5000,
      tax_total: 0,
      discount_total: 0,
      status: "completed",
      fulfillment_status: "fulfilled",
      payment_status: "captured",
      created_at: "2025-06-01T00:00:00.000Z",
    });

    const user = userEvent.setup();
    renderWithProviders(<AccountPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Orders").length).toBeGreaterThan(0);
    });
    await user.click(screen.getAllByRole("button", { name: /Orders/i })[0]);

    await waitFor(() => {
      expect(screen.getAllByText("Order #42").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByText("Order #42")[0]);

    await waitFor(() => {
      expect(screen.getByText("Baby Onesie")).toBeInTheDocument();
    });
    expect(screen.getByText("Qty: 2")).toBeInTheDocument();
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
  });
});
