import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import * as http from "@/lib/http";
import {
  getProducts,
  getProductByHandle,
  getProductById,
  getProductsByIds,
  getCategories,
  getCategoryByHandle,
  getOrCreateCart,
  getCart,
  addToCart,
  updateLineItem,
  removeLineItem,
  updateCart,
  addPromoCode,
  removePromoCode,
  getShippingOptions,
  addShippingMethod,
  initializePaymentSession,
  completeCart,
  loginCustomer,
  registerCustomer,
  getCustomer,
  updateCustomer,
  getCustomerAddresses,
  addCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  getOrders,
  getOrderById,
  getCustomerWishlistProductIds,
  getWishlistProductIds,
  setWishlistProductIds,
  toggleWishlistProduct,
  mergeWishlistAfterAuth,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  getRegions,
} from "@/lib/medusa-api";
import { mockProduct, mockCategory, mockCart, mockRegion } from "../fixtures";

vi.mock("@/lib/http", () => ({
  medusaRequest: vi.fn(),
  getStoredCartId: vi.fn(),
  setStoredCartId: vi.fn(),
  getAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
  getStoredWishlistProductIds: vi.fn(),
  setStoredWishlistProductIds: vi.fn(),
  clearStoredWishlistProductIds: vi.fn(),
}));

const mockRequest = http.medusaRequest as Mock;
const mockGetCartId = http.getStoredCartId as Mock;
const mockSetCartId = http.setStoredCartId as Mock;
const mockGetAuthToken = http.getAuthToken as Mock;
const mockClearAuthToken = http.clearAuthToken as Mock;
const mockGetStoredWishlistIds = http.getStoredWishlistProductIds as Mock;
const mockSetStoredWishlistIds = http.setStoredWishlistProductIds as Mock;
const mockClearStoredWishlistIds = http.clearStoredWishlistProductIds as Mock;

beforeEach(() => {
  vi.resetAllMocks();
  mockGetAuthToken.mockReturnValue(null);
  mockGetStoredWishlistIds.mockReturnValue([]);
});

// ── Products ────────────────────────────────────────────────────────────

describe("getProducts", () => {
  it("calls medusaRequest with default params", async () => {
    mockRequest
      .mockResolvedValueOnce({ regions: [mockRegion], count: 1 })
      .mockResolvedValueOnce({ products: [mockProduct], count: 1, offset: 0, limit: 20 });

    const result = await getProducts();
    expect(mockRequest).toHaveBeenNthCalledWith(1, "store/regions");
    expect(mockRequest.mock.calls[1][1]).toEqual({
      searchParams: {
        limit: 20,
        offset: 0,
        fields:
          "+variants.calculated_price,+variants.prices,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder",
        region_id: "reg_01",
      },
    });
    expect(result.products).toHaveLength(1);
  });

  it("merges custom params", async () => {
    mockRequest
      .mockResolvedValueOnce({ regions: [mockRegion], count: 1 })
      .mockResolvedValueOnce({ products: [], count: 0, offset: 0, limit: 5 });

    await getProducts({ limit: 5, q: "diapers" });
    expect(mockRequest).toHaveBeenNthCalledWith(2, "store/products", {
      searchParams: {
        limit: 5,
        offset: 0,
        q: "diapers",
        fields:
          "+variants.calculated_price,+variants.prices,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder",
        region_id: "reg_01",
      },
    });
  });
});

describe("getProductByHandle", () => {
  it("returns the first product matching the handle", async () => {
    mockRequest
      .mockResolvedValueOnce({ regions: [mockRegion], count: 1 })
      .mockResolvedValueOnce({ products: [mockProduct] });

    const result = await getProductByHandle("pampers-baby-dry");
    expect(mockRequest).toHaveBeenNthCalledWith(2, "store/products", {
      searchParams: {
        handle: "pampers-baby-dry",
        limit: 1,
        fields:
          "+variants.calculated_price,+variants.prices,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder",
        region_id: "reg_01",
      },
    });
    expect(result).toEqual(mockProduct);
  });

  it("returns null when no product found", async () => {
    mockRequest
      .mockResolvedValueOnce({ regions: [mockRegion], count: 1 })
      .mockResolvedValueOnce({ products: [] });
    const result = await getProductByHandle("nonexistent");
    expect(result).toBeNull();
  });
});

