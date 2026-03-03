import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import * as http from "@/lib/http";
import {
  getProducts,
  getProductByHandle,
  getProductById,
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
  completeCart,
  loginCustomer,
  registerCustomer,
  getCustomer,
  getRegions,
} from "@/lib/medusa-api";
import { mockProduct, mockCategory, mockCart, mockRegion } from "../fixtures";

vi.mock("@/lib/http", () => ({
  medusaRequest: vi.fn(),
  getStoredCartId: vi.fn(),
  setStoredCartId: vi.fn(),
  getAuthToken: vi.fn(),
}));

const mockRequest = http.medusaRequest as Mock;
const mockGetCartId = http.getStoredCartId as Mock;
const mockSetCartId = http.setStoredCartId as Mock;
const mockGetAuthToken = http.getAuthToken as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Products ────────────────────────────────────────────────────────────

describe("getProducts", () => {
  it("calls medusaRequest with default params", async () => {
    mockRequest.mockResolvedValueOnce({ products: [mockProduct], count: 1, offset: 0, limit: 20 });

    const result = await getProducts();
    expect(mockRequest).toHaveBeenCalledWith("store/products", {
      searchParams: { limit: 20, offset: 0 },
    });
    expect(result.products).toHaveLength(1);
  });

  it("merges custom params", async () => {
    mockRequest.mockResolvedValueOnce({ products: [], count: 0, offset: 0, limit: 5 });

    await getProducts({ limit: 5, q: "diapers" });
    expect(mockRequest).toHaveBeenCalledWith("store/products", {
      searchParams: { limit: 5, offset: 0, q: "diapers" },
    });
  });
});

describe("getProductByHandle", () => {
  it("returns the first product matching the handle", async () => {
    mockRequest.mockResolvedValueOnce({ products: [mockProduct] });

    const result = await getProductByHandle("pampers-baby-dry");
    expect(mockRequest).toHaveBeenCalledWith("store/products", {
      searchParams: { handle: "pampers-baby-dry", limit: 1 },
    });
    expect(result).toEqual(mockProduct);
  });

  it("returns null when no product found", async () => {
    mockRequest.mockResolvedValueOnce({ products: [] });
    const result = await getProductByHandle("nonexistent");
    expect(result).toBeNull();
  });
});

describe("getProductById", () => {
  it("fetches a product by ID", async () => {
    mockRequest.mockResolvedValueOnce({ product: mockProduct });

    const result = await getProductById("prod_01");
    expect(mockRequest).toHaveBeenCalledWith("store/products/prod_01");
    expect(result.product).toEqual(mockProduct);
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
    mockRequest
      .mockResolvedValueOnce({ token: "jwt_123" })
      .mockResolvedValueOnce({
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
});

// ── Regions ──────────────────────────────────────────────────────────────

describe("getRegions", () => {
  it("fetches regions", async () => {
    mockRequest.mockResolvedValueOnce({ regions: [mockRegion], count: 1 });

    const result = await getRegions();
    expect(result.regions).toHaveLength(1);
    expect(result.regions[0].name).toBe("Europe");
  });
});
