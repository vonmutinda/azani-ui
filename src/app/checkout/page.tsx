"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Baby,
  Check,
  Clock,
  CreditCard,
  MapPin,
  Package,
  Receipt,
  ShoppingBag,
  Smartphone,
  Truck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  getCart,
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
  resolveOrderItemImage,
} from "@/lib/formatters";
import { clearStoredCartId } from "@/lib/http";
import { MedusaAddress, MedusaProduct, MedusaShippingOption, MedusaLineItem } from "@/types/medusa";

const FREE_SHIPPING_THRESHOLD = 5_000;

// TODO: replace placeholder with Azani's real Lipa na M-Pesa Paybill number
const MPESA_PAYBILL_NUMBER = "123456";
const MPESA_BUSINESS_NAME = "Azani";

type PaymentMethod = "mpesa_express" | "mpesa_paybill";
type Step = "address" | "shipping" | "payment" | "review";
type PaymentSession = { id: string; provider_id: string; status: string };
type CheckoutPaymentResult = { type: "payment_pending" } | { type: "payment_captured" };

const PAID_PAYMENT_STATUSES = new Set(["captured"]);

function toCheckoutAddress(address: Partial<MedusaAddress>) {
  return {
    first_name: address.first_name ?? "",
    last_name: address.last_name ?? "",
    address_1: address.address_1 ?? "",
    city: address.city ?? "Nairobi",
    province: address.province ?? "Nairobi",
    postal_code: address.postal_code ?? "00100",
    country_code: address.country_code ?? "ke",
    phone: address.phone ?? "+254",
  };
}

const SHIPPING_META: Record<string, { icon: React.ElementType; delivery: string; note?: string }> =
  {
    "Free Shipping": { icon: Truck, delivery: "Within 24 hours", note: "Orders over KSh5,000" },
    "Standard Shipping": { icon: Clock, delivery: "Within 24 hours", note: "KSh150" },
    "Express Shipping": { icon: Zap, delivery: "Same-day delivery", note: "KSh500" },
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
  const product = getCheckoutItemProduct(item, productsById);
  const variant =
    product?.variants?.find((candidate) => candidate.id === item.variant_id) ?? item.variant;
  return getVariantAvailability(variant);
}

