"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCustomer,
  updateCustomer,
  getCustomerAddresses,
  addCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  getOrders,
  getOrderById,
  getProductsByIds,
  getWishlistProductIds,
  resendVerificationEmail,
} from "@/lib/medusa-api";
import { clearAuthToken } from "@/lib/http";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice, formatOrderRef, resolveOrderItemImage } from "@/lib/formatters";
import { MedusaAddress, MedusaLineItem, MedusaOrder } from "@/types/medusa";
import {
  User,
  MapPin,
  Package,
  LogOut,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  Phone,
  ShoppingBag,
  Baby,
  Heart,
  Mail,
  BadgeCheck,
} from "lucide-react";

const EMPTY_ADDRESS: Omit<MedusaAddress, "id"> = {
  first_name: "",
  last_name: "",
  address_1: "",
  address_2: "",
  city: "",
  province: "",
  postal_code: "",
  country_code: "et",
  phone: "",
};

const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-border/50 bg-white px-3 text-sm  outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/15";

type JourneyStep = { label: string; reached: boolean; active: boolean; failed?: boolean };

/**
 * Derive a customer-facing order journey from Medusa's three status fields.
 *
 * Medusa v2 backend statuses:
 *   status:             pending | completed | archived | canceled | requires_action | draft
 *   fulfillment_status: not_fulfilled | partially_fulfilled | fulfilled |
 *                       partially_shipped | shipped | partially_delivered | delivered |
 *                       partially_returned | returned | canceled | requires_action
 *   payment_status:     not_paid | awaiting | authorized | partially_authorized |
 *                       captured | partially_captured | partially_refunded | refunded |
 *                       canceled | requires_action
 *
 * Customer journey (happy path, 4 steps):
 *   Ordered -> Confirmed -> Shipped -> Delivered
 *
 * Mapping (admin action -> backend fulfillment_status -> UI step):
 *   Place order           -> not_fulfilled              -> Ordered
 *   Fulfil items          -> fulfilled/partially_fulfilled -> Confirmed
 *   Mark as Shipped       -> shipped/partially_shipped  -> Shipped
 *   Mark as Delivered     -> delivered/partially_delivered -> Delivered
 *
 * Terminal paths append a failure step at the point the order diverged:
 *   Ordered -> Canceled
 *   Ordered -> Confirmed -> Refunded
 *   Ordered -> Confirmed -> Shipped -> Returned
 *
 * The summary badge always matches the last step in the journey.
 */
function getOrderJourney(order: MedusaOrder): JourneyStep[] {
  const s = order.status;
  const fs = order.fulfillment_status;
  const ps = order.payment_status;

  const isCanceled = s === "canceled" || ps === "canceled";
  const isRefunded = ps === "refunded" || ps === "partially_refunded";
  const isReturned = fs === "returned" || fs === "partially_returned";

  const confirmed =
    ["authorized", "partially_authorized", "captured", "partially_captured"].includes(ps) ||
    [
      "partially_fulfilled",
      "fulfilled",
      "partially_shipped",
      "shipped",
      "partially_delivered",
      "delivered",
    ].includes(fs);

  const shipped = ["shipped", "partially_shipped", "delivered", "partially_delivered"].includes(fs);

  const delivered =
    ["delivered", "partially_delivered"].includes(fs) || s === "completed" || s === "archived";

  if (isCanceled) {
    const steps: JourneyStep[] = [{ label: "Ordered", reached: true, active: false }];
    if (confirmed) steps.push({ label: "Confirmed", reached: true, active: false });
    steps.push({ label: "Canceled", reached: true, active: true, failed: true });
    return steps;
  }

  if (isReturned) {
    const steps: JourneyStep[] = [
      { label: "Ordered", reached: true, active: false },
      { label: "Confirmed", reached: true, active: false },
    ];
    if (shipped) steps.push({ label: "Shipped", reached: true, active: false });
    steps.push({ label: "Returned", reached: true, active: true, failed: true });
    return steps;
  }

  if (isRefunded) {
    const steps: JourneyStep[] = [{ label: "Ordered", reached: true, active: false }];
    if (confirmed) steps.push({ label: "Confirmed", reached: true, active: false });
    if (shipped) steps.push({ label: "Shipped", reached: true, active: false });
    if (delivered) steps.push({ label: "Delivered", reached: true, active: false });
    steps.push({ label: "Refunded", reached: true, active: true, failed: true });
    return steps;
  }

  return [
    { label: "Ordered", reached: true, active: !confirmed },
    { label: "Confirmed", reached: confirmed, active: confirmed && !shipped },
    { label: "Shipped", reached: shipped, active: shipped && !delivered },
    { label: "Delivered", reached: delivered, active: delivered },
  ];
}

