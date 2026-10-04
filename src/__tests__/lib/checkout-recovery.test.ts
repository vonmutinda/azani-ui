import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/medusa-api";
import { getStoredCartId, setStoredCartId } from "@/lib/http";
import { getCheckoutRecovery, saveCheckoutRecovery } from "@/lib/checkout-recovery";
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
  it("releases a collection-only failure so edits and initiation can be retried", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ message: "Collection unavailable" }),
    } as Response);
    await expect(initiate()).rejects.toThrow("Collection unavailable");
    expect(sessionStarts).toBe(0);
    expect(writes).toEqual([]);
    expect(localStorage.getItem("azani_checkout_recovery")).toBeNull();
    await api.updateLineItem("item_1", 3);
    expect(writes).toEqual(["/store/carts/cart_pending/line-items/item_1"]);
    await initiate();
    expect(sessionStarts).toBe(1);
  });

  it("restores the previous terminal recovery identity when collection creation fails", async () => {
    const previous = { cartId: "cart_pending", sessionId: "ps_canceled", state: "terminal" };
    localStorage.setItem("azani_checkout_recovery", JSON.stringify(previous));
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Collection connection lost"));
    await expect(initiate()).rejects.toThrow("Collection connection lost");
    expect(JSON.parse(localStorage.getItem("azani_checkout_recovery")!)).toEqual(previous);
    expect(sessionStarts).toBe(0);
  });

  it("blocks old terminal observations, edits and duplicate initialization while collection creation is deferred", async () => {
    const previous = {
      cartId: "cart_pending",
      sessionId: "old_canceled",
      state: "terminal" as const,
    };
    saveCheckoutRecovery(previous);
    let rejectCollection!: (error: Error) => void;
    const collectionResponse = new Promise<Response>((_resolve, reject) => {
      rejectCollection = reject;
    });
    vi.mocked(fetch)
      .mockImplementationOnce(() => collectionResponse)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cart: {
            ...cart(),
            payment_collection: {
              id: "pc_1",
              payment_sessions: [
                { id: "old_canceled", provider_id: providerId, status: "canceled" },
              ],
            },
          },
        }),
      } as Response);
    const pending = initiate();
    await api.getCart();
    expect(getCheckoutRecovery()).toMatchObject({
      sessionId: null,
      state: "unresolved",
      phase: "collection",
    });
    await expect(initiate()).rejects.toThrow(/payment is unresolved/);
    await expect(api.updateLineItem("item_1", 3)).rejects.toThrow(/payment is unresolved/);
    expect(fetch).toHaveBeenCalledTimes(2);
    const rejection = expect(pending).rejects.toThrow("Collection response lost");
    rejectCollection(new Error("Collection response lost"));
    await rejection;
    expect(getCheckoutRecovery()).toEqual(previous);
    expect(sessionStarts).toBe(0);
  });

  it("does not clear a newer recovery owner when an older collection request fails", async () => {
    let rejectCollection!: (error: Error) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise<Response>((_resolve, reject) => {
          rejectCollection = reject;
        }),
    );
    const pending = initiate();
    const newer = {
      cartId: "cart_pending",
      sessionId: "new_session",
      state: "unresolved" as const,
      attemptId: "another_tab",
    };
    saveCheckoutRecovery(newer);
    const rejection = expect(pending).rejects.toThrow("Old collection failure");
    rejectCollection(new Error("Old collection failure"));
    await rejection;
    expect(getCheckoutRecovery()).toEqual(newer);
    expect(sessionStarts).toBe(0);
  });

  it("retains the lock after an uncertain session-initiation response", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment_collection: { id: "pc_1" } }),
      } as Response)
      .mockRejectedValueOnce(new Error("Session response lost"));
    await expect(initiate()).rejects.toThrow("Session response lost");
    const requests = vi.mocked(fetch).mock.calls;
    expect(String(requests[1][0])).toContain("/payment-sessions");
    await expect(initiate()).rejects.toThrow(/payment is unresolved/);
    await expect(api.updateLineItem("item_1", 3)).rejects.toThrow(/payment is unresolved/);
    expect(requests).toHaveLength(2);
  });

  it("keeps a retry locked through stale terminal observations and an uncertain response, then accepts its new terminal session", async () => {
    saveCheckoutRecovery({ cartId: "cart_pending", sessionId: "old_canceled", state: "terminal" });
    let sessionStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      sessionStarted = resolve;
    });
    let rejectSession!: (error: Error) => void;
    const sessionResponse = new Promise<Response>((_resolve, reject) => {
      rejectSession = reject;
    });
    let observedId = "old_canceled";
    const posts: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const path = new URL(String(input)).pathname;
        if (init?.method === "POST") posts.push(path);
        if (path.endsWith("/payment-sessions")) {
          sessionStarted();
          return sessionResponse;
        }
        return {
          ok: true,
          json: async () =>
            path === "/store/payment-collections"
              ? { payment_collection: { id: "pc_1" } }
              : {
                  cart: {
                    ...mockCart,
                    id: "cart_pending",
                    payment_collection: {
                      id: "pc_1",
                      payment_sessions: [
                        { id: observedId, provider_id: providerId, status: "canceled" },
                      ],
                    },
                  },
                },
        } as Response;
      }),
    );
    const pending = initiate();
    await started;
    await api.getCart();
    expect(getCheckoutRecovery()?.state).toBe("unresolved");
    await expect(initiate()).rejects.toThrow(/payment is unresolved/);
    await expect(api.updateLineItem("item_1", 3)).rejects.toThrow(/payment is unresolved/);
    const rejection = expect(pending).rejects.toThrow("Unknown session outcome");
    rejectSession(new Error("Unknown session outcome"));
    await rejection;
    await api.getCheckoutCart();
    expect(getCheckoutRecovery()?.state).toBe("unresolved");
    await expect(initiate()).rejects.toThrow(/payment is unresolved/);
    expect(posts.filter((path) => path.endsWith("/payment-sessions"))).toHaveLength(1);
    observedId = "new_canceled";
    await api.getCheckoutCart();
    expect(getCheckoutRecovery()).toMatchObject({ sessionId: "new_canceled", state: "terminal" });
    await api.updateLineItem("item_1", 3);
    expect(posts).toContain("/store/carts/cart_pending/line-items/item_1");
  });

  it("does not let an older initiation response overwrite a newer owned retry", async () => {
    saveCheckoutRecovery({ cartId: "cart_pending", sessionId: "old_canceled", state: "terminal" });
    const replies: Array<(value: Response) => void> = [];
    let observedId = "old_canceled";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const path = new URL(String(input)).pathname;
        if (path.endsWith("/payment-sessions"))
          return new Promise<Response>((resolve) => replies.push(resolve));
        return {
          ok: true,
          json: async () =>
            path === "/store/payment-collections"
              ? { payment_collection: { id: "pc_1" } }
              : {
                  cart: {
                    ...mockCart,
                    id: "cart_pending",
                    payment_collection: {
                      id: "pc_1",
                      payment_sessions: [
                        { id: observedId, provider_id: providerId, status: "canceled" },
                      ],
                    },
                  },
                },
        } as Response;
      }),
    );
    const first = initiate();
    await vi.waitFor(() => expect(replies).toHaveLength(1));
    observedId = "first_retry_canceled";
    await api.getCheckoutCart();
    const second = initiate();
    await vi.waitFor(() => expect(replies).toHaveLength(2));
    const secondRecovery = getCheckoutRecovery();
    replies[0]({
      ok: true,
      json: async () => ({
        payment_collection: {
          id: "pc_1",
          payment_sessions: [
            { id: "first_retry_canceled", provider_id: providerId, status: "pending" },
          ],
        },
      }),
    } as Response);
    await expect(first).rejects.toThrow("Payment attempt changed");
    expect(getCheckoutRecovery()).toEqual(secondRecovery);
    await expect(api.updateLineItem("item_1", 3)).rejects.toThrow(/payment is unresolved/);
    replies[1]({
      ok: true,
      json: async () => ({
        payment_collection: {
          id: "pc_1",
          payment_sessions: [{ id: "second_retry", provider_id: providerId, status: "pending" }],
        },
      }),
    } as Response);
    await second;
    expect(getCheckoutRecovery()).toMatchObject({ sessionId: "second_retry", state: "unresolved" });
  });
});