describe("getProductById", () => {
  it("fetches a product by ID", async () => {
    mockRequest
      .mockResolvedValueOnce({ regions: [mockRegion], count: 1 })
      .mockResolvedValueOnce({ product: mockProduct });

    const result = await getProductById("prod_01");
    expect(mockRequest).toHaveBeenNthCalledWith(2, "store/products/prod_01", {
      searchParams: {
        fields:
          "+variants.calculated_price,+variants.prices,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder",
        region_id: "reg_01",
      },
    });
    expect(result.product).toEqual(mockProduct);
  });
});

describe("getProductsByIds", () => {
  it("returns empty array for empty input", async () => {
    const result = await getProductsByIds([]);
    expect(result).toEqual([]);
  });

  it("returns products in requested order via bulk fetch", async () => {
    const prod02 = { ...mockProduct, id: "prod_02", title: "Baby Wipes" };
    mockRequest.mockImplementation((path: string) => {
      if (path === "store/regions") {
        return Promise.resolve({ regions: [mockRegion], count: 1 });
      }
      if (path === "store/products") {
        return Promise.resolve({
          products: [mockProduct, prod02],
          count: 2,
          offset: 0,
          limit: 2,
        });
      }
      return Promise.resolve({});
    });

    const result = await getProductsByIds(["prod_01", "prod_02"]);
    expect(result.map((p) => p.id)).toEqual(["prod_01", "prod_02"]);
  });

  it("falls back to individual fetches for missing products", async () => {
    const prod02 = { ...mockProduct, id: "prod_02", title: "Baby Wipes" };
    mockRequest.mockImplementation((path: string) => {
      if (path === "store/regions") {
        return Promise.resolve({ regions: [mockRegion], count: 1 });
      }
      if (path === "store/products") {
        return Promise.resolve({ products: [mockProduct], count: 1, offset: 0, limit: 2 });
      }
      if (path === "store/products/prod_02") {
        return Promise.resolve({ product: prod02 });
      }
      return Promise.resolve({});
    });

    const result = await getProductsByIds(["prod_01", "prod_02"]);
    expect(result.map((p) => p.id)).toEqual(["prod_01", "prod_02"]);
  });
});

// ── Categories ─────────────────────────────────────────────────────────

describe("getCategories", () => {
  it("calls with default params including descendants", async () => {
    mockRequest.mockResolvedValueOnce({
      product_categories: [mockCategory],
      count: 1,
      offset: 0,
      limit: 100,
    });

    const result = await getCategories();
    expect(mockRequest).toHaveBeenCalledWith("store/product-categories", {
      searchParams: { limit: 100, include_descendants_tree: true },
    });
    expect(result.product_categories).toHaveLength(1);
  });
});

describe("getCategoryByHandle", () => {
  it("returns the first matching category", async () => {
    mockRequest.mockResolvedValueOnce({ product_categories: [mockCategory] });

    const result = await getCategoryByHandle("baby-care");
    expect(result).toEqual(mockCategory);
  });

  it("returns null when not found", async () => {
    mockRequest.mockResolvedValueOnce({ product_categories: [] });
    const result = await getCategoryByHandle("nonexistent");
    expect(result).toBeNull();
  });
});

// ── Cart ────────────────────────────────────────────────────────────────

