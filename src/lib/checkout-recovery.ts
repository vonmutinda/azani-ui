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
  attemptId?: string;
  phase?: "collection" | "session";
  previousSessionId?: string;
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

// A sessionless retry may discover its new session, never the preceding attempt.
export function matchesCheckoutRecovery(
  session: { id: string; provider_id: string },
  recovery = getCheckoutRecovery(),
) {
  return (
    recovery?.phase !== "collection" &&
    session.provider_id === "pp_family_bank_family_bank" &&
    (!recovery?.sessionId || session.id === recovery.sessionId) &&
    session.id !== recovery?.previousSessionId
  );
}

// Observe only the original tracked session. Missing/replaced sessions never release a lock.
export function rememberCheckoutCart(cart: MedusaCart) {
  const recovery = getCheckoutRecovery();
  if (recovery && recovery.cartId !== cart.id) return;
  // Collection creation has not started a new bank request. Old observations
  // cannot release its edit lock while the owned initiation is in flight.
  if (recovery?.phase === "collection") return;
  const sessions = cart.payment_collection?.payment_sessions;
  const session = sessions?.find((candidate) => matchesCheckoutRecovery(candidate, recovery));
  if (!session) return;
  const terminal =
    ["canceled", "error"].includes(session.status) ||
    ["canceled", "failed"].includes(session.data?.status ?? "");
  saveCheckoutRecovery({
    ...recovery,
    cartId: cart.id,
    sessionId: session.id,
    state: terminal ? "terminal" : "unresolved",
  });
}