function getOrderSummaryLabel(order: MedusaOrder): string {
  const steps = getOrderJourney(order);
  const last = steps[steps.length - 1];
  if (last.failed) return last.label;
  const active = steps.findLast((st) => st.reached);
  return active?.label ?? "Ordered";
}

function getStatusColor(label: string) {
  switch (label) {
    case "Delivered":
      return "bg-accent-green-light text-success-ink";
    case "Shipped":
      return "bg-secondary-light text-secondary";
    case "Confirmed":
      return "bg-secondary-light text-secondary";
    case "Ordered":
      return "bg-accent-yellow-light text-accent-yellow-ink";
    case "Canceled":
      return "bg-danger/10 text-danger";
    case "Refunded":
      return "bg-danger/10 text-danger";
    case "Returned":
      return "bg-danger/10 text-danger";
    default:
      return "bg-foreground/10 text-foreground";
  }
}

function OrderJourney({ order }: { order: MedusaOrder }) {
  const steps = getOrderJourney(order);
  return (
    <div className="flex items-center">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                step.failed
                  ? "bg-danger text-white"
                  : step.active
                    ? "bg-accent-green-bold text-white"
                    : step.reached
                      ? "bg-accent-green-bold text-white"
                      : "bg-border text-muted"
              }`}
            >
              {step.failed ? "✕" : step.reached ? "✓" : i + 1}
            </div>
            <span
              className={`mt-1 w-16 text-center text-xs leading-tight ${
                step.failed
                  ? "text-danger font-semibold"
                  : step.active
                    ? "text-foreground font-semibold"
                    : step.reached
                      ? "text-foreground font-medium"
                      : "text-muted"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mx-0.5 mb-3 h-[2px] w-5 sm:w-7 ${
                step.failed
                  ? "bg-danger/30"
                  : steps[i + 1].reached
                    ? "bg-accent-green-bold"
                    : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const addressesRef = useRef<HTMLDivElement>(null);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer"],
    queryFn: getCustomer,
  });

  const { data: addresses } = useQuery({
    queryKey: ["addresses"],
    queryFn: getCustomerAddresses,
    enabled: !!customer,
  });

  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
    enabled: !!customer,
  });

  const { data: wishlistIds } = useQuery({
    queryKey: ["wishlist"],
    queryFn: getWishlistProductIds,
    enabled: !!customer,
  });

  useEffect(() => {
    if (!isLoading && !customer) {
      router.replace("/account/login");
    }
  }, [isLoading, customer, router]);

  const handleSignOut = () => {
    clearAuthToken();
    queryClient.clear();
    router.push("/");
  };

  const sortedOrders = orders?.length
    ? [...orders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    : [];
  const requestedOrderId = searchParams.get("order");
  const orderProductIds = Array.from(
    new Set(
      sortedOrders.flatMap((order) =>
        (order.items ?? []).flatMap((item) =>
          [item.product_id, item.variant?.product?.id].filter((id): id is string => !!id),
        ),
      ),
    ),
  );
  const orderProductsQuery = useQuery({
    queryKey: ["order-products", orderProductIds],
    queryFn: () => getProductsByIds(orderProductIds),
    enabled: !!customer && orderProductIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const orderProductsById = new Map(
    (orderProductsQuery.data ?? []).map((product) => [product.id, product]),
  );

  if (isLoading) {
    return (
      <div
        className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
        <div className="mb-8 flex items-center gap-4">
          <div className="bg-border/40 h-12 w-12 animate-pulse rounded-full" />
          <div className="space-y-2">
            <div className="bg-border/40 h-5 w-40 animate-pulse rounded-lg" />
            <div className="bg-border/40 h-4 w-28 animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <div className="bg-border/40 h-40 animate-pulse rounded-2xl" />
            <div className="bg-border/40 h-32 animate-pulse rounded-2xl" />
            <div className="bg-border/40 h-48 animate-pulse rounded-2xl" />
          </div>
          <div className="bg-border/40 h-64 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const initials =
    ((customer.first_name?.[0] ?? "") + (customer.last_name?.[0] ?? "")).toUpperCase() || "?";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Slim welcome header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-foreground flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white">
              {initials}
            </div>
            {customer.metadata?.email_verified === true && (
              <div className="absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white">
                <BadgeCheck className="text-secondary h-4 w-4" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-foreground text-xl font-bold">
                {customer.first_name || "Welcome"} {customer.last_name || ""}
              </h1>
              {customer.metadata?.email_verified === true && (
                <span className="bg-secondary-light/80 text-secondary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold">
                  <BadgeCheck className="h-3 w-3" />
                  Verified
                </span>
              )}
              {customer.metadata?.auth_provider === "google" && (
                <span className="border-border/50 text-muted inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-medium">
                  <svg className="h-3 w-3" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </span>
              )}
            </div>
            <p className="text-muted truncate text-sm">{customer.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="border-border/50 text-muted hover:border-danger/20 hover:bg-danger/5 hover:text-danger hidden items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-sm font-medium transition sm:flex"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>

      <EmailVerificationBanner customer={customer} />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_300px]">
        {/* Left column -- all content sections */}
        <div className="min-w-0 space-y-5">
          <ProfileDetails customer={customer} />
          <AddressesSection ref={addressesRef} />
          <OrdersSection
            orders={sortedOrders}
            isLoading={!orders && !!customer}
            initialExpandedId={requestedOrderId}
            productsById={orderProductsById}
          />
        </div>

        {/* Right column -- sticky sidebar */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {/* Quick Stats */}
          <div className="border-border/50 bg-card overflow-hidden rounded-2xl border">
            <div className="px-5 pt-4 pb-1">
              <h2 className="text-muted text-sm font-semibold">Account Snapshot</h2>
            </div>
            <div className="divide-border divide-y">
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="bg-accent-yellow-light flex h-8 w-8 items-center justify-center rounded-lg">
                    <Package className="text-accent-yellow-ink h-4 w-4" />
                  </div>
                  <span className="text-foreground text-sm">Orders</span>
                </div>
                <span className="text-foreground text-sm font-bold">{orders?.length ?? 0}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="bg-secondary-light flex h-8 w-8 items-center justify-center rounded-lg">
                    <MapPin className="text-secondary h-4 w-4" />
                  </div>
                  <span className="text-foreground text-sm">Addresses</span>
                </div>
                <span className="text-foreground text-sm font-bold">{addresses?.length ?? 0}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="bg-danger/10 flex h-8 w-8 items-center justify-center rounded-lg">
                    <Heart className="text-danger h-4 w-4" />
                  </div>
                  <span className="text-foreground text-sm">Wishlist</span>
                </div>
                <span className="text-foreground text-sm font-bold">
                  {wishlistIds?.length ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-border/50 bg-card overflow-hidden rounded-2xl border">
            <div className="px-5 pt-4 pb-1">
              <h2 className="text-muted text-sm font-semibold">Quick Actions</h2>
            </div>
            <div className="divide-border divide-y">
              <Link
                href="/products"
                className="text-foreground hover:bg-foreground/[0.04]/60 flex items-center justify-between px-5 py-3 text-sm transition"
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="text-secondary h-4 w-4" />
                  Continue Shopping
                </div>
                <ChevronRight className="text-muted h-3.5 w-3.5" />
              </Link>
              <Link
                href="/account/wishlist"
                className="text-foreground hover:bg-foreground/[0.04]/60 flex items-center justify-between px-5 py-3 text-sm transition"
              >
                <div className="flex items-center gap-2.5">
                  <Heart className="text-danger h-4 w-4" />
                  Open Wishlist
                </div>
                <ChevronRight className="text-muted h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() =>
                  addressesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="text-foreground hover:bg-foreground/[0.04]/60 flex w-full items-center justify-between px-5 py-3 text-left text-sm transition"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="text-secondary h-4 w-4" />
                  Manage Addresses
                </div>
                <ChevronRight className="text-muted h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile sign out */}
          <button
            onClick={handleSignOut}
            className="border-border/50 bg-card text-muted hover:bg-danger/5 hover:text-danger flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-medium transition sm:hidden"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Email Verification Banner ───────────────────────────────────────

function EmailVerificationBanner({
  customer,
}: {
  customer: { email: string; metadata?: Record<string, unknown> | null };
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const isVerified = customer.metadata?.email_verified === true;
  if (isVerified) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerificationEmail(customer.email);
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-secondary/20 bg-secondary-light mb-5 flex items-center gap-3 rounded-2xl border px-5 py-3.5">
      <Mail className="text-secondary h-5 w-5 shrink-0" />
      <p className="text-foreground flex-1 text-sm">
        {sent
          ? "Verification email sent! Check your inbox."
          : "Please verify your email address. Check your inbox for a verification link."}
      </p>
      {!sent && (
        <button
          onClick={handleResend}
          disabled={sending}
          className="bg-secondary hover:bg-secondary/85 shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
        >
          {sending ? "Sending..." : "Resend"}
        </button>
      )}
    </div>
  );
}

// ── Profile Details (compact receipt-style) ─────────────────────────

function ProfileDetails({
  customer,
}: {
  customer: NonNullable<Awaited<ReturnType<typeof getCustomer>>>;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(customer.first_name ?? "");
  const [lastName, setLastName] = useState(customer.last_name ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");

  const mutation = useMutation({
    mutationFn: () => updateCustomer({ first_name: firstName, last_name: lastName, phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      setEditing(false);
    },
  });

  const handleCancel = () => {
    setFirstName(customer.first_name ?? "");
    setLastName(customer.last_name ?? "");
    setPhone(customer.phone ?? "");
    setEditing(false);
  };

  return (
    <div className="border-border/50 bg-card overflow-hidden rounded-2xl border">
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2">
          <User className="text-secondary h-4 w-4" />
          <h2 className="text-foreground text-sm font-semibold">Personal Information</h2>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-muted hover:text-foreground flex items-center gap-1 text-sm font-medium transition"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="border-border/50 border-t px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-muted mb-1 block text-sm font-medium">First Name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="text-muted mb-1 block text-sm font-medium">Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-muted mb-1 block text-sm font-medium">Email</label>
            <div className="bg-background/50 text-muted flex h-10 items-center rounded-lg px-3 text-sm">
              {customer.email}
            </div>
          </div>
          <div className="mt-3">
            <label className="text-muted mb-1 block text-sm font-medium">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          {mutation.isError && (
            <p className="text-danger mt-2 text-sm">Failed to update profile. Please try again.</p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="bg-foreground hover:bg-foreground/85 rounded-full px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              className="border-border/50 text-foreground hover:border-border hover:bg-foreground/[0.04] rounded-full border bg-white px-5 py-2 text-sm font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-border divide-y">
          <div className="flex items-center justify-between px-5 py-2.5">
            <div className="text-muted flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5" />
              Name
            </div>
            <span className="text-foreground text-sm font-medium">
              {customer.first_name} {customer.last_name}
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-2.5">
            <div className="text-muted flex items-center gap-2 text-sm">
              <Mail className="h-3.5 w-3.5" />
              Email
            </div>
            <span className="text-foreground truncate text-sm font-medium">{customer.email}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-2.5">
            <div className="text-muted flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5" />
              Phone
            </div>
            <span className="text-foreground text-sm font-medium">
              {customer.phone || "Not set"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Addresses Section (collapsible) ─────────────────────────────────

import { forwardRef } from "react";

const AddressesSection = forwardRef<HTMLDivElement>(function AddressesSection(_props, ref) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<MedusaAddress, "id">>(EMPTY_ADDRESS);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: getCustomerAddresses,
  });

  const addMutation = useMutation({
    mutationFn: () => addCustomerAddress(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setShowForm(false);
      setForm(EMPTY_ADDRESS);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateCustomerAddress(editingId!, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setEditingId(null);
      setForm(EMPTY_ADDRESS);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomerAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });

  const startEdit = (addr: MedusaAddress) => {
    setEditingId(addr.id!);
    setForm({
      first_name: addr.first_name ?? "",
      last_name: addr.last_name ?? "",
      address_1: addr.address_1 ?? "",
      address_2: addr.address_2 ?? "",
      city: addr.city ?? "",
      province: addr.province ?? "",
      postal_code: addr.postal_code ?? "",
      country_code: addr.country_code ?? "et",
      phone: addr.phone ?? "",
    });
    setShowForm(false);
    setExpanded(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_ADDRESS);
  };

  const handleAddNew = () => {
    setShowForm(true);
    setForm(EMPTY_ADDRESS);
    setExpanded(true);
  };

  if (isLoading) {
    return <div className="bg-border/40 h-14 animate-pulse rounded-2xl" />;
  }

  const isFormVisible = showForm || editingId !== null;
  const count = addresses?.length ?? 0;

  return (
    <div ref={ref} className="border-border/50 bg-card overflow-hidden rounded-2xl border">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="hover:bg-foreground/[0.04]/40 flex w-full items-center justify-between px-5 py-3.5 text-left transition"
      >
        <div className="flex items-center gap-2">
          <MapPin className="text-secondary h-4 w-4" />
          <h2 className="text-foreground text-sm font-semibold">Delivery Addresses</h2>
          <span className="bg-secondary-light text-secondary rounded-full px-2 py-0.5 text-xs font-semibold">
            {count}
          </span>
        </div>
        <ChevronDown
          className={`text-muted h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="border-border/50 border-t">
          {count > 0 ? (
            <div className="divide-border divide-y">
              {addresses!.map((addr) =>
                editingId === addr.id ? (
                  <div key={addr.id} className="px-5 py-4">
                    <AddressForm
                      form={form}
                      setForm={setForm}
                      onSave={() => updateMutation.mutate()}
                      onCancel={handleCancel}
                      saving={updateMutation.isPending}
                    />
                  </div>
                ) : (
                  <div
                    key={addr.id}
                    className="hover:bg-foreground/[0.04]/40 flex items-center gap-3 px-5 py-3 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-sm font-medium">
                        {addr.first_name} {addr.last_name}
                      </p>
                      <p className="text-muted truncate text-xs">
                        {addr.address_1}
                        {addr.city ? `, ${addr.city}` : ""}
                        {addr.province ? `, ${addr.province}` : ""}
                        {addr.phone ? ` · ${addr.phone}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => startEdit(addr)}
                        className="text-muted hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-border flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        aria-label="Edit address"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => addr.id && deleteMutation.mutate(addr.id)}
                        disabled={deleteMutation.isPending}
                        className="text-muted hover:bg-danger/5 hover:text-danger focus-visible:ring-danger/20 flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        aria-label="Delete address"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            !isFormVisible && (
              <div className="flex flex-col items-center py-8">
                <div className="bg-secondary-light mb-2 flex h-10 w-10 items-center justify-center rounded-full">
                  <MapPin className="text-secondary h-5 w-5" />
                </div>
                <p className="text-foreground text-sm font-medium">No saved addresses</p>
                <p className="text-muted mt-0.5 text-xs">Add one for faster checkout</p>
              </div>
            )
          )}

          {showForm && (
            <div className="border-border/50 border-t px-5 py-4">
              <AddressForm
                form={form}
                setForm={setForm}
                onSave={() => addMutation.mutate()}
                onCancel={handleCancel}
                saving={addMutation.isPending}
              />
            </div>
          )}

          {!isFormVisible && (
            <div className="border-border/50 border-t px-5 py-2.5">
              <button
                onClick={handleAddNew}
                className="text-secondary hover:text-secondary-hover flex items-center gap-1.5 text-sm font-medium transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Add New Address
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

function AddressForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  form: Omit<MedusaAddress, "id">;
  setForm: (f: Omit<MedusaAddress, "id">) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-muted mb-1 block text-sm font-medium">First Name</label>
          <input
            value={form.first_name ?? ""}
            onChange={(e) => update("first_name", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="text-muted mb-1 block text-sm font-medium">Last Name</label>
          <input
            value={form.last_name ?? ""}
            onChange={(e) => update("last_name", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-muted mb-1 block text-sm font-medium">Address Line 1</label>
          <input
            value={form.address_1 ?? ""}
            onChange={(e) => update("address_1", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-muted mb-1 block text-sm font-medium">Address Line 2</label>
          <input
            value={form.address_2 ?? ""}
            onChange={(e) => update("address_2", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="text-muted mb-1 block text-sm font-medium">City</label>
          <input
            value={form.city ?? ""}
            onChange={(e) => update("city", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="text-muted mb-1 block text-sm font-medium">Province</label>
          <input
            value={form.province ?? ""}
            onChange={(e) => update("province", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="text-muted mb-1 block text-sm font-medium">Postal Code</label>
          <input
            value={form.postal_code ?? ""}
            onChange={(e) => update("postal_code", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="text-muted mb-1 block text-sm font-medium">Phone</label>
          <input
            value={form.phone ?? ""}
            onChange={(e) => update("phone", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-foreground hover:bg-foreground/85 rounded-full px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="border-border/50 text-foreground hover:border-border hover:bg-foreground/[0.04] rounded-full border bg-white px-5 py-2 text-sm font-semibold transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Order Item Avatar Stack ──────────────────────────────────────────

function OrderItemAvatars({
  items,
  size = 32,
  max = 4,
  productsById,
}: {
  items?: MedusaLineItem[];
  size?: number;
  max?: number;
  productsById?: Map<string, Awaited<ReturnType<typeof getProductsByIds>>[number]>;
}) {
  if (!items || items.length === 0) return null;

  const visible = items.slice(0, max);
  const overflow = items.length - max;
  const px = `${size}px`;

  return (
    <div className="flex items-center">
      {visible.map((item, i) => {
        const fallback =
          productsById?.get(item.product_id ?? "") ??
          productsById?.get(item.variant?.product?.id ?? "") ??
          null;
        const thumb = resolveOrderItemImage(item, fallback);

        return (
          <div
            key={item.id}
            className="relative shrink-0 rounded-full border-2 border-white"
            style={{
              width: px,
              height: px,
              marginLeft: i === 0 ? 0 : -8,
              zIndex: max - i,
            }}
          >
            {thumb ? (
              <Image
                src={thumb}
                alt={item.title}
                width={size}
                height={size}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <div className="bg-background flex h-full w-full items-center justify-center rounded-full">
                <Package className="text-muted h-3.5 w-3.5" />
              </div>
            )}
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          className="bg-foreground/10 text-foreground text-2xs relative flex shrink-0 items-center justify-center rounded-full border-2 border-white font-bold"
          style={{ width: px, height: px, marginLeft: -8, zIndex: 0 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ── Orders Section (receipt-style with inline accordion) ────────────

function OrdersSection({
  orders,
  isLoading,
  initialExpandedId,
  productsById,
}: {
  orders: MedusaOrder[];
  isLoading: boolean;
  initialExpandedId?: string | null;
  productsById: Map<string, Awaited<ReturnType<typeof getProductsByIds>>[number]>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId ?? null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-border/40 h-14 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="border-border/50 bg-card overflow-hidden rounded-2xl border">
        <div className="flex items-center gap-2 px-5 py-3.5">
          <Package className="text-accent-yellow h-4 w-4" />
          <h2 className="text-foreground text-sm font-semibold">Order History</h2>
        </div>
        <div className="border-border/50 flex flex-col items-center border-t py-10">
          <div className="bg-secondary-light mb-3 flex h-14 w-14 items-center justify-center rounded-full">
            <ShoppingBag className="text-secondary h-6 w-6" />
          </div>
          <p className="text-foreground font-medium">No orders yet</p>
          <p className="text-muted mt-0.5 text-sm">When you place an order, it will appear here</p>
          <Link
            href="/products"
            className="bg-foreground hover:bg-foreground/85 mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition"
          >
            <Baby className="h-4 w-4" />
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border/50 bg-card overflow-hidden rounded-2xl border">
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Package className="text-accent-yellow h-4 w-4" />
          <h2 className="text-foreground text-sm font-semibold">Order History</h2>
        </div>
        <span className="bg-accent-yellow-light text-accent-yellow-ink rounded-full px-2.5 py-1 text-xs font-semibold">
          {orders.length}
        </span>
      </div>

      {/* Column header (desktop) */}
      <div className="border-border/50 bg-background/60 text-muted hidden items-center border-t px-5 py-2.5 text-sm font-semibold sm:flex">
        <span className="w-40">Order</span>
        <span className="flex-1">Items</span>
        <span className="w-24 text-center">Status</span>
        <span className="w-24 text-right">Total</span>
        <span className="ml-4 w-20 text-right">Date</span>
        <span className="ml-2 w-4" />
      </div>

      <div className="divide-border border-border/50 divide-y border-t">
        {orders.map((order) => {
          const isOpen = expandedId === order.id;
          return (
            <div key={order.id}>
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : order.id)}
                className="hover:bg-foreground/[0.04]/50 flex w-full items-center px-5 py-3 text-left transition"
              >
                {/* Desktop row */}
                <div className="hidden flex-1 items-center sm:flex">
                  <div className="w-40">
                    <div className="text-foreground text-sm font-semibold whitespace-nowrap">
                      {formatOrderRef(
                        order.display_id,
                        order.created_at,
                        order.id,
                        order.metadata?.order_ref as string | undefined,
                      )}
                    </div>
                    <div className="text-muted mt-0.5 text-sm">
                      {order.items.length} {order.items.length === 1 ? "item" : "items"}
                    </div>
                  </div>
                  <div className="flex flex-1 items-center">
                    <OrderItemAvatars
                      items={order.items}
                      size={32}
                      max={4}
                      productsById={productsById}
                    />
                  </div>
                  <div className="w-24 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(getOrderSummaryLabel(order))}`}
                    >
                      {getOrderSummaryLabel(order)}
                    </span>
                  </div>
                  <span className="text-foreground w-24 text-right text-sm font-medium">
                    {formatPrice(order.total)}
                  </span>
                  <span className="text-muted ml-4 w-20 text-right text-sm whitespace-nowrap">
                    {new Date(order.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {/* Mobile row */}
                <div className="flex flex-1 flex-col gap-1.5 sm:hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-sm font-semibold whitespace-nowrap">
                      {formatOrderRef(
                        order.display_id,
                        order.created_at,
                        order.id,
                        order.metadata?.order_ref as string | undefined,
                      )}
                    </span>
                    <span className="text-foreground text-sm font-medium">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted text-sm">
                      {new Date(order.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(getOrderSummaryLabel(order))}`}
                    >
                      {getOrderSummaryLabel(order)}
                    </span>
                  </div>
                  <OrderItemAvatars
                    items={order.items}
                    size={28}
                    max={5}
                    productsById={productsById}
                  />
                </div>
                <ChevronDown
                  className={`text-muted ml-2 h-4 w-4 shrink-0 transition-transform duration-200 sm:ml-2 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isOpen && <OrderDetail orderId={order.id} productsById={productsById} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Order Detail (inline accordion content) ─────────────────────────

function OrderDetail({
  orderId,
  productsById,
}: {
  orderId: string;
  productsById: Map<string, Awaited<ReturnType<typeof getProductsByIds>>[number]>;
}) {
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrderById(orderId),
  });
  const detailProductIds = Array.from(
    new Set(
      (order?.items ?? []).flatMap((item) =>
        [item.product_id, item.variant?.product?.id].filter((id): id is string => !!id),
      ),
    ),
  );
  const detailProductsQuery = useQuery({
    queryKey: ["order-detail-products", orderId, detailProductIds],
    queryFn: () => getProductsByIds(detailProductIds),
    enabled: detailProductIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const detailProductsById = new Map(
    (detailProductsQuery.data ?? []).map((product) => [product.id, product]),
  );

  if (isLoading) {
    return (
      <div className="space-y-2 px-5 pb-4">
        <div className="bg-border/40 h-16 animate-pulse rounded-xl" />
        <div className="bg-border/40 h-16 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="border-border/50 bg-background/40 border-t border-dashed px-5 pt-3 pb-4">
      <div className="border-border/50 bg-card mb-3 rounded-xl border border-dashed px-3 py-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-foreground text-sm font-semibold">
              {formatOrderRef(
                order.display_id,
                order.created_at,
                order.id,
                order.metadata?.order_ref as string | undefined,
              )}
            </p>
            <p className="text-muted text-xs">
              Placed{" "}
              {new Date(order.created_at).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="border-border/50 mt-2.5 border-t pt-2.5">
          <OrderJourney order={order} />
        </div>
      </div>

      {/* Items */}
      <div className="divide-border border-border/50 bg-card divide-y overflow-hidden rounded-xl border">
        {order.items.map((item) => {
          const pid = item.product_id ?? item.variant?.product?.id ?? "";
          const fallback = detailProductsById.get(pid) ?? productsById.get(pid) ?? null;
          const thumb = resolveOrderItemImage(item, fallback);

          return (
            <div key={item.id} className="flex gap-3 px-3 py-2.5">
              {thumb ? (
                <Image
                  src={thumb}
                  alt={item.title}
                  width={48}
                  height={48}
                  className="border-border/50 h-12 w-12 shrink-0 rounded-lg border object-cover"
                />
              ) : (
                <div className="border-border/50 bg-background flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border">
                  <Package className="text-muted h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">{item.title}</p>
                <p className="text-muted text-xs">Qty: {item.quantity}</p>
              </div>
              <span className="text-foreground shrink-0 text-sm font-medium">
                {formatPrice(item.total || item.subtotal || item.unit_price * item.quantity)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Shipping address (compact) */}
      {order.shipping_address && (
        <div className="text-muted mt-3 flex items-start gap-2 text-xs">
          <MapPin className="text-secondary mt-0.5 h-3 w-3 shrink-0" />
          <span>
            {order.shipping_address.first_name} {order.shipping_address.last_name},{" "}
            {order.shipping_address.address_1}
            {order.shipping_address.city ? `, ${order.shipping_address.city}` : ""}
          </span>
        </div>
      )}

      {/* Totals */}
      <div className="mt-3 space-y-1 text-xs">
        <div className="text-muted flex justify-between">
          <span>Subtotal</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        <div className="text-muted flex justify-between">
          <span>Shipping</span>
          <span>{order.shipping_total === 0 ? "Free" : formatPrice(order.shipping_total)}</span>
        </div>
        {order.discount_total > 0 && (
          <div className="text-success flex justify-between">
            <span>Discount</span>
            <span>-{formatPrice(order.discount_total)}</span>
          </div>
        )}
        {order.tax_total > 0 && (
          <div className="text-muted flex justify-between">
            <span>Tax</span>
            <span>{formatPrice(order.tax_total)}</span>
          </div>
        )}
        <div className="border-border/50 text-foreground flex justify-between border-t pt-1.5 text-sm font-bold">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>
    </div>
  );
}