describe("getOrCreateCart", () => {
  it("returns existing cart if ID is stored", async () => {
    mockGetCartId.mockReturnValue("cart_01");
    mockRequest.mockResolvedValueOnce({ cart: mockCart });

    const result = await getOrCreateCart();
    expect(result).toEqual(mockCart);
    expect(mockRequest).toHaveBeenCalledWith("store/carts/cart_01");
  });

  it("creates new cart when no stored ID", async () => {
    mockGetCartId.mockReturnValue(null);
    mockRequest
      .mockResolvedValueOnce({ regions: [mockRegion] })
      .mockResolvedValueOnce({ cart: mockCart });

    const result = await getOrCreateCart();
    expect(result).toEqual(mockCart);
    expect(mockSetCartId).toHaveBeenCalledWith("cart_01");
  });

  it("creates new cart if existing cart fetch fails", async () => {
    mockGetCartId.mockReturnValue("cart_expired");
    mockRequest
      .mockRejectedValueOnce(new Error("Not found"))
      .mockResolvedValueOnce({ regions: [mockRegion] })
      .mockResolvedValueOnce({ cart: mockCart });

    const result = await getOrCreateCart();
    expect(result).toEqual(mockCart);
  });
});

describe("getCart", () => {
  it("returns null when no cart ID stored", async () => {
    mockGetCartId.mockReturnValue(null);
    const result = await getCart();
    expect(result).toBeNull();
  });

  it("returns the cart when found", async () => {
    mockGetCartId.mockReturnValue("cart_01");
    mockRequest.mockResolvedValueOnce({ cart: mockCart });

    const result = await getCart();
    expect(result).toEqual(mockCart);
  });

  it("returns null on fetch error", async () => {
    mockGetCartId.mockReturnValue("cart_bad");
    mockRequest.mockRejectedValueOnce(new Error("Not found"));

    const result = await getCart();
    expect(result).toBeNull();
  });
});

describe("addToCart", () => {
  it("creates cart then adds line item", async () => {
    mockGetCartId.mockReturnValue("cart_01");
    mockRequest
      .mockResolvedValueOnce({ cart: mockCart })
      .mockResolvedValueOnce({ cart: { ...mockCart, items: [...mockCart.items] } });

    await addToCart("variant_01", 2);
    expect(mockRequest).toHaveBeenLastCalledWith("store/carts/cart_01/line-items", {
      method: "POST",
      body: { variant_id: "variant_01", quantity: 2 },
    });
  });
});

describe("updateLineItem", () => {
  it("throws if no cart ID", async () => {
    mockGetCartId.mockReturnValue(null);
    await expect(updateLineItem("item_01", 3)).rejects.toThrow("No cart found");
  });

  it("updates quantity on the line item", async () => {
    mockGetCartId.mockReturnValue("cart_01");
    mockRequest.mockResolvedValueOnce({ cart: mockCart });

    await updateLineItem("item_01", 3);
    expect(mockRequest).toHaveBeenCalledWith("store/carts/cart_01/line-items/item_01", {
      method: "POST",
      body: { quantity: 3 },
    });
  });
});

describe("removeLineItem", () => {
  it("throws if no cart ID", async () => {
    mockGetCartId.mockReturnValue(null);
    await expect(removeLineItem("item_01")).rejects.toThrow("No cart found");
  });

  it("removes the line item", async () => {
    mockGetCartId.mockReturnValue("cart_01");
    mockRequest.mockResolvedValueOnce({ cart: { ...mockCart, items: [] } });

    await removeLineItem("item_01");
    expect(mockRequest).toHaveBeenCalledWith("store/carts/cart_01/line-items/item_01", {
      method: "DELETE",
    });
  });
});

describe("updateCart", () => {
  it("sends data to the cart endpoint", async () => {
    mockGetCartId.mockReturnValue("cart_01");
    mockRequest.mockResolvedValueOnce({ cart: mockCart });

    await updateCart({ email: "test@example.com" });
    expect(mockRequest).toHaveBeenCalledWith("store/carts/cart_01", {
      method: "POST",
      body: { email: "test@example.com" },
    });
  });
});

describe("addPromoCode", () => {
  it("sends promo code", async () => {
    mockGetCartId.mockReturnValue("cart_01");
    mockRequest.mockResolvedValueOnce({ cart: mockCart });

    await addPromoCode("BABY10");
    expect(mockRequest).toHaveBeenCalledWith("store/carts/cart_01/promotions", {
      method: "POST",
      body: { promo_codes: ["BABY10"] },
    });
  });
});

