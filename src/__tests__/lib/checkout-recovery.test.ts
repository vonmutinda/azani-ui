import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/medusa-api";
import { getStoredCartId, setStoredCartId } from "@/lib/http";
import { mockCart, mockRegion } from "../fixtures";

const providerId = "pp_family_bank_family_bank";
let completed = false;
let sessionPresent = true;
let orderResponse: unknown;
let writes: string[];
let sessionStarts = 0;
const cart = () => ({
  ...mockCart,
  id: "cart_pending",
  completed_at: completed ? "2026-10-03T00:00:00Z" : null,
  payment_collection: {
    id: "pc_1",
    payment_sessions: sessionPresent
      ? [{ id: "ps_1", provider_id: providerId, status: completed ? "authorized" : "pending" }]
      : [],
  },
});

beforeEach(() => {
  localStorage.clear();
  setStoredCartId("cart_pending");
  completed = false;
  sessionPresent = true;
  sessionStarts = 0;
  writes = [];
  orderResponse = { type: "order", order: { id: "order_paid" } };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const path = new URL(String(input)).pathname;
      if (init?.method === "POST" || init?.method === "DELETE") writes.push(path);
      let body: unknown;
      if (path.endsWith("/payment-sessions")) {
        sessionStarts++;
        body = { payment_collection: cart().payment_collection };
      } else if (path === "/store/payment-collections")
        body = { payment_collection: { id: "pc_1" } };
      else if (path === "/store/regions") body = { regions: [mockRegion] };
      else if (path === "/store/carts" && init?.method === "POST")
        body = { cart: { ...mockCart, id: "cart_new" } };
      else if (path === "/store/carts/cart_pending/complete") body = orderResponse;
      else body = { cart: cart() };
      return { ok: true, json: async () => body } as Response;
    }),
  );
});

const initiate = () =>
  api.initializePaymentSession({ providerId, data: { mpesa_phone: "0712345678" } });

describe("durable checkout recovery with real cart helpers", () => {
  it("retains guest recovery across ordinary cleanup, a new shopping cart and reload", async () => {
    await initiate();
    completed = true;
    expect(await api.getCart()).toBeNull();
    expect(getStoredCartId()).toBeNull();
    expect((await api.getOrCreateCart()).id).toBe("cart_new");
    expect((await api.getCheckoutCart())?.id).toBe("cart_pending");
    expect((await api.completeCart()).order).toEqual({ id: "order_paid" });
    expect(getStoredCartId()).toBe("cart_new");
    expect(sessionStarts).toBe(1);
    expect(localStorage.getItem("azani_checkout_recovery")).toBeNull();
  });

  it.each([
    ["quantity", () => api.updateLineItem("item_1", 3)],
    ["removal", () => api.removeLineItem("item_1")],
    ["addition", () => api.addToCart("variant_1", 1)],
    ["promo", () => api.addPromoCode("SAVE")],
    ["promo removal", () => api.removePromoCode("SAVE")],
    ["delivery", () => api.addShippingMethod("express")],
    ["payer/address", () => api.updateCart({ shipping_address: { phone: "0799999999" } })],
  ])("blocks %s edits while the remote prompt is unresolved", async (_name, edit) => {
    await initiate();
    writes = [];
    await expect((edit as () => Promise<unknown>)()).rejects.toThrow(/payment.*unresolved/i);
    expect(writes).toEqual([]);
  });

  it("retains a missing session across reload and refuses another STK", async () => {
    await initiate();
    sessionPresent = false;
    await api.getCheckoutCart();
    await expect(initiate()).rejects.toThrow(/payment.*unresolved/i);
    expect(sessionStarts).toBe(1);
    expect(localStorage.getItem("azani_checkout_recovery")).toContain("ps_1");
  });

  it("retains recovery on a cart/error completion response", async () => {
    await initiate();
    completed = true;
    await api.getCart();
    orderResponse = { type: "cart", error: { message: "Processing" } };
    await api.completeCart();
    expect((await api.getCheckoutCart())?.id).toBe("cart_pending");
    expect(localStorage.getItem("azani_checkout_recovery")).toContain("cart_pending");
  });
});
