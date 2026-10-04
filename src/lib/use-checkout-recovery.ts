"use client";
import { useSyncExternalStore } from "react";
import {
  checkoutRecoverySnapshot,
  getCheckoutCartIdentity,
  getCheckoutRecovery,
  subscribeCheckout,
} from "@/lib/checkout-recovery";

export function useCheckoutCartIdentity() {
  return useSyncExternalStore(subscribeCheckout, getCheckoutCartIdentity, () => null);
}
export function useCheckoutRecovery() {
  useSyncExternalStore(subscribeCheckout, checkoutRecoverySnapshot, () => null);
  return getCheckoutRecovery();
}