describe("removePromoCode", () => {
  it("sends promo code removal", async () => {
    mockGetCartId.mockReturnValue("cart_01");
    mockRequest.mockResolvedValueOnce({ cart: mockCart });

    await removePromoCode("BABY10");
    expect(mockRequest).toHaveBeenCalledWith("store/carts/cart_01/promotions", {
      method: "DELETE",
      body: { promo_codes: ["BABY10"] },
    });
  });
});

// ── Shipping ─────────────────────────────────────────────────────────────

describe("getShippingOptions", () => {
  it("returns empty when no cart ID", async () => {
    mockGetCartId.mockReturnValue(null);
    const result = await getShippingOptions();
    expect(result).toEqual({ shipping_options: [] });
  });

  it("fetches shipping options with cart ID", async () => {
    mockGetCartId.mockReturnValue("cart_01");
    mockRequest.mockResolvedValueOnce({
      shipping_options: [{ id: "so_1", name: "Standard", amount: 500 }],
    });

    const result = await getShippingOptions();
    expect(result.shipping_options).toHaveLength(1);
  });
});

describe("addShippingMethod", () => {
  it("adds shipping method to cart", async () => {
    mockGetCartId.mockReturnValue("cart_01");
    mockRequest.mockResolvedValueOnce({ cart: mockCart });

    await addShippingMethod("so_1");
    expect(mockRequest).toHaveBeenCalledWith("store/carts/cart_01/shipping-methods", {
      method: "POST",
      body: { option_id: "so_1" },
    });
  });
});

// ── Checkout ─────────────────────────────────────────────────────────────

describe("completeCart", () => {
  it("completes the cart", async () => {
    mockGetCartId.mockReturnValue("cart_01");
    mockRequest.mockResolvedValueOnce({ type: "order", order: { id: "order_1" } });

    const result = await completeCart();
    expect(mockRequest).toHaveBeenCalledWith("store/carts/cart_01/complete", {
      method: "POST",
    });
    expect(result.type).toBe("order");
  });
});

// ── Auth ────────────────────────────────────────────────────────────────

describe("orders", () => {
  it("fetches orders with expanded item media fields", async () => {
    mockGetAuthToken.mockReturnValue("jwt_123");
    mockRequest.mockResolvedValueOnce({ orders: [] });

    await getOrders();

    expect(mockRequest).toHaveBeenCalledWith("store/orders", {
      headers: { Authorization: "Bearer jwt_123" },
      searchParams: {
        fields: "*items,*items.variant,*items.product,*items.product.images",
      },
    });
  });

  it("fetches a single order with expanded item media fields", async () => {
    mockGetAuthToken.mockReturnValue("jwt_123");
    mockRequest.mockResolvedValueOnce({ order: { id: "order_1", items: [] } });

    await getOrderById("order_1");

    expect(mockRequest).toHaveBeenCalledWith("store/orders/order_1", {
      headers: { Authorization: "Bearer jwt_123" },
      searchParams: {
        fields: "*items,*items.variant,*items.product,*items.product.images",
      },
    });
  });
});

// ── Auth ────────────────────────────────────────────────────────────────

describe("loginCustomer", () => {
  it("sends email and password", async () => {
    mockRequest.mockResolvedValueOnce({ token: "jwt_123" });

    const result = await loginCustomer("test@example.com", "password");
    expect(mockRequest).toHaveBeenCalledWith("auth/customer/emailpass", {
      method: "POST",
      body: { email: "test@example.com", password: "password" },
    });
    expect(result.token).toBe("jwt_123");
  });
});

describe("registerCustomer", () => {
  it("creates auth identity then customer", async () => {
    mockRequest.mockResolvedValueOnce({ token: "jwt_123" }).mockResolvedValueOnce({
      customer: { id: "cus_1", email: "test@example.com", has_account: true },
    });

    const result = await registerCustomer({
      email: "test@example.com",
      password: "password",
      first_name: "John",
      last_name: "Doe",
    });

    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(mockRequest).toHaveBeenNthCalledWith(1, "auth/customer/emailpass/register", {
      method: "POST",
      body: { email: "test@example.com", password: "password" },
    });
    expect(result.token).toBe("jwt_123");
    expect(result.customer.id).toBe("cus_1");
  });
});

