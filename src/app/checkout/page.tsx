"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Baby, Check, CreditCard, MapPin, Package, ShoppingBag, Truck } from "lucide-react";
import Link from "next/link";
import { getCart, updateCart, getShippingOptions, addShippingMethod, initializePaymentSession, completeCart, getRegions, getCustomer, getCustomerAddresses } from "@/lib/medusa-api";
import { formatPrice } from "@/lib/formatters";
import { clearStoredCartId } from "@/lib/http";
import { MedusaAddress } from "@/types/medusa";

type Step = "address" | "shipping" | "payment" | "review";

const ETHIOPIAN_CITIES = [
  "Addis Ababa", "Dire Dawa", "Adama (Nazret)", "Hawassa", "Bahir Dar",
  "Mekelle", "Gondar", "Jimma", "Dessie", "Harar",
];

const ETHIOPIAN_REGIONS = [
  "Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Dire Dawa",
  "Gambella", "Harari", "Oromia", "SNNPR", "Sidama", "Somali",
  "South West Ethiopia", "Tigray",
];

function toCheckoutAddress(address: Partial<MedusaAddress>) {
  return {
    first_name: address.first_name ?? "",
    last_name: address.last_name ?? "",
    address_1: address.address_1 ?? "",
    city: address.city ?? "Addis Ababa",
    province: address.province ?? "Addis Ababa",
    postal_code: address.postal_code ?? "1000",
    country_code: address.country_code ?? "et",
    phone: address.phone ?? "+251",
  };
}

