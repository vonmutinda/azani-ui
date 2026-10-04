"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Shirt,
  Check,
  Clock,
  CreditCard,
  MapPin,
  Package,
  Receipt,
  Smartphone,
  Truck,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { EnamelUtilityIcon } from "@/components/enamel-utility-icon";
import Image from "next/image";
import {
  getCheckoutCart,
  getProductsByIds,
  updateCart,
  getShippingOptions,
  addShippingMethod,
  initializePaymentSession,
  completeCart,
  getRegions,
  getCustomer,
  getCustomerAddresses,
} from "@/lib/medusa-api";
import {
  formatPrice,
  formatOrderRef,
  getVariantAvailability,
  getProductImageRotation,
  resolveOrderItemImage,
  getCartItemsSubtotal,
  getCartDisplayAmounts,
} from "@/lib/formatters";
import { rememberCheckoutCart, matchesCheckoutRecovery } from "@/lib/checkout-recovery";
import { useCheckoutCartIdentity, useCheckoutRecovery } from "@/lib/use-checkout-recovery";
import { qualifiesForFreeShipping, freeShippingThresholdLabel } from "@/lib/shipping";
import { MedusaAddress, MedusaProduct, MedusaShippingOption, MedusaLineItem } from "@/types/medusa";

// The API has no standalone Paybill initiation contract. Keep the choice disabled.
const MPESA_PAYBILL_NUMBER = process.env.NEXT_PUBLIC_AZANI_PAYBILL_NUMBER?.trim() || "";
const PAYBILL_AVAILABLE = false;
const MPESA_BUSINESS_NAME = "Azani";

// Waiting thresholds only affect copy. A timeout is never evidence of payment.
const STK_SLOW_THRESHOLD_SECS = 60;
const STK_TIMEOUT_THRESHOLD_SECS = 90;

// One consistent, accessible "go back a step" control: 44px touch target
// (WCAG 2.5.5) and a visible focus ring (2.4.7), reused across every step.
const BACK_LINK_CLASS =
  "text-muted hover:text-foreground hover:bg-foreground/[0.04] focus-visible:ring-foreground inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

type PaymentMethod = "mpesa_express" | "mpesa_paybill";
type Step = "address" | "shipping" | "payment" | "review";
type PaymentSession = { id: string; provider_id: string; status: string };
type CheckoutPaymentResult = { type: "payment_pending" } | { type: "payment_captured" };
type PaymentOutcome = { kind: "canceled" | "failed"; resultDesc?: string };

// Medusa normalizes provider capture to an authorized session and captures Payment.
const PAID_PAYMENT_STATUSES = new Set(["authorized", "captured"]);

function toCheckoutAddress(address: Partial<MedusaAddress>) {
  return {
    first_name: address.first_name ?? "",
    last_name: address.last_name ?? "",
    address_1: address.address_1 ?? "",
    city: address.city ?? "",
    province: address.province ?? "",
    postal_code: address.postal_code ?? "",
    country_code: address.country_code ?? "ke",
    phone: address.phone ?? "+254",
  };
}

const SHIPPING_META: Record<string, { icon: React.ElementType; delivery: string; note?: string }> =
  {
    "Free Shipping": {
      icon: Truck,
      delivery: "Delivery estimate confirmed with your order",
      note: `Orders over ${freeShippingThresholdLabel()}`,
    },
    "Standard Shipping": {
      icon: Clock,
      delivery: "Delivery estimate confirmed with your order",
      note: "KSh150",
    },
    "Express Shipping": {
      icon: Zap,
      delivery: "Priority delivery where available",
      note: "KSh500",
    },
  };

function getCheckoutItemProduct(item: MedusaLineItem, productsById: Map<string, MedusaProduct>) {
  if (item.product_id) {
    return productsById.get(item.product_id) ?? item.product;
  }
  return item.product;
}

function getCheckoutItemAvailability(
  item: MedusaLineItem,
  productsById: Map<string, MedusaProduct>,
) {
  if (item.product_id && !productsById.has(item.product_id))
    return {
      ...getVariantAvailability(undefined),
      label: "No longer available — remove this item",
    };
  const product = getCheckoutItemProduct(item, productsById);
  const variant = product?.variants?.find((candidate) => candidate.id === item.variant_id);
  return getVariantAvailability(variant);
}

function canFulfillCheckoutItem(item: MedusaLineItem, productsById: Map<string, MedusaProduct>) {
  const availability = getCheckoutItemAvailability(item, productsById);
  if (!availability.canPurchase) return false;

  const product = getCheckoutItemProduct(item, productsById);
  const variant = product?.variants?.find((candidate) => candidate.id === item.variant_id);
  if (variant?.manage_inventory !== true || variant.allow_backorder === true) return true;

  return item.quantity <= availability.inventoryQuantity;
}

function hasConfirmedPayment(sessions?: PaymentSession[], sessionId?: string | null) {
  return (
    sessions?.some(
      (session) =>
        session.provider_id === "pp_family_bank_family_bank" &&
        (!sessionId || session.id === sessionId) &&
        PAID_PAYMENT_STATUSES.has(session.status),
    ) ?? false
  );
}