describe("getCustomer", () => {
  it("returns null when no token", async () => {
    mockGetAuthToken.mockReturnValue(null);
    const result = await getCustomer();
    expect(result).toBeNull();
  });

  it("fetches customer with auth header", async () => {
    mockGetAuthToken.mockReturnValue("jwt_123");
    mockRequest.mockResolvedValueOnce({
      customer: { id: "cus_1", email: "test@example.com", has_account: true },
    });

    const result = await getCustomer();
    expect(result!.id).toBe("cus_1");
  });

  it("returns null on error", async () => {
    mockGetAuthToken.mockReturnValue("jwt_expired");
    mockRequest.mockRejectedValueOnce(new Error("Unauthorized"));

    const result = await getCustomer();
    expect(result).toBeNull();
  });

  it("clears the stored token on auth failures", async () => {
    mockGetAuthToken.mockReturnValue("jwt_expired");
    const authError = Object.assign(new Error("Unauthorized"), { status: 401 });
    mockRequest.mockRejectedValueOnce(authError);

    await expect(getCustomer()).resolves.toBeNull();
    expect(mockClearAuthToken).toHaveBeenCalled();
  });
});

describe("wishlist helpers", () => {
  it("reads wishlist IDs from customer metadata", () => {
    expect(
      getCustomerWishlistProductIds({
        id: "cus_1",
        email: "test@example.com",
        has_account: true,
        metadata: { wishlist_product_ids: ["prod_1", "prod_2", "prod_1"] },
      }),
    ).toEqual(["prod_1", "prod_2"]);
  });

  it("returns guest wishlist IDs when unauthenticated", async () => {
    mockGetAuthToken.mockReturnValue(null);
    mockGetStoredWishlistIds.mockReturnValue(["prod_1"]);

    await expect(getWishlistProductIds()).resolves.toEqual(["prod_1"]);
  });

  it("stores guest wishlist IDs locally when unauthenticated", async () => {
    mockGetAuthToken.mockReturnValue(null);

    await setWishlistProductIds(["prod_1", "prod_2"]);

    expect(mockSetStoredWishlistIds).toHaveBeenCalledWith(["prod_1", "prod_2"]);
  });

  it("stores signed-in wishlist IDs in customer metadata", async () => {
    mockGetAuthToken.mockReturnValue("jwt_123");
    mockRequest
      .mockResolvedValueOnce({
        customer: { id: "cus_1", email: "test@example.com", has_account: true, metadata: {} },
      })
      .mockResolvedValueOnce({
        customer: {
          id: "cus_1",
          email: "test@example.com",
          has_account: true,
          metadata: { wishlist_product_ids: ["prod_1"] },
        },
      });

    await setWishlistProductIds(["prod_1"]);

    expect(mockRequest).toHaveBeenNthCalledWith(2, "store/customers/me", {
      method: "POST",
      body: { metadata: { wishlist_product_ids: ["prod_1"] } },
      headers: { Authorization: "Bearer jwt_123" },
    });
  });

  it("toggles a product in the guest wishlist", async () => {
    mockGetAuthToken.mockReturnValue(null);
    mockGetStoredWishlistIds.mockReturnValue(["prod_1"]);

    await expect(toggleWishlistProduct("prod_2")).resolves.toEqual(["prod_1", "prod_2"]);
    expect(mockSetStoredWishlistIds).toHaveBeenCalledWith(["prod_1", "prod_2"]);
  });

  it("merges guest wishlist into customer metadata after auth", async () => {
    mockGetStoredWishlistIds.mockReturnValue(["prod_2"]);
    mockGetAuthToken.mockReturnValue("jwt_123");
    mockRequest
      .mockResolvedValueOnce({
        customer: {
          id: "cus_1",
          email: "test@example.com",
          has_account: true,
          metadata: { wishlist_product_ids: ["prod_1"] },
        },
      })
      .mockResolvedValueOnce({
        customer: {
          id: "cus_1",
          email: "test@example.com",
          has_account: true,
          metadata: { wishlist_product_ids: ["prod_1", "prod_2"] },
        },
      });

    const result = await mergeWishlistAfterAuth();

    expect(result.wishlistIds).toEqual(["prod_1", "prod_2"]);
    expect(mockClearStoredWishlistIds).toHaveBeenCalled();
  });

  it("keeps guest wishlist data when session rehydration fails", async () => {
    mockGetStoredWishlistIds.mockReturnValue(["prod_2"]);
    mockGetAuthToken.mockReturnValue("jwt_expired");
    mockRequest.mockRejectedValueOnce(new Error("Unauthorized"));

    const result = await mergeWishlistAfterAuth();

    expect(result.customer).toBeNull();
    expect(result.wishlistIds).toEqual(["prod_2"]);
    expect(mockClearStoredWishlistIds).not.toHaveBeenCalled();
  });
});