export default function CheckoutPage() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("address");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);
  const [useManualAddress, setUseManualAddress] = useState(false);

  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    address_1: "",
    city: "Addis Ababa",
    province: "Addis Ababa",
    postal_code: "1000",
    country_code: "et",
    phone: "+251",
  });

  const cartQuery = useQuery({ queryKey: ["cart"], queryFn: getCart });
  const cart = cartQuery.data;
  const currencyCode = "etb";

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

  const savedAddresses = addressesQuery.data ?? [];
  const selectedSavedAddress =
    savedAddresses.find((address) => address.id === selectedSavedAddressId) ??
    savedAddresses[0];
  const isUsingSavedAddress =
    !!customerQuery.data && savedAddresses.length > 0 && !useManualAddress;

  useEffect(() => {
    const customer = customerQuery.data;
    if (!customer) return;

    setForm((current) => ({
      ...current,
      email: current.email || customer.email,
      first_name: current.first_name || customer.first_name || "",
      last_name: current.last_name || customer.last_name || "",
      phone:
        current.phone && current.phone !== "+251"
          ? current.phone
          : customer.phone || current.phone,
    }));
  }, [customerQuery.data]);

  useEffect(() => {
    if (!savedAddresses.length || selectedSavedAddressId) return;
    setSelectedSavedAddressId(savedAddresses[0].id ?? null);
  }, [savedAddresses, selectedSavedAddressId]);

  const shippingQuery = useQuery({
    queryKey: ["shipping-options"],
    queryFn: getShippingOptions,
    enabled: step === "shipping" || step === "payment" || step === "review",
  });

  const addressMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      if (cart?.region?.currency_code !== "etb") {
        const regionsRes = await getRegions();
        const ethRegion = regionsRes.regions.find((r) =>
          r.countries.some((c) => c.iso_2 === "et"),
        );
        if (ethRegion) {
          await updateCart({ region_id: ethRegion.id });
        }
      }

      const address = isUsingSavedAddress && selectedSavedAddress
        ? toCheckoutAddress(selectedSavedAddress)
        : toCheckoutAddress(form);

      return updateCart({
        email: customerQuery.data?.email || form.email,
        shipping_address: address,
        billing_address: address,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
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
    mutationFn: () => initializePaymentSession(),
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setStep("review");
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to initialize payment.");
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeCart(),
    onSuccess: () => {
      clearStoredCartId();
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setOrderPlaced(true);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to place order.");
    },
  });

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addressMutation.mutate();
  };

  const steps: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: "address", label: "Address", icon: MapPin },
    { id: "shipping", label: "Shipping", icon: Truck },
    { id: "payment", label: "Payment", icon: CreditCard },
    { id: "review", label: "Review", icon: Package },
  ];
  const currentIdx = steps.findIndex((s) => s.id === step);

  if (orderPlaced) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-green-light">
            <Check className="h-9 w-9 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Order Placed!</h1>
          <p className="max-w-md text-sm leading-relaxed text-muted">
            Thank you for shopping at Kokob! You&apos;ll receive a confirmation email shortly.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-primary-hover"
          >
            <Baby className="h-4 w-4" /> Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-16 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-light" />
          <h1 className="text-2xl font-bold text-foreground">No items to checkout</h1>
          <Link href="/products" className="text-sm font-medium text-primary hover:underline">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const inputClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
  const selectClass = "h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/cart" className="rounded-full p-2 text-muted transition hover:bg-primary-light hover:text-primary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Checkout</h1>
      </div>

      {/* Step indicator (bagisto style) */}
      <div className="mb-10 flex items-center gap-0">
        {steps.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center">
            <div className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                  i < currentIdx
                    ? "border-success bg-success text-white"
                    : i === currentIdx
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card text-muted"
                }`}
              >
                {i < currentIdx ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs font-medium ${i <= currentIdx ? "text-foreground" : "text-muted"}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mt-[-1rem] h-0.5 w-full ${i < currentIdx ? "bg-success" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Step: Address */}
          {step === "address" && (
            <form onSubmit={handleAddressSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Shipping Address</h2>
              {customerQuery.data && (
                <div className="rounded-2xl border border-primary/15 bg-primary-light/40 p-4">
                  <p className="text-sm font-medium text-foreground">
                    Checking out as {customerQuery.data.email}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    You can use a saved address or enter a different delivery address.
                  </p>
                </div>
              )}

              {isUsingSavedAddress && selectedSavedAddress && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Saved addresses</p>
                    {savedAddresses.map((address) => {
                      const isSelected = address.id === selectedSavedAddress.id;
                      return (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => setSelectedSavedAddressId(address.id ?? null)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            isSelected
                              ? "border-primary bg-primary-light/40"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-foreground">
                                {address.first_name} {address.last_name}
                              </p>
                              <p className="text-sm text-muted">{address.address_1}</p>
                              <p className="text-sm text-muted">
                                {address.city}
                                {address.province ? `, ${address.province}` : ""} {address.postal_code}
                              </p>
                              {address.phone && (
                                <p className="mt-1 text-sm text-muted">{address.phone}</p>
                              )}
                            </div>
                            {isSelected && (
                              <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
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
                      disabled={addressMutation.isPending}
                      className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
                    >
                      {addressMutation.isPending ? "Saving..." : "Continue with Selected Address"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseManualAddress(true)}
                      className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted/10"
                    >
                      Use Different Address
                    </button>
                  </div>
                </div>
              )}

              {(!isUsingSavedAddress || !selectedSavedAddress) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">First Name</label>
                    <input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Last Name</label>
                    <input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-muted">Email</label>
                    {customerQuery.data ? (
                      <div className="flex h-10 items-center rounded-lg border border-border bg-background px-3 text-sm text-muted">
                        {customerQuery.data.email}
                      </div>
                    ) : (
                      <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Phone</label>
                    <input type="tel" required placeholder="+251 9XX XXX XXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">City</label>
                    <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={selectClass}>
                      {ETHIOPIAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      <option value="">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Region</label>
                    <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className={selectClass}>
                      {ETHIOPIAN_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Postal Code</label>
                    <input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-muted">Street Address / Kebele / House No.</label>
                    <input required value={form.address_1} onChange={(e) => setForm({ ...form, address_1: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Country</label>
                    <div className="flex h-10 items-center rounded-lg border border-border bg-background px-3 text-sm text-muted">
                      Ethiopia (ET)
                    </div>
                  </div>
                </div>
              )}
              {(!isUsingSavedAddress || !selectedSavedAddress) && (
                <button
                  type="submit"
                  disabled={addressMutation.isPending}
                  className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
                >
                  {addressMutation.isPending ? "Saving..." : "Continue to Shipping"}
                </button>
              )}
              {useManualAddress && savedAddresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setUseManualAddress(false)}
                  className="ml-4 text-sm font-medium text-muted transition hover:text-primary"
                >
                  Use a saved address instead
                </button>
              )}
            </form>
          )}

          {/* Step: Shipping */}
          {step === "shipping" && (
            <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Shipping Method</h2>
              {shippingQuery.isLoading ? (
                <div className="space-y-2">
                  <div className="h-16 animate-pulse rounded-xl bg-border/40" />
                  <div className="h-16 animate-pulse rounded-xl bg-border/40" />
                  <div className="h-16 animate-pulse rounded-xl bg-border/40" />
                </div>
              ) : (shippingQuery.data?.shipping_options ?? []).length === 0 ? (
                <p className="text-sm text-muted">No shipping methods available. Please go back and verify your address.</p>
              ) : (
                <div className="space-y-2">
                  {(shippingQuery.data?.shipping_options ?? []).map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSelectedShipping(option.id);
                        shippingMutation.mutate(option.id);
                      }}
                      disabled={shippingMutation.isPending}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm transition disabled:opacity-50 ${
                        selectedShipping === option.id
                          ? "border-primary bg-primary-light"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">{option.name}</p>
                          {option.amount === 0 && (
                            <p className="text-xs text-muted">Free</p>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-primary">
                        {option.amount === 0 ? "Free" : formatPrice(option.amount, currencyCode)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => { setStep("address"); setErrorMessage(null); }}
                className="text-sm font-medium text-muted transition hover:text-primary"
              >
                &larr; Back to Address
              </button>
            </div>
          )}

          {/* Step: Payment */}
          {step === "payment" && (
            <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Payment Method</h2>
              <button
                onClick={() => paymentMutation.mutate()}
                disabled={paymentMutation.isPending}
                className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3.5 text-left text-sm transition hover:border-primary/40 disabled:opacity-50"
              >
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Cash on Delivery / Manual Payment</p>
                  <p className="text-xs text-muted">
                    {paymentMutation.isPending ? "Initializing payment..." : "Pay when you receive your order"}
                  </p>
                </div>
              </button>
              <button
                onClick={() => { setStep("shipping"); setErrorMessage(null); }}
                className="text-sm font-medium text-muted transition hover:text-primary"
              >
                &larr; Back to Shipping
              </button>
            </div>
          )}

          {/* Step: Review */}
          {step === "review" && (
            <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Review & Place Order</h2>

              {/* Address summary */}
              {cart.shipping_address && (
                <div className="rounded-xl border border-border bg-background p-4 text-sm">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Shipping to</p>
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
                <div className="rounded-xl border border-border bg-background p-4 text-sm">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Shipping method</p>
                  {cart.shipping_methods.map((m) => (
                    <p key={m.id} className="text-foreground">{m.name} — {formatPrice(m.amount, currencyCode)}</p>
                  ))}
                </div>
              )}

              <p className="text-sm text-muted">Review your order details and click below to complete your purchase.</p>
              <button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
              >
                {completeMutation.isPending ? "Placing Order..." : "Place Order"}
              </button>
              <button
                onClick={() => { setStep("payment"); setErrorMessage(null); }}
                className="ml-4 text-sm font-medium text-muted transition hover:text-primary"
              >
                &larr; Back to Payment
              </button>
            </div>
          )}
        </div>

        {/* Order Summary sidebar (bagisto style) */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">
            Order Summary
            <span className="ml-1.5 text-xs font-medium text-muted">
              ({cart.items.length} {cart.items.length === 1 ? "item" : "items"})
            </span>
          </h3>

          {/* Cart items */}
          <div className="mb-4 max-h-64 space-y-3 overflow-y-auto pr-1">
            {cart.items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted">
                      <Package className="h-5 w-5" />
                    </div>
                  )}
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex flex-1 flex-col justify-center overflow-hidden">
                  <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>{formatPrice(item.unit_price, currencyCode)}</span>
                    {item.quantity > 1 && <span className="text-[10px]">× {item.quantity}</span>}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center text-xs font-semibold text-foreground">
                  {formatPrice(item.total, currencyCode)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span className="text-foreground">{formatPrice(cart.subtotal, currencyCode)}</span>
            </div>
            {cart.shipping_total > 0 && (
              <div className="flex justify-between text-muted">
                <span>Shipping</span>
                <span className="text-foreground">{formatPrice(cart.shipping_total, currencyCode)}</span>
              </div>
            )}
            {cart.tax_total > 0 && (
              <div className="flex justify-between text-muted">
                <span>Tax</span>
                <span className="text-foreground">{formatPrice(cart.tax_total, currencyCode)}</span>
              </div>
            )}
            {cart.discount_total > 0 && (
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span className="font-medium">-{formatPrice(cart.discount_total, currencyCode)}</span>
              </div>
            )}
            <div className="border-t border-border pt-3">
              <div className="flex justify-between text-base font-bold text-foreground">
                <span>Total</span>
                <span className="text-primary">{formatPrice(cart.total, currencyCode)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
