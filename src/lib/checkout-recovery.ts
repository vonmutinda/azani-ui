import type { MedusaCart } from "@/types/medusa";

const RECOVERY_KEY = "azani_checkout_recovery";
const CHANGE_EVENT = "azani-checkout-change";
export const CART_ID_KEY = "medusa_cart_id";
export const PAYMENT_LOCK_MESSAGE =
  "Your payment is unresolved. Return to checkout to check its status before changing your cart, delivery or payer details.";
export type CheckoutRecovery = {
  cartId: string;
  sessionId: string | null;
  state: "unresolved" | "terminal";
};

export function checkoutRecoverySnapshot() {
  return typeof window === "undefined" ? null : localStorage.getItem(RECOVERY_KEY);
}
function parse(value: string | null): CheckoutRecovery | null {
  try {
    const record = JSON.parse(value ?? "null");
    return record &&
      typeof record.cartId === "string" &&
      (record.sessionId === null || typeof record.sessionId === "string") &&
      ["unresolved", "terminal"].includes(record.state)
      ? record
      : null;
  } catch {
    return null;
  }
}
export function getCheckoutRecovery() {
  return parse(checkoutRecoverySnapshot());
}
export function notifyCartIdentity() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}
export function subscribeCheckout(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}
export function saveCheckoutRecovery(record: CheckoutRecovery) {
  const value = JSON.stringify(record);
  if (checkoutRecoverySnapshot() === value) return;
  localStorage.setItem(RECOVERY_KEY, value);
  notifyCartIdentity();
}
export function clearCheckoutRecovery(cartId: string) {
  if (getCheckoutRecovery()?.cartId !== cartId) return;
  localStorage.removeItem(RECOVERY_KEY);
  notifyCartIdentity();
}
export function getCheckoutCartIdentity() {
  return (
    getCheckoutRecovery()?.cartId ??
    (typeof window === "undefined" ? null : localStorage.getItem(CART_ID_KEY))
  );
}
export function assertCartEditable(cartId: string) {
  const recovery = getCheckoutRecovery();
  if (recovery?.cartId === cartId && recovery.state === "unresolved") {
    throw new Error(PAYMENT_LOCK_MESSAGE);
  }
}

// Observe only the original tracked session. Missing/replaced sessions never release a lock.
export function rememberCheckoutCart(cart: MedusaCart) {
  const recovery = getCheckoutRecovery();
  if (recovery && recovery.cartId !== cart.id) return;
  const sessions = cart.payment_collection?.payment_sessions;
  const session = sessions?.find(
    (candidate) =>
      candidate.provider_id === "pp_family_bank_family_bank" &&
      (!recovery?.sessionId || candidate.id === recovery.sessionId),
  );
  if (!session) return;
  const terminal =
    ["canceled", "error"].includes(session.status) ||
    ["canceled", "failed"].includes(session.data?.status ?? "");
  saveCheckoutRecovery({
    cartId: cart.id,
    sessionId: session.id,
    state: terminal ? "terminal" : "unresolved",
  });
}