// ── Payment ──────────────────────────────────────────────────────────────

describe("initializePaymentSession", () => {
  it("creates payment collection then payment session", async () => {
    mockGetCartId.mockReturnValue("cart_01");
    mockRequest
      .mockResolvedValueOnce({ payment_collection: { id: "pc_01" } })
      .mockResolvedValueOnce({
        payment_collection: {
          id: "pc_01",
          payment_sessions: [{ id: "ps_01", provider_id: "pp_system_default", status: "pending" }],
        },
      });

    const result = await initializePaymentSession();
    expect(mockRequest).toHaveBeenNthCalledWith(1, "store/payment-collections", {
      method: "POST",
      body: { cart_id: "cart_01" },
    });
    expect(mockRequest).toHaveBeenNthCalledWith(
      2,
      "store/payment-collections/pc_01/payment-sessions",
      {
        method: "POST",
        body: { provider_id: "pp_system_default" },
      },
    );
    expect(result.payment_collection.payment_sessions).toHaveLength(1);
  });

  it("throws when no cart ID", async () => {
    mockGetCartId.mockReturnValue(null);
    await expect(initializePaymentSession()).rejects.toThrow("No cart found");
  });
});

// ── Customer Profile ────────────────────────────────────────────────────

describe("updateCustomer", () => {
  it("updates customer profile", async () => {
    mockGetAuthToken.mockReturnValue("jwt_123");
    mockRequest.mockResolvedValueOnce({
      customer: { id: "cus_1", email: "test@example.com", has_account: true, first_name: "Jane" },
    });

    const result = await updateCustomer({ first_name: "Jane" });
    expect(mockRequest).toHaveBeenCalledWith("store/customers/me", {
      method: "POST",
      body: { first_name: "Jane" },
      headers: { Authorization: "Bearer jwt_123" },
    });
    expect(result.first_name).toBe("Jane");
  });

  it("throws when not authenticated", async () => {
    mockGetAuthToken.mockReturnValue(null);
    await expect(updateCustomer({ first_name: "Jane" })).rejects.toThrow("Not authenticated");
  });
});

// ── Customer Addresses ──────────────────────────────────────────────────

describe("getCustomerAddresses", () => {
  it("fetches addresses with auth header", async () => {
    mockGetAuthToken.mockReturnValue("jwt_123");
    mockRequest.mockResolvedValueOnce({ addresses: [{ id: "addr_1", first_name: "John" }] });

    const result = await getCustomerAddresses();
    expect(mockRequest).toHaveBeenCalledWith("store/customers/me/addresses", {
      headers: { Authorization: "Bearer jwt_123" },
    });
    expect(result).toHaveLength(1);
  });

  it("throws when not authenticated", async () => {
    mockGetAuthToken.mockReturnValue(null);
    await expect(getCustomerAddresses()).rejects.toThrow("Not authenticated");
  });
});