function ShippingStep({
  options,
  isLoading,
  selectedShipping,
  isPending,
  cartSubtotal,
  onSelect,
  onBack,
}: {
  options: MedusaShippingOption[];
  isLoading: boolean;
  selectedShipping: string | null;
  isPending: boolean;
  cartSubtotal: number;
  onSelect: (optionId: string) => void;
  onBack: () => void;
}) {
  const qualifiesForFree = qualifiesForFreeShipping(cartSubtotal);

  const sortedOptions = useMemo(() => {
    const order = ["Free Shipping", "Standard Shipping", "Express Shipping"];
    return [...options].sort((a, b) => {
      const ai = order.indexOf(a.name);
      const bi = order.indexOf(b.name);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [options]);

  return (
    <div className="border-border bg-card space-y-4 rounded-xl border p-4 sm:p-6">
      <h2 className="text-foreground text-lg font-semibold">Shipping Method</h2>

      {qualifiesForFree && (
        <div className="border-success/25 bg-accent-green-light text-success-ink flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium">
          <Check className="h-4 w-4" />
          Your order qualifies for free shipping!
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <div className="bg-border/40 h-16 animate-pulse rounded-xl" />
          <div className="bg-border/40 h-16 animate-pulse rounded-xl" />
          <div className="bg-border/40 h-16 animate-pulse rounded-xl" />
        </div>
      ) : sortedOptions.length === 0 ? (
        <p className="text-muted text-sm">
          No shipping methods available. Please go back and verify your address.
        </p>
      ) : (
        <div className="space-y-2">
          {sortedOptions.map((option) => {
            const isFreeOption = option.name === "Free Shipping";
            const disabled = isPending || (isFreeOption && !qualifiesForFree);
            const meta = SHIPPING_META[option.name] ?? { icon: Truck, delivery: "" };
            const Icon = meta.icon;

            return (
              <button
                key={option.id}
                onClick={() => onSelect(option.id)}
                disabled={disabled}
                className={`focus-visible:ring-secondary flex min-h-11 w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                  disabled && !isPending
                    ? "border-border bg-background cursor-not-allowed opacity-50"
                    : selectedShipping === option.id
                      ? "border-secondary bg-secondary-light"
                      : "border-border hover:border-foreground/30"
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="text-secondary h-5 w-5" />
                  <div>
                    <p className="text-foreground font-medium">{option.name}</p>
                    <p className="text-muted text-sm">
                      {meta.delivery}
                      {isFreeOption && !qualifiesForFree && (
                        <span className="text-danger ml-1">
                          (orders over {freeShippingThresholdLabel()})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-primary font-semibold">
                  {option.amount === 0 ? "Free" : formatPrice(option.amount)}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <button onClick={onBack} className={BACK_LINK_CLASS}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Address
      </button>
    </div>
  );
}

export default function CheckoutPage() {
  const queryClient = useQueryClient();
  const checkoutIdentity = useCheckoutCartIdentity();
  const recovery = useCheckoutRecovery();
  const [step, setStep] = useState<Step>("address");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderRecovery, setOrderRecovery] = useState(false);
  const completionAttempted = useRef(false);
  const activePaymentSessionId = useRef<string | null>(null);
  const [paymentPending, setPaymentPending] = useState(false);
  const [placedOrderRef, setPlacedOrderRef] = useState<string | null>(null);
  const [paymentOutcome, setPaymentOutcome] = useState<PaymentOutcome | null>(null);
  const [paymentPendingSince, setPaymentPendingSince] = useState<number | null>(null);
  const [pendingNowTick, setPendingNowTick] = useState<number>(0);
  const handledOutcomeSessionId = useRef<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mpesa_express");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    address_1: "",
    city: "",
    province: "",
    postal_code: "",
    country_code: "ke",
    phone: "+254",
  });

  const cartQuery = useQuery({
    queryKey: ["checkout-cart", checkoutIdentity],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: getCheckoutCart,
    refetchInterval: paymentPending ? 3_000 : false,
  });
  const cart = cartQuery.data;
  const amounts = getCartDisplayAmounts(cart);
  const currencyCode = "kes";
  const shippingKnown = (cart?.shipping_methods?.length ?? 0) > 0;
  const checkoutProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          (cart?.items ?? []).map((item) => item.product_id).filter((id): id is string => !!id),
        ),
      ),
    [cart?.items],
  );
  const checkoutProductsQuery = useQuery({
    queryKey: ["checkout-products", checkoutProductIds],
    queryFn: () => getProductsByIds(checkoutProductIds),
    enabled: checkoutProductIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const checkoutProductsById = useMemo(
    () => new Map((checkoutProductsQuery.data ?? []).map((product) => [product.id, product])),
    [checkoutProductsQuery.data],
  );
  const hasUnavailableItems =
    checkoutProductsQuery.isSuccess &&
    (cart?.items ?? []).some((item) => !canFulfillCheckoutItem(item, checkoutProductsById));
  const cataloguePending =
    checkoutProductIds.length > 0 &&
    (checkoutProductsQuery.isPending || checkoutProductsQuery.isFetching);
  const catalogueError = checkoutProductsQuery.isError;
  const checkoutBlocked = cataloguePending || catalogueError || hasUnavailableItems;

  const customerQuery = useQuery({
    queryKey: ["customer"],
    queryFn: getCustomer,
    staleTime: 5 * 60 * 1000,
  });

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: getCustomerAddresses,
    enabled: !!customerQuery.data,
  });

  const savedAddresses = useMemo(() => addressesQuery.data ?? [], [addressesQuery.data]);
  const selectedSavedAddress =
    savedAddresses.find((address) => address.id === selectedSavedAddressId) ?? savedAddresses[0];
  const isUsingSavedAddress =
    !!customerQuery.data && savedAddresses.length > 0 && !useManualAddress;

  /* eslint-disable react-hooks/set-state-in-effect -- pre-fill form from customer & auto-select saved address */
  // Payment discovery must run on later status responses too, independently of
  // the one-time address restore. Keep the same session's elapsed clock intact.
  useEffect(() => {
    if (!cart || orderPlaced || orderRecovery || completionAttempted.current) return;
    rememberCheckoutCart(cart);
    const existingPayment = cart.payment_collection?.payment_sessions?.find(
      (session) =>
        matchesCheckoutRecovery(session) &&
        ["pending", "authorized", "captured"].includes(session.status),
    );
    if (!existingPayment || activePaymentSessionId.current === existingPayment.id) return;
    activePaymentSessionId.current = existingPayment.id;
    const startedAt = Date.now();
    setPaymentPending(true);
    setPaymentPendingSince(startedAt);
    setPendingNowTick(startedAt);
  }, [cart, orderPlaced, orderRecovery]);

  const restoredCartId = useRef<string | null>(null);
  useEffect(() => {
    if (!cart || restoredCartId.current === cart.id) return;
    restoredCartId.current = cart.id;
    const address = cart.shipping_address;
    if (!address) return;
    setForm((current) => ({
      ...current,
      email: current.email || cart.email || "",
      ...Object.fromEntries(
        Object.entries(toCheckoutAddress(address)).map(([key, value]) => [
          key,
          current[key as keyof typeof current] && current[key as keyof typeof current] !== "+254"
            ? current[key as keyof typeof current]
            : value,
        ]),
      ),
    }));
    setSelectedShipping(cart.shipping_methods?.[0]?.shipping_option_id ?? null);
    if (
      address.first_name &&
      address.last_name &&
      address.address_1 &&
      address.phone &&
      address.city
    ) {
      // Reconfirm delivery before payment when returning to a saved draft.
      setStep("shipping");
    }
  }, [cart]);

  useEffect(() => {
    const customer = customerQuery.data;
    if (!customer) return;
    setForm((current) => ({
      ...current,
      email: current.email || customer.email,
      first_name: current.first_name || customer.first_name || "",
      last_name: current.last_name || customer.last_name || "",
      phone:
        current.phone && current.phone !== "+254" ? current.phone : customer.phone || current.phone,
    }));
  }, [customerQuery.data]);

  useEffect(() => {
    if (!savedAddresses.length || selectedSavedAddressId) return;
    const draft = cart?.shipping_address;
    const matching =
      draft &&
      savedAddresses.find((address) =>
        Object.entries(toCheckoutAddress(draft)).every(
          ([key, value]) =>
            toCheckoutAddress(address)[key as keyof ReturnType<typeof toCheckoutAddress>] === value,
        ),
      );
    setSelectedSavedAddressId((matching || savedAddresses[0]).id ?? null);
    if (draft && !matching) setUseManualAddress(true);
  }, [savedAddresses, selectedSavedAddressId, cart?.shipping_address]);

  // Pre-fill the M-Pesa phone from the cart's shipping address phone
  useEffect(() => {
    if (mpesaPhone) return;
    const phone = cart?.shipping_address?.phone || form.phone;
    if (phone && phone !== "+254") setMpesaPhone(phone);
  }, [cart?.shipping_address?.phone, form.phone, mpesaPhone]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const shippingQuery = useQuery({
    queryKey: ["shipping-options", cart?.id, cart?.shipping_address],
    queryFn: getShippingOptions,
    enabled: step === "shipping" || step === "payment" || step === "review",
  });

  const addressMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      if (cart?.region?.currency_code !== "kes") {
        const regionsRes = await getRegions();
        const kenRegion = regionsRes.regions.find((r) => r.countries.some((c) => c.iso_2 === "ke"));
        if (kenRegion) {
          await updateCart({ region_id: kenRegion.id });
        }
      }

      const address =
        isUsingSavedAddress && selectedSavedAddress
          ? toCheckoutAddress(selectedSavedAddress)
          : toCheckoutAddress(form);
      const email = customerQuery.data?.email ?? form.email.trim();

      return updateCart({
        ...(email ? { email } : {}),
        shipping_address: address,
        billing_address: address,
      });
    },
    onSuccess: async ({ cart: updatedCart }) => {
      queryClient.setQueryData(["cart"], updatedCart);
      queryClient.invalidateQueries({
        predicate: (query) => ["cart", "checkout-cart"].includes(String(query.queryKey[0])),
      });
      await queryClient.invalidateQueries({ queryKey: ["shipping-options"] });
      setSelectedShipping(null);

      const qualifies = qualifiesForFreeShipping(getCartItemsSubtotal(updatedCart));
      if (qualifies) {
        try {
          const res = await getShippingOptions();
          const freeOption = res.shipping_options.find(
            (o: MedusaShippingOption) => o.name === "Free Shipping",
          );
          if (freeOption) {
            setSelectedShipping(freeOption.id);
            shippingMutation.mutate(freeOption.id);
            return;
          }
        } catch {
          // fall through to manual shipping selection
        }
      }
      setStep("shipping");
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to save address. Check your details and try again.");
    },
  });

  const shippingMutation = useMutation({
    mutationFn: (optionId: string) => addShippingMethod(optionId),
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({
        predicate: (query) => ["cart", "checkout-cart"].includes(String(query.queryKey[0])),
      });
      setStep("payment");
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to set shipping method.");
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (paymentMethod === "mpesa_paybill" && !PAYBILL_AVAILABLE)
        throw new Error("Paybill is unavailable. Please choose M-Pesa Express.");
      // Persist the customer's chosen payment method on the cart so the
      // backend / ops team can route the order to the right reconciliation
      // flow (STK callback vs manual Paybill verification).
      const metadata: Record<string, unknown> = {
        ...(cart?.metadata ?? {}),
        payment_method: paymentMethod,
      };
      if (paymentMethod === "mpesa_express") {
        metadata.mpesa_phone = mpesaPhone;
      }
      return updateCart({ metadata });
    },
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({
        predicate: (query) => ["cart", "checkout-cart"].includes(String(query.queryKey[0])),
      });
      setStep("review");
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to initialize payment.");
    },
  });

  // Enter success only after completion returned a real order.
  const applyOrderPlaced = useCallback(
    (data: { order?: unknown }) => {
      setOrderRecovery(false);
      setPaymentPending(false);
      setPaymentPendingSince(null);
      queryClient.invalidateQueries({
        predicate: (query) => ["cart", "checkout-cart"].includes(String(query.queryKey[0])),
      });
      const order = data.order as
        | {
            display_id?: number;
            id?: string;
            created_at?: string;
            metadata?: Record<string, unknown> | null;
          }
        | undefined;
      if (order?.display_id) {
        const stored = order.metadata?.order_ref as string | undefined;
        setPlacedOrderRef(formatOrderRef(order.display_id, order.created_at, order.id, stored));
      }
      setOrderPlaced(true);
    },
    [queryClient],
  );

  const finalizeOrderMutation = useMutation({
    mutationFn: async () => {
      completionAttempted.current = true;
      setPaymentPending(false);
      const result = await completeCart();
      const order = result.order as { id?: unknown } | undefined;
      if (result.type !== "order" || typeof order?.id !== "string" || !order.id.trim()) {
        throw new Error(
          result.error?.message || "Payment received. Your order is still processing.",
        );
      }
      return result;
    },
    onSuccess: applyOrderPlaced,
    onError: (err: Error) => {
      setOrderRecovery(true);
      setErrorMessage(err.message || "Your order is still processing. Check its status again.");
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (): Promise<CheckoutPaymentResult> => {
      if (paymentMethod !== "mpesa_express") {
        throw new Error("Paybill checkout is not available. Please use M-Pesa Express.");
      }
      // Revisit an existing prompt without sending another charge request.
      const current = cart?.payment_collection?.payment_sessions?.find(
        (session) => session.id === activePaymentSessionId.current,
      );
      if (current && hasConfirmedPayment([current])) return { type: "payment_captured" };
      if (activePaymentSessionId.current && (!current || current.status === "pending")) {
        return { type: "payment_pending" };
      }
      const payment = await initializePaymentSession({
        providerId: "pp_family_bank_family_bank",
        data: { mpesa_phone: mpesaPhone },
      });
      const session = payment.payment_collection.payment_sessions?.find((candidate) =>
        matchesCheckoutRecovery(candidate),
      );
      activePaymentSessionId.current = session?.id ?? null;
      if (!hasConfirmedPayment(session ? [session] : [])) {
        return { type: "payment_pending" };
      }

      return { type: "payment_captured" };
    },
    onSuccess: (data) => {
      if (data.type === "payment_pending") {
        const startedAt = Date.now();
        setPaymentPending(true);
        setPaymentPendingSince(startedAt);
        setPendingNowTick(startedAt);
        setErrorMessage(null);
        queryClient.invalidateQueries({
          predicate: (query) => ["cart", "checkout-cart"].includes(String(query.queryKey[0])),
        });
        return;
      }

      completionAttempted.current = true;
      finalizeOrderMutation.mutate();
    },
    onError: (err: Error) => {
      setPaymentPending(false);
      setPaymentPendingSince(null);
      setPaymentOutcome(null);
      setErrorMessage(err.message || "Failed to place order.");
    },
  });

  useEffect(() => {
    if (
      (!paymentPending && !cart?.completed_at) ||
      orderPlaced ||
      completionAttempted.current ||
      !hasConfirmedPayment(
        cart?.payment_collection?.payment_sessions?.filter((session) =>
          matchesCheckoutRecovery(session),
        ),
        activePaymentSessionId.current,
      )
    )
      return;
    completionAttempted.current = true;
    finalizeOrderMutation.mutate();
  }, [cart, finalizeOrderMutation, orderPlaced, paymentPending]);

  // Surface terminal outcomes persisted by the Family Bank callback.
  /* eslint-disable react-hooks/set-state-in-effect -- react to the provider outcome on the polled cart */
  useEffect(() => {
    if (!paymentPending) return;
    const session = cart?.payment_collection?.payment_sessions?.find(
      (candidate) =>
        matchesCheckoutRecovery(candidate) &&
        (!activePaymentSessionId.current || candidate.id === activePaymentSessionId.current),
    );
    if (!session || handledOutcomeSessionId.current === session.id) return;
    const providerStatus =
      session.data?.status ?? (session.status === "error" ? "failed" : session.status);
    if (providerStatus === "canceled" || providerStatus === "failed") {
      handledOutcomeSessionId.current = session.id;
      setPaymentOutcome({
        kind: providerStatus,
        resultDesc: session.data?.resultDesc ?? undefined,
      });
      setPaymentPending(false);
      setPaymentPendingSince(null);
    }
  }, [cart?.payment_collection?.payment_sessions, paymentPending]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 1s re-render tick so the elapsed counter and slow/timeout thresholds advance.
  useEffect(() => {
    if (!paymentPending) return;
    const tick = setInterval(() => setPendingNowTick(Date.now()), 1_000);
    return () => clearInterval(tick);
  }, [paymentPending]);

  // Re-fire the STK Push after a cancel/failure/timeout (mints a fresh session).
  const retryMpesaPrompt = () => {
    handledOutcomeSessionId.current = null;
    activePaymentSessionId.current = null;
    completionAttempted.current = false;
    setPaymentOutcome(null);
    setErrorMessage(null);
    completeMutation.mutate();
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const address = toCheckoutAddress(
      isUsingSavedAddress && selectedSavedAddress ? selectedSavedAddress : form,
    );
    if (!address.city.trim()) {
      setErrorMessage(
        isUsingSavedAddress
          ? "Complete your saved address with a city or town before continuing."
          : "Enter your city or town so we can find delivery options.",
      );
      return;
    }
    if (checkoutBlocked) {
      setErrorMessage("Update your cart before checkout. Some items are out of stock.");
      return;
    }
    addressMutation.mutate();
  };

  const steps: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: "address", label: "Address", icon: MapPin },
    { id: "shipping", label: "Shipping", icon: Truck },
    { id: "payment", label: "Payment", icon: CreditCard },
    { id: "review", label: "Review", icon: Package },
  ];
  const currentIdx = steps.findIndex((s) => s.id === step);

  const pendingElapsedSeconds = paymentPendingSince
    ? Math.max(0, Math.floor((pendingNowTick - paymentPendingSince) / 1000))
    : 0;
  const stkIsSlow = pendingElapsedSeconds >= STK_SLOW_THRESHOLD_SECS;
  const stkTimedOut = pendingElapsedSeconds >= STK_TIMEOUT_THRESHOLD_SECS;

  const recoverySessionMissing =
    recovery?.state === "unresolved" &&
    !completeMutation.isPending &&
    !orderPlaced &&
    (cartQuery.isSuccess || cartQuery.isError) &&
    (cartQuery.isError ||
      !cart ||
      !cart.payment_collection?.payment_sessions?.some((session) =>
        matchesCheckoutRecovery(session, recovery),
      ));
  if (recoverySessionMissing) {
    return (
      <section className="mx-auto max-w-xl space-y-5 px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Payment needs confirmation</h1>
        <p>
          Your earlier payment could still be payable. Cart, delivery and payer details are locked.
          Check its status or contact support before making another payment.
        </p>
        {errorMessage && <p role="alert">{errorMessage}</p>}
        <button
          className="border-border min-h-11 rounded-full border px-6 py-3"
          disabled={cartQuery.isFetching}
          onClick={() => cartQuery.refetch()}
        >
          Check Payment Status
        </button>
        <Link href="/contact" className={BACK_LINK_CLASS}>
          Contact support
        </Link>
      </section>
    );
  }

  if (orderRecovery) {
    return (
      <section className="mx-auto max-w-xl space-y-5 px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Confirming your order</h1>
        <p role="alert">{errorMessage}</p>
        <p>
          Your payment request is saved. Check the order status before starting another payment.
        </p>
        <button
          className="bg-primary min-h-11 rounded-full px-6 py-3 text-white"
          disabled={finalizeOrderMutation.isPending}
          onClick={() => finalizeOrderMutation.mutate()}
        >
          {finalizeOrderMutation.isPending ? "Checking..." : "Check order status"}
        </button>
      </section>
    );
  }

  if (paymentOutcome) {
    const isCanceled = paymentOutcome.kind === "canceled";
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="border-border bg-card flex flex-col items-center gap-5 rounded-xl border p-10 text-center">
          <div className="bg-danger/10 flex h-20 w-20 items-center justify-center rounded-full">
            <X className="text-danger h-9 w-9" />
          </div>
          <h1 className="text-foreground text-2xl font-bold">
            {isCanceled ? "Payment was canceled" : "Payment failed"}
          </h1>
          <p className="text-muted max-w-md text-sm leading-relaxed">
            {isCanceled
              ? "The M-Pesa prompt was canceled on your phone. You can try again or edit the number."
              : (paymentOutcome.resultDesc ??
                "M-Pesa could not complete the payment. You can try again with the same number.")}
          </p>
          <p className="text-muted text-sm">
            Phone: <span className="text-foreground font-medium">{mpesaPhone}</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={retryMpesaPrompt}
              disabled={completeMutation.isPending}
              className="bg-primary hover:bg-primary-hover focus-visible:ring-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-md transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                setPaymentOutcome(null);
                setStep("payment");
              }}
              className="border-border text-foreground hover:border-border hover:bg-foreground/[0.04] focus-visible:ring-border inline-flex min-h-11 items-center justify-center rounded-full border bg-white px-6 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {isCanceled ? "Edit Phone Number" : "Edit Payment Details"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentPending || (completeMutation.isPending && recovery?.state === "unresolved")) {
    const pendingTitle = stkTimedOut
      ? "STK Push timed out"
      : stkIsSlow
        ? "Taking longer than expected"
        : "Payment Request Sent";
    const pendingLead = stkTimedOut
      ? "We didn't get a confirmation from M-Pesa within a reasonable time."
      : stkIsSlow
        ? "Check your phone for the M-Pesa prompt — it may have been dismissed, or the network is slow."
        : "Check your phone for the M-Pesa prompt";
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="border-border bg-card flex flex-col items-center gap-5 rounded-xl border p-10 text-center">
          <div className="bg-secondary-light flex h-20 w-20 items-center justify-center rounded-full">
            <Smartphone className="text-secondary h-9 w-9" />
          </div>
          <span className="bg-accent-yellow-light text-accent-yellow-ink rounded-full px-3 py-1 text-xs font-semibold">
            Pending payment · {pendingElapsedSeconds}s
          </span>
          <h1 className="text-foreground text-2xl font-bold">{pendingTitle}</h1>
          <div className="max-w-md space-y-2">
            <p className="text-foreground text-sm font-medium">{pendingLead}</p>
            <p className="text-muted text-sm leading-relaxed">
              Enter your M-Pesa PIN on{" "}
              <span className="text-foreground font-medium">{mpesaPhone}</span>. We&apos;ll create
              your order after M-Pesa confirms the payment.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => cartQuery.refetch()}
              disabled={cartQuery.isFetching}
              className="border-border min-h-11 rounded-full border px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {cartQuery.isFetching ? "Checking..." : "Check Payment Status"}
            </button>
          </div>
          <p className="text-muted text-sm">
            Cart, delivery and payer details are locked until this payment is resolved.
          </p>
          <Link href="/contact" className={BACK_LINK_CLASS}>
            Contact support
          </Link>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="border-border bg-card flex flex-col items-center gap-5 rounded-xl border p-10 text-center">
          <div className="bg-accent-green-light flex h-20 w-20 items-center justify-center rounded-full">
            <Check className="text-success h-9 w-9" />
          </div>
          <h1 className="text-foreground text-2xl font-bold">Order Placed!</h1>
          {placedOrderRef && (
            <p className="text-foreground text-sm font-medium">Order {placedOrderRef}</p>
          )}
          <div className="max-w-md space-y-2">
            <p className="text-foreground text-sm font-medium">Payment confirmed</p>
            <p className="text-muted text-sm leading-relaxed">
              Your M-Pesa payment was confirmed and your order is ready for processing.
            </p>
          </div>
          <p className="text-muted max-w-md text-sm leading-relaxed">
            Thank you for shopping at {MPESA_BUSINESS_NAME}! You&apos;ll receive a confirmation
            email shortly.
          </p>
          <Link
            href="/products"
            className="bg-primary hover:bg-primary-hover inline-flex min-h-11 items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-md transition"
          >
            <Shirt className="h-4 w-4" /> Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-border bg-card flex flex-col items-center gap-5 rounded-xl border p-10 text-center">
          <div className="bg-primary-light flex h-20 w-20 items-center justify-center rounded-full">
            <EnamelUtilityIcon name="cart" size={48} />
          </div>
          <div>
            <h1 className="text-foreground text-2xl font-bold">No items to checkout</h1>
            <p className="text-muted mt-1 text-sm">Add some products to your cart first.</p>
          </div>
          <Link
            href="/products"
            className="bg-primary hover:bg-primary-hover focus-visible:ring-primary inline-flex min-h-11 items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Shirt className="h-4 w-4" /> Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const inputClass =
    "min-h-11 w-full rounded-lg border border-muted-light bg-background px-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary aria-invalid:border-danger";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/cart"
          aria-label="Back to cart"
          className="text-muted hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-foreground -ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-foreground text-2xl font-bold">Checkout</h1>
      </div>

      {/* Mobile: compact horizontal stepper */}
      <div className="mb-6 flex items-center gap-0 lg:hidden">
        {steps.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center">
            <div className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm transition ${
                  i < currentIdx
                    ? "border-success bg-success text-white"
                    : i === currentIdx
                      ? "border-secondary bg-secondary text-white"
                      : "border-border text-muted bg-white"
                }`}
              >
                {i < currentIdx ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <s.icon className="h-3.5 w-3.5" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${i <= currentIdx ? "text-foreground" : "text-muted"}`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mt-[-0.75rem] h-0.5 w-full ${i < currentIdx ? "bg-success" : "bg-border"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div
          id="checkout-error"
          role="alert"
          className="border-danger/30 bg-danger/5 text-danger mb-6 rounded-xl border px-4 py-3 text-sm"
        >
          {errorMessage}
        </div>
      )}

      {catalogueError && (
        <div
          role="alert"
          className="border-danger/20 bg-danger/5 text-danger mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium"
        >
          <span>We couldn’t check item availability. Please try again.</span>
          <button
            type="button"
            onClick={() => checkoutProductsQuery.refetch()}
            className="focus-visible:ring-danger min-h-11 rounded-full border border-current px-3 py-1.5 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Try again
          </button>
        </div>
      )}

      {hasUnavailableItems && (
        <div className="border-danger/20 bg-danger/5 text-danger mb-6 rounded-xl border px-4 py-3 text-sm font-medium">
          Some items in your cart are no longer available in the requested quantity. Return to your
          cart to adjust them before checking out.
        </div>
      )}

      <div className="flex gap-8">
        {/* Desktop: vertical stepper sidebar */}
        <div className="hidden w-48 shrink-0 lg:block">
          <div className="sticky top-24">
            <div className="flex flex-col">
              {steps.map((s, i) => (
                <div key={s.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                        i < currentIdx
                          ? "border-success bg-success text-white"
                          : i === currentIdx
                            ? "border-secondary bg-secondary text-white"
                            : "border-border text-muted bg-white"
                      }`}
                    >
                      {i < currentIdx ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <s.icon className="h-4 w-4" />
                      )}
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className={`h-10 w-0.5 ${i < currentIdx ? "bg-success" : "bg-border"}`}
                      />
                    )}
                  </div>
                  <div className="pt-2">
                    <p
                      className={`text-sm font-semibold ${i <= currentIdx ? "text-foreground" : "text-muted"}`}
                    >
                      {s.label}
                    </p>
                    {i === currentIdx && <p className="text-secondary text-sm">Current step</p>}
                    {i < currentIdx && <p className="text-success-ink text-sm">Completed</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content: form + order summary */}
        <div className="min-w-0 flex-1">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              {/* Step: Address */}
              {step === "address" && (
                <form
                  onSubmit={handleAddressSubmit}
                  aria-describedby={errorMessage ? "checkout-error" : undefined}
                  onInvalid={(event) => {
                    const input = event.target;
                    if (!(input instanceof HTMLInputElement)) return;
                    setFieldErrors((current) => ({
                      ...current,
                      [input.id]: input.validationMessage,
                    }));
                  }}
                  onChange={(event) => {
                    const input = event.target;
                    if (!(input instanceof HTMLInputElement)) return;
                    setFieldErrors((current) => ({ ...current, [input.id]: "" }));
                  }}
                  className="border-border bg-card space-y-5 rounded-xl border p-4 sm:p-6"
                >
                  <h2 className="text-foreground text-lg font-semibold">Shipping Address</h2>
                  {customerQuery.data && (
                    <div className="border-secondary/15 bg-secondary-light/40 rounded-xl border p-4">
                      <p className="text-foreground text-sm font-medium">
                        Checking out as {customerQuery.data.email}
                      </p>
                      <p className="text-muted mt-1 text-sm">
                        You can use a saved address or enter a different delivery address.
                      </p>
                    </div>
                  )}

                  {isUsingSavedAddress && selectedSavedAddress && (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <p className="text-foreground text-sm font-medium">Saved addresses</p>
                        {savedAddresses.map((address) => {
                          const isSelected = address.id === selectedSavedAddress.id;
                          return (
                            <button
                              key={address.id}
                              type="button"
                              onClick={() => setSelectedSavedAddressId(address.id ?? null)}
                              className={`focus-visible:ring-secondary min-h-11 w-full rounded-xl border p-4 text-left transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                                isSelected
                                  ? "border-secondary bg-secondary-light/40"
                                  : "border-border hover:border-border bg-white"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-foreground font-medium">
                                    {address.first_name} {address.last_name}
                                  </p>
                                  <p className="text-muted text-sm">{address.address_1}</p>
                                  <p className="text-muted text-sm">
                                    {address.city}
                                    {address.province ? `, ${address.province}` : ""}{" "}
                                    {address.postal_code}
                                  </p>
                                  {address.phone && (
                                    <p className="text-muted mt-1 text-sm">{address.phone}</p>
                                  )}
                                </div>
                                {isSelected && (
                                  <span className="bg-foreground rounded-full px-2.5 py-1 text-xs font-semibold text-white">
                                    Selected
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {!selectedSavedAddress.city?.trim() && (
                        <button
                          type="button"
                          className="text-primary min-h-11 text-sm font-semibold underline underline-offset-4"
                          onClick={() => {
                            setForm((current) => ({
                              ...current,
                              ...toCheckoutAddress(selectedSavedAddress),
                            }));
                            setUseManualAddress(true);
                          }}
                        >
                          Complete selected address
                        </button>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={addressMutation.isPending || checkoutBlocked}
                          className="bg-primary hover:bg-primary-hover focus-visible:ring-primary min-h-11 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                        >
                          {addressMutation.isPending
                            ? "Saving..."
                            : "Continue with Selected Address"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseManualAddress(true)}
                          className="border-border text-foreground hover:border-border hover:bg-foreground/[0.04] focus-visible:ring-border min-h-11 rounded-full border bg-white px-6 py-2.5 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        >
                          Use Different Address
                        </button>
                      </div>
                    </div>
                  )}

                  {(!isUsingSavedAddress || !selectedSavedAddress) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="checkout-first-name"
                          className="text-muted mb-1.5 block text-sm font-medium"
                        >
                          First Name <span className="text-danger">*</span>
                        </label>
                        <input
                          id="checkout-first-name"
                          name="first_name"
                          autoComplete="given-name"
                          aria-invalid={!!fieldErrors["checkout-first-name"] || undefined}
                          aria-describedby={
                            fieldErrors["checkout-first-name"]
                              ? "checkout-first-name-error"
                              : undefined
                          }
                          required
                          value={form.first_name}
                          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                          className={inputClass}
                        />
                        {fieldErrors["checkout-first-name"] && (
                          <p id="checkout-first-name-error" className="text-danger mt-1 text-sm">
                            {fieldErrors["checkout-first-name"]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="checkout-last-name"
                          className="text-muted mb-1.5 block text-sm font-medium"
                        >
                          Last Name <span className="text-danger">*</span>
                        </label>
                        <input
                          id="checkout-last-name"
                          name="last_name"
                          autoComplete="family-name"
                          aria-invalid={!!fieldErrors["checkout-last-name"] || undefined}
                          aria-describedby={
                            fieldErrors["checkout-last-name"]
                              ? "checkout-last-name-error"
                              : undefined
                          }
                          required
                          value={form.last_name}
                          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                          className={inputClass}
                        />
                        {fieldErrors["checkout-last-name"] && (
                          <p id="checkout-last-name-error" className="text-danger mt-1 text-sm">
                            {fieldErrors["checkout-last-name"]}
                          </p>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="checkout-email"
                          className="text-muted mb-1.5 block text-sm font-medium"
                        >
                          Email <span className="text-muted/70 font-normal">(optional)</span>
                        </label>
                        <input
                          id="checkout-email"
                          name="email"
                          autoComplete="email"
                          type="email"
                          readOnly={!!customerQuery.data}
                          value={customerQuery.data?.email ?? form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          aria-invalid={!!fieldErrors["checkout-email"] || undefined}
                          aria-describedby={
                            fieldErrors["checkout-email"] ? "checkout-email-error" : undefined
                          }
                          className={inputClass}
                        />
                        {fieldErrors["checkout-email"] && (
                          <p id="checkout-email-error" className="text-danger mt-1 text-sm">
                            {fieldErrors["checkout-email"]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="checkout-phone"
                          className="text-muted mb-1.5 block text-sm font-medium"
                        >
                          Phone <span className="text-danger">*</span>
                        </label>
                        <input
                          id="checkout-phone"
                          name="phone"
                          autoComplete="tel"
                          type="tel"
                          required
                          placeholder="+254 7XX XXX XXX"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          aria-invalid={!!fieldErrors["checkout-phone"] || undefined}
                          aria-describedby={
                            fieldErrors["checkout-phone"] ? "checkout-phone-error" : undefined
                          }
                          className={inputClass}
                        />
                        {fieldErrors["checkout-phone"] && (
                          <p id="checkout-phone-error" className="text-danger mt-1 text-sm">
                            {fieldErrors["checkout-phone"]}
                          </p>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="checkout-street-address"
                          className="text-muted mb-1.5 block text-sm font-medium"
                        >
                          Street Address <span className="text-danger">*</span>
                        </label>
                        <input
                          id="checkout-street-address"
                          name="address_1"
                          autoComplete="street-address"
                          required
                          value={form.address_1}
                          onChange={(e) => setForm({ ...form, address_1: e.target.value })}
                          aria-invalid={!!fieldErrors["checkout-street-address"] || undefined}
                          aria-describedby={
                            fieldErrors["checkout-street-address"]
                              ? "checkout-street-address-error"
                              : undefined
                          }
                          className={inputClass}
                        />
                        {fieldErrors["checkout-street-address"] && (
                          <p
                            id="checkout-street-address-error"
                            className="text-danger mt-1 text-sm"
                          >
                            {fieldErrors["checkout-street-address"]}
                          </p>
                        )}
                      </div>
                      {(
                        [
                          ["city", "City or town", "address-level2", true],
                          ["postal_code", "Postal code (optional)", "postal-code", false],
                        ] as const
                      ).map(([field, label, autocomplete, required]) => (
                        <div key={field}>
                          <label
                            htmlFor={`checkout-${field}`}
                            className="text-foreground mb-2 block text-sm font-medium"
                          >
                            {label}
                            {required && " *"}
                          </label>
                          <input
                            id={`checkout-${field}`}
                            autoComplete={autocomplete}
                            required={required}
                            value={form[field]}
                            onChange={(e) =>
                              setForm((current) => ({
                                ...current,
                                [field]: e.target.value,
                                // A changed city must not retain the previous destination's county.
                                ...(field === "city" && current.city !== e.target.value
                                  ? { province: "" }
                                  : {}),
                              }))
                            }
                            aria-invalid={!!fieldErrors[`checkout-${field}`] || undefined}
                            aria-describedby={
                              fieldErrors[`checkout-${field}`]
                                ? `checkout-${field}-error`
                                : undefined
                            }
                            className={inputClass}
                          />
                          {fieldErrors[`checkout-${field}`] && (
                            <p id={`checkout-${field}-error`} className="text-danger mt-1 text-sm">
                              {fieldErrors[`checkout-${field}`]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {(!isUsingSavedAddress || !selectedSavedAddress) && (
                    <button
                      type="submit"
                      disabled={addressMutation.isPending || checkoutBlocked}
                      className="bg-primary hover:bg-primary-hover focus-visible:ring-primary min-h-11 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                    >
                      {addressMutation.isPending ? "Saving..." : "Continue to Shipping"}
                    </button>
                  )}
                  {useManualAddress && savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setUseManualAddress(false)}
                      className="text-muted hover:text-foreground focus-visible:ring-secondary ml-4 min-h-11 rounded-full px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      Use a saved address instead
                    </button>
                  )}
                </form>
              )}

              {/* Step: Shipping */}
              {step === "shipping" && (
                <ShippingStep
                  options={(shippingQuery.data?.shipping_options ?? []).filter(
                    (option) =>
                      !/express|same.day/i.test(option.name) ||
                      cart.shipping_address?.city?.trim().toLowerCase() === "nairobi",
                  )}
                  isLoading={shippingQuery.isLoading}
                  selectedShipping={selectedShipping}
                  isPending={shippingMutation.isPending || checkoutBlocked}
                  cartSubtotal={getCartItemsSubtotal(cart)}
                  onSelect={(optionId) => {
                    if (checkoutBlocked) return;
                    setSelectedShipping(optionId);
                    shippingMutation.mutate(optionId);
                  }}
                  onBack={() => {
                    setStep("address");
                    setErrorMessage(null);
                  }}
                />
              )}

              {/* Step: Payment */}
              {step === "payment" && (
                <div
                  aria-describedby={errorMessage ? "checkout-error" : undefined}
                  className="border-border bg-card space-y-4 rounded-xl border p-4 sm:p-6"
                >
                  <div>
                    <h2 className="text-foreground text-lg font-semibold">Payment Method</h2>
                    <p className="text-muted mt-1 text-sm">
                      Orders are dispatched after payment is confirmed.
                    </p>
                  </div>

                  {/* M-Pesa Express */}
                  <div
                    className={`rounded-xl border p-4 transition ${
                      paymentMethod === "mpesa_express"
                        ? "border-secondary bg-secondary-light/40"
                        : "border-border hover:border-border bg-white"
                    }`}
                  >
                    <label
                      htmlFor="checkout-mpesa-express"
                      className="flex min-h-11 cursor-pointer items-start gap-3"
                    >
                      <input
                        id="checkout-mpesa-express"
                        type="radio"
                        name="payment-method"
                        aria-labelledby="checkout-mpesa-express-label"
                        aria-describedby="checkout-mpesa-express-description"
                        value="mpesa_express"
                        checked={paymentMethod === "mpesa_express"}
                        onChange={() => setPaymentMethod("mpesa_express")}
                        className="accent-foreground focus-visible:outline-secondary mt-1.5 focus-visible:outline-2 focus-visible:outline-offset-2"
                      />
                      <Smartphone className="text-secondary mt-0.5 h-5 w-5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            id="checkout-mpesa-express-label"
                            className="text-foreground font-medium"
                          >
                            M-Pesa Express
                          </p>
                          <span className="bg-accent-green-light text-success rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
                            Recommended
                          </span>
                        </div>
                        <p
                          id="checkout-mpesa-express-description"
                          className="text-muted mt-0.5 text-sm"
                        >
                          Get a payment prompt on your phone &mdash; just enter your M-Pesa PIN.
                        </p>
                      </div>
                    </label>
                    {paymentMethod === "mpesa_express" && (
                      <div className="mt-3 space-y-1.5 sm:ml-8">
                        <label
                          htmlFor="checkout-mpesa-phone"
                          className="text-muted block text-sm font-medium"
                        >
                          M-Pesa Phone Number <span className="text-danger">*</span>
                        </label>
                        <input
                          id="checkout-mpesa-phone"
                          name="mpesa_phone"
                          autoComplete="tel"
                          type="tel"
                          required
                          placeholder="+254 7XX XXX XXX"
                          value={mpesaPhone}
                          onChange={(e) => setMpesaPhone(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    )}
                  </div>

                  {/* Manual Paybill */}
                  <label
                    htmlFor="checkout-mpesa-paybill"
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                      paymentMethod === "mpesa_paybill"
                        ? "border-secondary bg-secondary-light/40"
                        : "border-border hover:border-border bg-white"
                    }`}
                  >
                    <input
                      id="checkout-mpesa-paybill"
                      type="radio"
                      name="payment-method"
                      aria-labelledby="checkout-mpesa-paybill-label"
                      aria-describedby="checkout-mpesa-paybill-description"
                      value="mpesa_paybill"
                      disabled={!PAYBILL_AVAILABLE}
                      checked={paymentMethod === "mpesa_paybill"}
                      onChange={() => setPaymentMethod("mpesa_paybill")}
                      className="accent-foreground focus-visible:outline-secondary mt-1.5 focus-visible:outline-2 focus-visible:outline-offset-2"
                    />
                    <Receipt className="text-secondary mt-0.5 h-5 w-5 shrink-0" />
                    <div className="flex-1">
                      <p id="checkout-mpesa-paybill-label" className="text-foreground font-medium">
                        Pay via M-Pesa Paybill
                      </p>
                      <p
                        id="checkout-mpesa-paybill-description"
                        className="text-muted mt-0.5 text-sm"
                      >
                        {PAYBILL_AVAILABLE
                          ? "Pay manually from your M-Pesa menu using our Paybill number."
                          : "Paybill checkout is not available. Please use M-Pesa Express."}
                      </p>
                      {paymentMethod === "mpesa_paybill" && (
                        <div className="border-border bg-background/80 mt-3 space-y-3 rounded-xl border p-3 text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-muted text-xs">Paybill (Business No.)</p>
                              <p className="text-foreground font-semibold tracking-wide">
                                {MPESA_PAYBILL_NUMBER}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted text-xs">Account No.</p>
                              <p className="text-foreground font-semibold tracking-wide">
                                Your order number
                              </p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-muted text-xs">Amount</p>
                              <p className="text-foreground font-semibold">
                                {formatPrice(cart.total ?? 0, currencyCode)}
                              </p>
                            </div>
                          </div>
                          <ol className="text-muted list-decimal space-y-1 pl-4 text-xs leading-relaxed">
                            <li>Open M-Pesa on your phone</li>
                            <li>Select Lipa na M-Pesa &rarr; Pay Bill</li>
                            <li>
                              Enter Business no.{" "}
                              <span className="text-foreground font-semibold">
                                {MPESA_PAYBILL_NUMBER}
                              </span>
                            </li>
                            <li>Enter your order number as the Account no.</li>
                            <li>Enter your M-Pesa PIN and confirm</li>
                          </ol>
                          <p className="text-muted text-xs">
                            You&apos;ll get your order number on the next screen. We dispatch once{" "}
                            {MPESA_BUSINESS_NAME} confirms your payment.
                          </p>
                        </div>
                      )}
                    </div>
                  </label>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => paymentMutation.mutate()}
                      disabled={
                        paymentMutation.isPending ||
                        checkoutBlocked ||
                        (paymentMethod === "mpesa_paybill" && !PAYBILL_AVAILABLE) ||
                        (paymentMethod === "mpesa_express" && !mpesaPhone.trim())
                      }
                      className="bg-primary hover:bg-primary-hover focus-visible:ring-primary min-h-11 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                    >
                      {paymentMutation.isPending ? "Saving..." : "Continue to Review"}
                    </button>
                    <button
                      onClick={() => {
                        setStep("shipping");
                        setErrorMessage(null);
                      }}
                      className={BACK_LINK_CLASS}
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      Back to Shipping
                    </button>
                  </div>
                </div>
              )}

              {/* Step: Review */}
              {step === "review" && (
                <div className="border-border bg-card space-y-4 rounded-xl border p-4 sm:p-6">
                  <h2 className="text-foreground text-lg font-semibold">Review & Place Order</h2>

                  {/* Address summary */}
                  {cart.shipping_address && (
                    <div className="border-border bg-background/80 rounded-xl border p-4 text-sm">
                      <p className="text-muted mb-1 text-sm font-semibold">Shipping to</p>
                      <p className="text-foreground">
                        {cart.shipping_address.first_name} {cart.shipping_address.last_name}
                      </p>
                      <p className="text-muted">
                        {cart.shipping_address.address_1}, {cart.shipping_address.city}
                      </p>
                      <p className="text-muted">
                        {[cart.shipping_address.province, cart.shipping_address.postal_code]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {cart.shipping_address.phone && (
                        <p className="text-muted">{cart.shipping_address.phone}</p>
                      )}
                    </div>
                  )}

                  {/* Shipping method summary */}
                  {cart.shipping_methods && cart.shipping_methods.length > 0 && (
                    <div className="border-border bg-background/80 rounded-xl border p-4 text-sm">
                      <p className="text-muted mb-1 text-sm font-semibold">Shipping method</p>
                      {cart.shipping_methods.map((m) => (
                        <p key={m.id} className="text-foreground">
                          {m.name} — {formatPrice(m.amount, currencyCode)}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Payment method summary */}
                  <div className="border-border bg-background/80 rounded-xl border p-4 text-sm">
                    <p className="text-muted mb-1 text-sm font-semibold">Payment</p>
                    {paymentMethod === "mpesa_express" ? (
                      <>
                        <p className="text-foreground flex items-center gap-2">
                          <Smartphone className="text-secondary h-4 w-4" />
                          M-Pesa Express to {mpesaPhone || "your phone"}
                        </p>
                        <p className="text-muted mt-1 text-xs">
                          We&apos;ll send an M-Pesa prompt to your phone and create the order after
                          payment is confirmed.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-foreground flex items-center gap-2">
                          <Receipt className="text-secondary h-4 w-4" />
                          M-Pesa Paybill {MPESA_PAYBILL_NUMBER}
                        </p>
                        <p className="text-muted mt-1 text-xs">
                          Pay via Paybill using your order number as the Account no. We dispatch
                          once {MPESA_BUSINESS_NAME} confirms your payment.
                        </p>
                      </>
                    )}
                  </div>

                  <label
                    htmlFor="checkout-terms"
                    className="flex min-h-11 items-start gap-2.5 text-sm"
                  >
                    <input
                      id="checkout-terms"
                      name="terms"
                      type="checkbox"
                      required
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="accent-primary focus-visible:outline-secondary mt-0.5 h-4 w-4 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2"
                    />
                    <span className="text-muted">
                      I agree to Azani&apos;s{" "}
                      <Link
                        href="/policies/terms"
                        target="_blank"
                        className="text-secondary font-medium hover:underline"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/policies/privacy"
                        target="_blank"
                        className="text-secondary font-medium hover:underline"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => completeMutation.mutate()}
                      disabled={
                        completeMutation.isPending ||
                        finalizeOrderMutation.isPending ||
                        checkoutBlocked ||
                        !acceptedTerms
                      }
                      className="bg-primary hover:bg-primary-hover focus-visible:ring-primary inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                    >
                      {completeMutation.isPending || finalizeOrderMutation.isPending
                        ? paymentMethod === "mpesa_express"
                          ? "Sending Prompt..."
                          : "Placing Order..."
                        : paymentMethod === "mpesa_express"
                          ? "Send M-Pesa Prompt"
                          : "Place Order"}
                    </button>
                    <button
                      onClick={() => {
                        setStep("payment");
                        setErrorMessage(null);
                      }}
                      className={BACK_LINK_CLASS}
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      Back to Payment
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary sidebar */}
            <div className="border-border bg-card rounded-xl border p-4 sm:p-6 lg:sticky lg:top-24 lg:self-start">
              <h3 className="text-foreground mb-4 text-base font-semibold">
                Order Summary
                <span className="text-muted ml-1.5 text-sm font-medium">
                  ({cart.items.length} {cart.items.length === 1 ? "item" : "items"})
                </span>
              </h3>

              {/* Cart items */}
              <div className="mb-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                {cart.items.map((item) => {
                  const product = getCheckoutItemProduct(item, checkoutProductsById);
                  const availability = checkoutProductsQuery.isFetched
                    ? getCheckoutItemAvailability(item, checkoutProductsById)
                    : {
                        inStock: true,
                        canPurchase: true,
                        isLowStock: false,
                        isOutOfStock: false,
                        inventoryQuantity: 0,
                        maxQuantity: 10,
                        label: "",
                      };
                  const resolvedImage = resolveOrderItemImage(item, product);
                  const productName = product?.title || item.title;
                  const variant =
                    product?.variants?.find((candidate) => candidate.id === item.variant_id) ??
                    item.variant;
                  const variantDetails = (variant?.options ?? []).flatMap((value) => {
                    const option = product?.options?.find(
                      (candidate) => candidate.id === value.option_id,
                    );
                    if (!option) return [];
                    return [
                      {
                        name: /^colou?r$/i.test(option.title) ? "Colour" : option.title,
                        value: value.value,
                      },
                    ];
                  });
                  const fallbackVariant = variant?.title ?? item.description;

                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="border-border bg-background relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border">
                        {resolvedImage ? (
                          <Image
                            src={resolvedImage}
                            alt={productName}
                            fill
                            sizes="56px"
                            className="object-contain p-1"
                            style={{
                              transform: getProductImageRotation(product)
                                ? "rotate(90deg) scale(.75)"
                                : undefined,
                            }}
                          />
                        ) : (
                          <div className="text-muted flex h-full w-full items-center justify-center">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <p className="text-foreground text-sm font-medium break-words">
                          {productName}
                        </p>
                        {variantDetails.length > 0 ? (
                          <div className="text-muted mt-1 flex flex-wrap gap-x-3 text-sm">
                            {variantDetails.map((detail) => (
                              <span key={detail.name}>
                                {detail.name}: {detail.value}
                              </span>
                            ))}
                          </div>
                        ) : (
                          fallbackVariant &&
                          !["Default variant", "-", "--"].includes(fallbackVariant) && (
                            <p className="text-muted mt-1 text-sm">Variant: {fallbackVariant}</p>
                          )
                        )}
                        <p className="text-muted text-sm">Quantity: {item.quantity}</p>
                        <p
                          className={`mt-1 text-sm font-medium ${
                            availability.isOutOfStock
                              ? "text-danger"
                              : availability.isLowStock
                                ? "text-accent-yellow-ink"
                                : "text-muted"
                          }`}
                        >
                          {availability.isOutOfStock
                            ? "Out of stock"
                            : availability.isLowStock
                              ? availability.label
                              : ""}
                        </p>
                      </div>
                      <div className="text-foreground flex flex-shrink-0 items-center text-sm font-semibold">
                        {formatPrice(
                          item.total || item.subtotal || item.unit_price * item.quantity,
                          currencyCode,
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="border-border space-y-2.5 border-t pt-4 text-sm">
                <div className="text-muted flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-foreground">
                    {formatPrice(amounts.items, currencyCode)}
                  </span>
                </div>
                <div className="text-muted flex justify-between">
                  <span>Shipping</span>
                  <span className="text-foreground">
                    {shippingKnown
                      ? amounts.shipping === 0
                        ? "Free"
                        : formatPrice(amounts.shipping, currencyCode)
                      : "Calculated after your address"}
                  </span>
                </div>
                {amounts.tax > 0 && (
                  <div className="text-muted flex justify-between">
                    <span>Tax</span>
                    <span className="text-foreground">
                      {formatPrice(amounts.tax, currencyCode)}
                    </span>
                  </div>
                )}
                {amounts.discount > 0 && (
                  <div className="text-success-ink flex justify-between">
                    <span>Discount</span>
                    <span className="font-medium">
                      -{formatPrice(amounts.discount, currencyCode)}
                    </span>
                  </div>
                )}
                <div className="border-border border-t pt-3">
                  <div className="text-foreground flex items-baseline justify-between gap-4 text-base font-bold">
                    <span>{shippingKnown ? "Total" : "Total before shipping"}</span>
                    <span className="shrink-0">{formatPrice(cart.total, currencyCode)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
