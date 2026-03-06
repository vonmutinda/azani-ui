import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  medusaRequest,
  getStoredCartId,
  setStoredCartId,
  clearStoredCartId,
  getStoredWishlistProductIds,
  setStoredWishlistProductIds,
  clearStoredWishlistProductIds,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
} from "@/lib/http";

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("cart ID helpers", () => {
  it("stores and retrieves a cart ID", () => {
    setStoredCartId("cart_abc");
    expect(getStoredCartId()).toBe("cart_abc");
  });

  it("clears a stored cart ID", () => {
    setStoredCartId("cart_abc");
    clearStoredCartId();
    expect(getStoredCartId()).toBeNull();
  });

  it("returns null when no cart ID is set", () => {
    expect(getStoredCartId()).toBeNull();
  });
});

describe("auth token helpers", () => {
  it("stores and retrieves an auth token", () => {
    setAuthToken("tok_123");
    expect(getAuthToken()).toBe("tok_123");
  });

  it("clears an auth token", () => {
    setAuthToken("tok_123");
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it("returns null when no token is set", () => {
    expect(getAuthToken()).toBeNull();
  });
});

describe("wishlist helpers", () => {
  it("stores and retrieves wishlist product IDs", () => {
    setStoredWishlistProductIds(["prod_1", "prod_2"]);
    expect(getStoredWishlistProductIds()).toEqual(["prod_1", "prod_2"]);
  });

  it("deduplicates wishlist product IDs", () => {
    setStoredWishlistProductIds(["prod_1", "prod_1", "prod_2"]);
    expect(getStoredWishlistProductIds()).toEqual(["prod_1", "prod_2"]);
  });

  it("clears stored wishlist product IDs", () => {
    setStoredWishlistProductIds(["prod_1"]);
    clearStoredWishlistProductIds();
    expect(getStoredWishlistProductIds()).toEqual([]);
  });

  it("returns an empty array for invalid stored data", () => {
    localStorage.setItem("medusa_wishlist_product_ids", "{not-json");
    expect(getStoredWishlistProductIds()).toEqual([]);
  });
});

describe("medusaRequest", () => {
  it("makes a GET request and parses JSON", async () => {
    const mockResponse = { products: [{ id: "prod_1" }] };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await medusaRequest<typeof mockResponse>("store/products");
    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledOnce();

    const call = vi.mocked(fetch).mock.calls[0];
    const url = call[0] as string;
    expect(url).toContain("store/products");
  });

  it("includes publishable API key header", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    await medusaRequest("store/products");

    const call = vi.mocked(fetch).mock.calls[0];
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers).toHaveProperty("x-publishable-api-key");
  });

  it("sends POST body as JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ cart: { id: "cart_1" } }),
    } as Response);

    await medusaRequest("store/carts", {
      method: "POST",
      body: { region_id: "reg_1" },
    });

    const call = vi.mocked(fetch).mock.calls[0];
    const init = call[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ region_id: "reg_1" }));
  });

  it("throws on non-OK response with message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "Not Found" }),
    } as unknown as Response);

    await expect(medusaRequest("store/products/nonexistent")).rejects.toThrow("Not Found");
  });

  it("throws generic error when no message in error response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as unknown as Response);

    await expect(medusaRequest("store/products")).rejects.toThrow("Request failed with status 500");
  });

  it("appends search params to URL", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ products: [] }),
    } as Response);

    await medusaRequest("store/products", {
      searchParams: { limit: 5, offset: 0, q: "diapers" },
    });

    const call = vi.mocked(fetch).mock.calls[0];
    const url = call[0] as string;
    expect(url).toContain("limit=5");
    expect(url).toContain("offset=0");
    expect(url).toContain("q=diapers");
  });

  it("skips undefined search params", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    await medusaRequest("store/products", {
      searchParams: { limit: 10, q: undefined },
    });

    const call = vi.mocked(fetch).mock.calls[0];
    const url = call[0] as string;
    expect(url).toContain("limit=10");
    expect(url).not.toContain("q=");
  });
});