function hasCapturedPayment(sessions?: PaymentSession[]) {
  return sessions?.some((session) => PAID_PAYMENT_STATUSES.has(session.status)) ?? false;
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
  const qualifiesForFree = cartSubtotal >= FREE_SHIPPING_THRESHOLD;

  const sortedOptions = useMemo(() => {
    const order = ["Free Shipping", "Standard Shipping", "Express Shipping"];
    return [...options].sort((a, b) => {
      const ai = order.indexOf(a.name);
      const bi = order.indexOf(b.name);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [options]);

  return (
    <div className="border-border/50 bg-card space-y-4 rounded-2xl border p-4 sm:p-6">
      <h2 className="text-foreground text-lg font-semibold">Shipping Method</h2>

      {qualifiesForFree && (
        <div className="border-success/25 bg-accent-green-light text-success-ink flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium">
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
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm transition ${
                  disabled && !isPending
                    ? "border-border/50 bg-background cursor-not-allowed opacity-50"
                    : selectedShipping === option.id
                      ? "border-secondary bg-secondary-light"
                      : "border-border/50 hover:border-foreground/30"
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
                          (orders over KSh{FREE_SHIPPING_THRESHOLD.toLocaleString()})
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
      <button
        onClick={onBack}
        className="text-muted hover:text-foreground text-sm font-medium transition"
      >
        &larr; Back to Address
      </button>
    </div>
  );
}

export default function CheckoutPage() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("address");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [placedOrderRef, setPlacedOrderRef] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mpesa_express");
  const [mpesaPhone, setMpesaPhone] = useState("");

  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    address_1: "",
    city: "Nairobi",
    province: "Nairobi",
    postal_code: "00100",
    country_code: "ke",
    phone: "+254",
  });

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
    refetchInterval: paymentPending ? 3_000 : false,
  });
  const cart = cartQuery.data;
  const currencyCode = "kes";
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
    checkoutProductsQuery.isFetched &&
    (cart?.items ?? []).some(
      (item) => !getCheckoutItemAvailability(item, checkoutProductsById).canPurchase,
    );

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
    setSelectedSavedAddressId(savedAddresses[0].id ?? null);
  }, [savedAddresses, selectedSavedAddressId]);

  // Pre-fill the M-Pesa phone from the cart's shipping address phone
  useEffect(() => {
    if (mpesaPhone) return;
    const phone = cart?.shipping_address?.phone || form.phone;
    if (phone && phone !== "+254") setMpesaPhone(phone);
  }, [cart?.shipping_address?.phone, form.phone, mpesaPhone]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const shippingQuery = useQuery({
    queryKey: ["shipping-options"],
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
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      const qualifies = (cart?.subtotal ?? 0) >= FREE_SHIPPING_THRESHOLD;
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
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setStep("payment");
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to set shipping method.");
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
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
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setStep("review");
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to initialize payment.");
    },
  });

  const finalizeOrderMutation = useMutation({
    mutationFn: () => completeCart(),
    onSuccess: (data) => {
      clearStoredCartId();
      setPaymentPending(false);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
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
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to place order.");
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (): Promise<CheckoutPaymentResult> => {
      if (paymentMethod === "mpesa_express") {
        const payment = await initializePaymentSession();
        if (!hasCapturedPayment(payment.payment_collection.payment_sessions)) {
          return { type: "payment_pending" };
        }
      } else {
        await initializePaymentSession();
      }

      return { type: "payment_captured" };
    },
    onSuccess: (data) => {
      if (data.type === "payment_pending") {
        setPaymentPending(true);
        setErrorMessage(null);
        queryClient.invalidateQueries({ queryKey: ["cart"] });
        return;
      }

      finalizeOrderMutation.mutate();
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to place order.");
    },
  });

  useEffect(() => {
    if (
      !paymentPending ||
      orderPlaced ||
      finalizeOrderMutation.isPending ||
      !hasCapturedPayment(cart?.payment_collection?.payment_sessions)
    ) {
      return;
    }

    finalizeOrderMutation.mutate();
  }, [
    cart?.payment_collection?.payment_sessions,
    finalizeOrderMutation,
    orderPlaced,
    paymentPending,
  ]);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasUnavailableItems) {
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

  if (paymentPending) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="border-border/50 bg-card flex flex-col items-center gap-5 rounded-2xl border p-10 text-center">
          <div className="bg-secondary-light flex h-20 w-20 items-center justify-center rounded-full">
            <Smartphone className="text-secondary h-9 w-9" />
          </div>
          <h1 className="text-foreground text-2xl font-bold">Payment Request Sent</h1>
          <div className="max-w-md space-y-2">
            <p className="text-foreground text-sm font-medium">
              Check your phone for the M-Pesa prompt
            </p>
            <p className="text-muted text-sm leading-relaxed">
              Enter your M-Pesa PIN on{" "}
              <span className="text-foreground font-medium">{mpesaPhone}</span>. We&apos;ll create
              your order after M-Pesa confirms the payment.
            </p>
          </div>
          <button
            onClick={() => cartQuery.refetch()}
            disabled={cartQuery.isFetching}
            className="border-border/50 text-foreground hover:border-border hover:bg-foreground/[0.04] focus-visible:ring-border rounded-full border bg-white px-6 py-2.5 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {cartQuery.isFetching ? "Checking..." : "Check Payment Status"}
          </button>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="border-border/50 bg-card flex flex-col items-center gap-5 rounded-2xl border p-10 text-center">
          <div className="bg-accent-green-light flex h-20 w-20 items-center justify-center rounded-full">
            <Check className="text-success h-9 w-9" />
          </div>
          <h1 className="text-foreground text-2xl font-bold">Order Placed!</h1>
          {placedOrderRef && (
            <p className="text-foreground text-sm font-medium">Order {placedOrderRef}</p>
          )}
          {paymentMethod === "mpesa_express" ? (
            <div className="max-w-md space-y-2">
              <p className="text-foreground text-sm font-medium">
                Check your phone for the M-Pesa prompt
              </p>
              <p className="text-muted text-sm leading-relaxed">
                We&apos;ve sent a Lipa na M-Pesa prompt to{" "}
                <span className="text-foreground font-medium">{mpesaPhone}</span>. Enter your M-Pesa
                PIN to complete payment. We&apos;ll dispatch once your payment is confirmed.
              </p>
            </div>
          ) : (
            <div className="border-border/50 bg-background/80 max-w-md space-y-2 rounded-2xl border p-4 text-left text-sm">
              <p className="text-foreground font-medium">Next: pay via M-Pesa Paybill</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted">Paybill</p>
                  <p className="text-foreground font-semibold">{MPESA_PAYBILL_NUMBER}</p>
                </div>
                <div>
                  <p className="text-muted">Account no.</p>
                  <p className="text-foreground font-semibold">{placedOrderRef ?? "—"}</p>
                </div>
              </div>
              <p className="text-muted text-xs leading-relaxed">
                Pay from your M-Pesa menu &rarr; Lipa na M-Pesa &rarr; Pay Bill. We&apos;ll dispatch
                once {MPESA_BUSINESS_NAME} confirms your payment.
              </p>
            </div>
          )}
          <p className="text-muted max-w-md text-sm leading-relaxed">
            Thank you for shopping at {MPESA_BUSINESS_NAME}! You&apos;ll receive a confirmation
            email shortly.
          </p>
          <Link
            href="/products"
            className="bg-foreground hover:bg-foreground/85 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-md transition"
          >
            <Baby className="h-4 w-4" /> Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-border/50 bg-card flex flex-col items-center gap-5 rounded-2xl border p-10 text-center">
          <div className="bg-primary-light flex h-20 w-20 items-center justify-center rounded-full">
            <ShoppingBag className="text-primary h-8 w-8" />
          </div>
          <div>
            <h1 className="text-foreground text-2xl font-bold">No items to checkout</h1>
            <p className="text-muted mt-1 text-sm">Add some products to your cart first.</p>
          </div>
          <Link
            href="/products"
            className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Baby className="h-4 w-4" /> Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const inputClass =
    "h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/15";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/cart"
          aria-label="Back to cart"
          className="text-muted hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-foreground/20 -ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:outline-none"
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
                      : "border-border/50 text-muted bg-white"
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
        <div className="border-danger/30 bg-danger/5 text-danger mb-6 rounded-xl border px-4 py-3 text-sm">
          {errorMessage}
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
                            : "border-border/50 text-muted bg-white"
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
                  className="border-border/50 bg-card space-y-5 rounded-2xl border p-4 sm:p-6"
                >
                  <h2 className="text-foreground text-lg font-semibold">Shipping Address</h2>
                  {customerQuery.data && (
                    <div className="border-secondary/15 bg-secondary-light/40 rounded-2xl border p-4">
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
                              className={`w-full rounded-2xl border p-4 text-left transition ${
                                isSelected
                                  ? "border-secondary bg-secondary-light/40"
                                  : "border-border/50 hover:border-border bg-white"
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
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={addressMutation.isPending || hasUnavailableItems}
                          className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                        >
                          {addressMutation.isPending
                            ? "Saving..."
                            : "Continue with Selected Address"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseManualAddress(true)}
                          className="border-border/50 text-foreground hover:border-border hover:bg-foreground/[0.04] focus-visible:ring-border rounded-full border bg-white px-6 py-2.5 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        >
                          Use Different Address
                        </button>
                      </div>
                    </div>
                  )}

                  {(!isUsingSavedAddress || !selectedSavedAddress) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-muted mb-1.5 block text-sm font-medium">
                          First Name <span className="text-danger">*</span>
                        </label>
                        <input
                          required
                          value={form.first_name}
                          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="text-muted mb-1.5 block text-sm font-medium">
                          Last Name <span className="text-danger">*</span>
                        </label>
                        <input
                          required
                          value={form.last_name}
                          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-muted mb-1.5 block text-sm font-medium">
                          Email <span className="text-muted/70 font-normal">(optional)</span>
                        </label>
                        {customerQuery.data ? (
                          <div className="border-border/50 bg-background text-muted flex h-10 items-center rounded-lg border px-3 text-sm">
                            {customerQuery.data.email}
                          </div>
                        ) : (
                          <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className={inputClass}
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-muted mb-1.5 block text-sm font-medium">
                          Phone <span className="text-danger">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="+254 7XX XXX XXX"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-muted mb-1.5 block text-sm font-medium">
                          Street Address <span className="text-danger">*</span>
                        </label>
                        <input
                          required
                          value={form.address_1}
                          onChange={(e) => setForm({ ...form, address_1: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}
                  {(!isUsingSavedAddress || !selectedSavedAddress) && (
                    <button
                      type="submit"
                      disabled={addressMutation.isPending || hasUnavailableItems}
                      className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                    >
                      {addressMutation.isPending ? "Saving..." : "Continue to Shipping"}
                    </button>
                  )}
                  {useManualAddress && savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setUseManualAddress(false)}
                      className="text-muted hover:text-foreground ml-4 text-sm font-medium transition"
                    >
                      Use a saved address instead
                    </button>
                  )}
                </form>
              )}

              {/* Step: Shipping */}
              {step === "shipping" && (
                <ShippingStep
                  options={shippingQuery.data?.shipping_options ?? []}
                  isLoading={shippingQuery.isLoading}
                  selectedShipping={selectedShipping}
                  isPending={shippingMutation.isPending}
                  cartSubtotal={cart.subtotal ?? 0}
                  onSelect={(optionId) => {
                    if (hasUnavailableItems) return;
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
                <div className="border-border/50 bg-card space-y-4 rounded-2xl border p-4 sm:p-6">
                  <div>
                    <h2 className="text-foreground text-lg font-semibold">Payment Method</h2>
                    <p className="text-muted mt-1 text-sm">
                      Orders are dispatched after payment is confirmed.
                    </p>
                  </div>

                  {/* M-Pesa Express */}
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                      paymentMethod === "mpesa_express"
                        ? "border-secondary bg-secondary-light/40"
                        : "border-border/50 hover:border-border bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value="mpesa_express"
                      checked={paymentMethod === "mpesa_express"}
                      onChange={() => setPaymentMethod("mpesa_express")}
                      className="accent-foreground mt-1.5"
                    />
                    <Smartphone className="text-secondary mt-0.5 h-5 w-5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-foreground font-medium">M-Pesa Express</p>
                        <span className="bg-accent-green-light text-success rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
                          Recommended
                        </span>
                      </div>
                      <p className="text-muted mt-0.5 text-sm">
                        Get a payment prompt on your phone &mdash; just enter your M-Pesa PIN.
                      </p>
                      {paymentMethod === "mpesa_express" && (
                        <div className="mt-3 space-y-1.5">
                          <label className="text-muted block text-xs font-medium">
                            M-Pesa Phone Number <span className="text-danger">*</span>
                          </label>
                          <input
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
                  </label>

                  {/* Manual Paybill */}
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                      paymentMethod === "mpesa_paybill"
                        ? "border-secondary bg-secondary-light/40"
                        : "border-border/50 hover:border-border bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value="mpesa_paybill"
                      checked={paymentMethod === "mpesa_paybill"}
                      onChange={() => setPaymentMethod("mpesa_paybill")}
                      className="accent-foreground mt-1.5"
                    />
                    <Receipt className="text-secondary mt-0.5 h-5 w-5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-foreground font-medium">Pay via M-Pesa Paybill</p>
                      <p className="text-muted mt-0.5 text-sm">
                        Pay manually from your M-Pesa menu using our Paybill number.
                      </p>
                      {paymentMethod === "mpesa_paybill" && (
                        <div className="border-border/50 bg-background/80 mt-3 space-y-3 rounded-xl border p-3 text-sm">
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
                        hasUnavailableItems ||
                        (paymentMethod === "mpesa_express" && !mpesaPhone.trim())
                      }
                      className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                    >
                      {paymentMutation.isPending ? "Saving..." : "Continue to Review"}
                    </button>
                    <button
                      onClick={() => {
                        setStep("shipping");
                        setErrorMessage(null);
                      }}
                      className="text-muted hover:text-foreground text-sm font-medium transition"
                    >
                      &larr; Back to Shipping
                    </button>
                  </div>
                </div>
              )}

              {/* Step: Review */}
              {step === "review" && (
                <div className="border-border/50 bg-card space-y-4 rounded-2xl border p-4 sm:p-6">
                  <h2 className="text-foreground text-lg font-semibold">Review & Place Order</h2>

                  {/* Address summary */}
                  {cart.shipping_address && (
                    <div className="border-border/50 bg-background/80 rounded-2xl border p-4 text-sm">
                      <p className="text-muted mb-1 text-sm font-semibold">Shipping to</p>
                      <p className="text-foreground">
                        {cart.shipping_address.first_name} {cart.shipping_address.last_name}
                      </p>
                      <p className="text-muted">
                        {cart.shipping_address.address_1}, {cart.shipping_address.city}
                      </p>
                      <p className="text-muted">
                        {cart.shipping_address.province}, {cart.shipping_address.postal_code}
                      </p>
                      {cart.shipping_address.phone && (
                        <p className="text-muted">{cart.shipping_address.phone}</p>
                      )}
                    </div>
                  )}

                  {/* Shipping method summary */}
                  {cart.shipping_methods && cart.shipping_methods.length > 0 && (
                    <div className="border-border/50 bg-background/80 rounded-2xl border p-4 text-sm">
                      <p className="text-muted mb-1 text-sm font-semibold">Shipping method</p>
                      {cart.shipping_methods.map((m) => (
                        <p key={m.id} className="text-foreground">
                          {m.name} — {formatPrice(m.amount, currencyCode)}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Payment method summary */}
                  <div className="border-border/50 bg-background/80 rounded-2xl border p-4 text-sm">
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

                  <p className="text-muted text-sm">Review your details before continuing.</p>
                  <button
                    onClick={() => completeMutation.mutate()}
                    disabled={
                      completeMutation.isPending ||
                      finalizeOrderMutation.isPending ||
                      hasUnavailableItems
                    }
                    className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
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
                    className="text-muted hover:text-foreground ml-4 text-sm font-medium transition"
                  >
                    &larr; Back to Payment
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary sidebar */}
            <div className="border-border/50 bg-card rounded-2xl border p-4 sm:p-6 lg:sticky lg:top-24 lg:self-start">
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

                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="border-border/50 bg-background relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border">
                        {resolvedImage ? (
                          <Image
                            src={resolvedImage}
                            alt={item.title}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="text-muted flex h-full w-full items-center justify-center">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <span className="bg-foreground text-2xs absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full font-bold text-white shadow">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col justify-center overflow-hidden">
                        <p className="text-foreground truncate text-sm font-medium">{item.title}</p>
                        <div className="text-muted flex items-center gap-2 text-sm">
                          <span>{formatPrice(item.unit_price, currencyCode)}</span>
                          {item.quantity > 1 && <span className="text-xs">× {item.quantity}</span>}
                        </div>
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
              <div className="border-border/50 space-y-2.5 border-t pt-4 text-sm">
                <div className="text-muted flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-foreground">
                    {formatPrice(cart.subtotal, currencyCode)}
                  </span>
                </div>
                {cart.shipping_total > 0 && (
                  <div className="text-muted flex justify-between">
                    <span>Shipping</span>
                    <span className="text-foreground">
                      {formatPrice(cart.shipping_total, currencyCode)}
                    </span>
                  </div>
                )}
                {cart.tax_total > 0 && (
                  <div className="text-muted flex justify-between">
                    <span>Tax</span>
                    <span className="text-foreground">
                      {formatPrice(cart.tax_total, currencyCode)}
                    </span>
                  </div>
                )}
                {cart.discount_total > 0 && (
                  <div className="text-success-ink flex justify-between">
                    <span>Discount</span>
                    <span className="font-medium">
                      -{formatPrice(cart.discount_total, currencyCode)}
                    </span>
                  </div>
                )}
                <div className="border-border/50 border-t pt-3">
                  <div className="text-foreground flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span>{formatPrice(cart.total, currencyCode)}</span>
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