describe("addCustomerAddress", () => {
  it("adds an address", async () => {
    mockGetAuthToken.mockReturnValue("jwt_123");
    const addressData = {
      first_name: "John",
      last_name: "Doe",
      address_1: "123 Main St",
      city: "Nairobi",
      country_code: "et",
    };
    mockRequest.mockResolvedValueOnce({ address: { id: "addr_1", ...addressData } });

    const result = await addCustomerAddress(addressData);
    expect(mockRequest).toHaveBeenCalledWith("store/customers/me/addresses", {
      method: "POST",
      body: addressData,
      headers: { Authorization: "Bearer jwt_123" },
    });
    expect(result.id).toBe("addr_1");
  });
});

describe("updateCustomerAddress", () => {
  it("updates an address by ID", async () => {
    mockGetAuthToken.mockReturnValue("jwt_123");
    const data = {
      first_name: "Jane",
      last_name: "Doe",
      address_1: "456 New St",
      city: "Nairobi",
      country_code: "et",
    };
    mockRequest.mockResolvedValueOnce({ address: { id: "addr_1", ...data } });

    const result = await updateCustomerAddress("addr_1", data);
    expect(mockRequest).toHaveBeenCalledWith("store/customers/me/addresses/addr_1", {
      method: "POST",
      body: data,
      headers: { Authorization: "Bearer jwt_123" },
    });
    expect(result.first_name).toBe("Jane");
  });
});

describe("deleteCustomerAddress", () => {
  it("deletes an address by ID", async () => {
    mockGetAuthToken.mockReturnValue("jwt_123");
    mockRequest.mockResolvedValueOnce(undefined);

    await deleteCustomerAddress("addr_1");
    expect(mockRequest).toHaveBeenCalledWith("store/customers/me/addresses/addr_1", {
      method: "DELETE",
      headers: { Authorization: "Bearer jwt_123" },
    });
  });

  it("throws when not authenticated", async () => {
    mockGetAuthToken.mockReturnValue(null);
    await expect(deleteCustomerAddress("addr_1")).rejects.toThrow("Not authenticated");
  });
});

// ── Password Reset ──────────────────────────────────────────────────────

describe("requestPasswordReset", () => {
  it("sends reset request with email", async () => {
    mockRequest.mockResolvedValueOnce({});

    await requestPasswordReset("test@example.com");
    expect(mockRequest).toHaveBeenCalledWith("auth/customer/emailpass/reset-password", {
      method: "POST",
      body: { identifier: "test@example.com" },
    });
  });
});

describe("resetPassword", () => {
  it("sends new password with token", async () => {
    mockRequest.mockResolvedValueOnce({});

    await resetPassword("reset_token", "test@example.com", "newPassword123");
    expect(mockRequest).toHaveBeenCalledWith("auth/customer/emailpass/update", {
      method: "POST",
      body: { email: "test@example.com", password: "newPassword123" },
      headers: { Authorization: "Bearer reset_token" },
    });
  });
});

// ── Email Verification ──────────────────────────────────────────────────

describe("verifyEmail", () => {
  it("sends verification request", async () => {
    mockRequest.mockResolvedValueOnce({ message: "ok", verified: true });

    const result = await verifyEmail("verify_token", "test@example.com");
    expect(mockRequest).toHaveBeenCalledWith("store/customers/verify", {
      method: "POST",
      body: { token: "verify_token", email: "test@example.com" },
    });
    expect(result.verified).toBe(true);
  });
});

describe("resendVerificationEmail", () => {
  it("sends resend request", async () => {
    mockRequest.mockResolvedValueOnce({ message: "sent" });

    const result = await resendVerificationEmail("test@example.com");
    expect(mockRequest).toHaveBeenCalledWith("store/customers/resend-verification", {
      method: "POST",
      body: { email: "test@example.com" },
    });
    expect(result.message).toBe("sent");
  });
});

// ── Regions ──────────────────────────────────────────────────────────────

describe("getRegions", () => {
  it("fetches regions", async () => {
    mockRequest.mockResolvedValueOnce({ regions: [mockRegion], count: 1 });

    const result = await getRegions();
    expect(result.regions).toHaveLength(1);
    expect(result.regions[0].name).toBe("Kenya");
  });
});
