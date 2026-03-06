"use client";

import { useState } from "react";
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
} from "@/lib/medusa-api";
import { clearAuthToken } from "@/lib/http";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/formatters";
import { MedusaAddress } from "@/types/medusa";
import {
  User,
  MapPin,
  Package,
  LogOut,
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  ArrowLeft,
  Phone,
  ShoppingBag,
  Baby,
  Clock,
  Heart,
} from "lucide-react";

type Section = "profile" | "orders";

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
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
    case "archived":
      return "bg-accent-green-light text-success";
    case "pending":
    case "requires_action":
      return "bg-accent-yellow-light text-accent-yellow";
    case "canceled":
      return "bg-danger/10 text-danger";
    default:
      return "bg-primary/10 text-primary";
  }
}

export default function AccountPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6" role="status" aria-label="Loading">
        <span className="sr-only">Loading...</span>
        {/* Welcome header skeleton */}
        <div className="mb-8 flex items-center gap-4">
          <div className="h-14 w-14 animate-pulse rounded-full bg-border/40" />
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded-lg bg-border/40" />
            <div className="h-4 w-28 animate-pulse rounded-lg bg-border/40" />
          </div>
        </div>
        {/* Grid skeleton */}
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <div className="h-64 animate-pulse rounded-2xl bg-border/40" />
          <div className="space-y-6">
            <div className="h-48 animate-pulse rounded-2xl bg-border/40" />
            <div className="h-48 animate-pulse rounded-2xl bg-border/40" />
          </div>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const initials =
    ((customer.first_name?.[0] ?? "") + (customer.last_name?.[0] ?? "")).toUpperCase() || "?";
  const latestOrder = orders?.length
    ? [...orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0]
    : null;

  const navItems: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
    { key: "orders", label: "Orders", icon: <Package className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mb-8 overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-primary-light via-card to-secondary-light p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-xl font-bold text-primary shadow-sm">
              {initials}
            </div>
            <div>
              <p className="mb-1 inline-flex rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                My Account
              </p>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                Welcome back, {customer.first_name || "there"}!
              </h1>
              <p className="mt-1 text-sm text-muted">{customer.email}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Saved Addresses
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {addresses?.length ?? 0} {addresses?.length === 1 ? "address" : "addresses"} ready for checkout
              </p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Latest Order
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {latestOrder
                  ? `Order #${latestOrder.display_id} on ${new Date(latestOrder.created_at).toLocaleDateString()}`
                  : "No orders yet"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Sidebar Navigation */}
        <nav>
          {/* Desktop sidebar */}
          <div className="hidden lg:block rounded-3xl border border-border bg-card p-3 shadow-sm">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setActiveSection(item.key);
                  setSelectedOrderId(null);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${
                  activeSection === item.key
                    ? "border-l-[3px] border-primary bg-primary-light text-primary"
                    : "border-l-[3px] border-transparent text-muted hover:bg-background"
                }`}
              >
                {item.icon}
                {item.label}
                {activeSection === item.key && (
                  <ChevronRight className="ml-auto h-4 w-4" />
                )}
              </button>
            ))}
            <div className="my-2 border-t border-border" />
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-muted transition hover:bg-danger/5 hover:text-danger border-l-[3px] border-transparent"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>

          {/* Mobile horizontal pills */}
          <div className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2 lg:hidden">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setActiveSection(item.key);
                  setSelectedOrderId(null);
                }}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeSection === item.key
                    ? "bg-primary text-white"
                    : "border border-border bg-card text-muted"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <button
              onClick={handleSignOut}
              className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted transition hover:bg-danger/5 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </nav>

        {/* Right content */}
        <div className="min-w-0 flex-1">
          {activeSection === "profile" && <ProfileSection customer={customer} />}
          {activeSection === "orders" && !selectedOrderId && (
            <OrdersSection onSelectOrder={setSelectedOrderId} />
          )}
          {activeSection === "orders" && selectedOrderId && (
            <OrderDetailSection
              orderId={selectedOrderId}
              onBack={() => setSelectedOrderId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Profile Section (includes addresses) ───────────────────────────

function ProfileSection({
  customer,
}: {
  customer: NonNullable<Awaited<ReturnType<typeof getCustomer>>>;
}) {
  const { data: addresses } = useQuery({
    queryKey: ["addresses"],
    queryFn: getCustomerAddresses,
  });
  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
  });
  const latestOrder = orders?.length
    ? [...orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0]
    : null;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Account Overview</h2>
              <p className="text-sm text-muted">Everything important about your account at a glance.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-background px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Orders</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{orders?.length ?? 0}</p>
              <p className="mt-1 text-sm text-muted">Placed through your account</p>
            </div>
            <div className="rounded-2xl bg-background px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Addresses</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{addresses?.length ?? 0}</p>
              <p className="mt-1 text-sm text-muted">Saved for faster checkout</p>
            </div>
            <div className="rounded-2xl bg-background px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Latest Order</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {latestOrder ? `#${latestOrder.display_id}` : "No orders"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {latestOrder ? new Date(latestOrder.created_at).toLocaleDateString() : "Start shopping to see orders here"}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary-light text-secondary">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
              <p className="text-sm text-muted">Jump back into the parts of the shop you use most.</p>
            </div>
          </div>
          <div className="space-y-3">
            <Link
              href="/products"
              className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary hover:bg-primary-light/40"
            >
              Continue Shopping
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
            <Link
              href="/account/wishlist"
              className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary hover:bg-primary-light/40"
            >
              Open Wishlist
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
              className="flex w-full items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary hover:bg-primary-light/40"
            >
              Manage Addresses
              <ChevronRight className="h-4 w-4 text-muted" />
            </button>
          </div>
        </div>
      </div>
      <ProfileDetails customer={customer} />
      <AddressesSection />
    </div>
  );
}

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
    mutationFn: () =>
      updateCustomer({ first_name: firstName, last_name: lastName, phone }),
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
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Personal Information
            </h2>
            <p className="text-sm text-muted">Keep your contact information current for smoother checkout.</p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-primary hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                First Name
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Last Name
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Email
            </label>
            <div className="flex h-10 items-center rounded-lg bg-background/50 px-3 text-sm text-muted">
              {customer.email}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Phone
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          {mutation.isError && (
            <p className="text-sm text-red-500">
              Failed to update profile. Please try again.
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted/10"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl bg-background px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Name
            </p>
            <p className="text-sm font-medium text-foreground">
              {customer.first_name} {customer.last_name}
            </p>
          </div>
          <div className="rounded-2xl bg-background px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Email
            </p>
            <p className="text-sm font-medium text-foreground">
              {customer.email}
            </p>
          </div>
          <div className="rounded-2xl bg-background px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Phone
            </p>
            <p className="text-sm font-medium text-foreground">
              {customer.phone || "Not set"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Addresses Section ──────────────────────────────────────────────

function AddressesSection() {
  const queryClient = useQueryClient();
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
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_ADDRESS);
  };

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-2xl bg-border/40" />;
  }

  const isFormVisible = showForm || editingId !== null;

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-secondary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Delivery Addresses
            </h2>
            <p className="text-sm text-muted">Save multiple addresses so checkout takes only a few taps.</p>
          </div>
        </div>
        {!isFormVisible && (
          <button
            onClick={() => {
              setShowForm(true);
              setForm(EMPTY_ADDRESS);
            }}
            className="flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/15"
          >
            <Plus className="h-3.5 w-3.5" />
            Add New
          </button>
        )}
      </div>

      <div className="space-y-4">
        {addresses && addresses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((addr) =>
              editingId === addr.id ? (
                <div key={addr.id} className="sm:col-span-2">
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
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-light">
                      <MapPin className="h-5 w-5 text-secondary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {addr.first_name} {addr.last_name}
                      </p>
                      <p className="text-sm text-muted">
                        {addr.address_1}
                        {addr.address_2 ? `, ${addr.address_2}` : ""}
                      </p>
                      <p className="text-sm text-muted">
                        {addr.city}
                        {addr.province ? `, ${addr.province}` : ""}{" "}
                        {addr.postal_code}
                      </p>
                      {addr.phone && (
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                          <Phone className="h-3.5 w-3.5" />
                          {addr.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => startEdit(addr)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-background hover:text-primary"
                        aria-label="Edit address"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(addr.id!)}
                        disabled={deleteMutation.isPending}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-danger/5 hover:text-danger"
                        aria-label="Delete address"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          !isFormVisible && (
            <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-border py-10">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-light">
                <MapPin className="h-6 w-6 text-secondary" />
              </div>
              <p className="font-medium text-foreground">No saved addresses</p>
              <p className="mt-1 text-sm text-muted">
                Add a delivery address for faster checkout
              </p>
              <button
                onClick={() => {
                  setShowForm(true);
                  setForm(EMPTY_ADDRESS);
                }}
                className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                Add Address
              </button>
            </div>
          )
        )}

        {showForm && (
          <AddressForm
            form={form}
            setForm={setForm}
            onSave={() => addMutation.mutate()}
            onCancel={handleCancel}
            saving={addMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

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
  const update = (field: string, value: string) =>
    setForm({ ...form, [field]: value });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            First Name
          </label>
          <input
            value={form.first_name ?? ""}
            onChange={(e) => update("first_name", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Last Name
          </label>
          <input
            value={form.last_name ?? ""}
            onChange={(e) => update("last_name", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Address Line 1
          </label>
          <input
            value={form.address_1 ?? ""}
            onChange={(e) => update("address_1", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Address Line 2
          </label>
          <input
            value={form.address_2 ?? ""}
            onChange={(e) => update("address_2", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            City
          </label>
          <input
            value={form.city ?? ""}
            onChange={(e) => update("city", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Province
          </label>
          <input
            value={form.province ?? ""}
            onChange={(e) => update("province", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Postal Code
          </label>
          <input
            value={form.postal_code ?? ""}
            onChange={(e) => update("postal_code", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Phone
          </label>
          <input
            value={form.phone ?? ""}
            onChange={(e) => update("phone", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Orders Section ─────────────────────────────────────────────────

function OrdersSection({
  onSelectOrder,
}: {
  onSelectOrder: (id: string) => void;
}) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-border/40" />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col items-center py-8">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No orders yet
          </h3>
          <p className="mt-1 text-sm text-muted">
            When you place an order, it will appear here
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <Baby className="h-4 w-4" />
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border bg-background/70 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Order History</h2>
          <p className="text-sm text-muted">Newest orders appear first.</p>
        </div>
        <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
          {sortedOrders.length} {sortedOrders.length === 1 ? "order" : "orders"}
        </span>
      </div>
      {/* Desktop header */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr_40px] gap-4 bg-background px-6 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Order #
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Date
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Status
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted text-right">
          Total
        </span>
        <span />
      </div>

      <div className="divide-y divide-border">
        {sortedOrders.map((order) => (
          <button
            key={order.id}
            onClick={() => onSelectOrder(order.id)}
            className="block w-full text-left transition hover:bg-background/50"
          >
            {/* Desktop row */}
            <div className="hidden sm:grid sm:grid-cols-[1.1fr_1fr_1fr_1fr_40px] gap-4 items-center px-6 py-4">
              <span className="text-sm font-medium text-foreground">
                Order #{order.display_id}
              </span>
              <span className="text-sm text-muted">
                {new Date(order.created_at).toLocaleDateString()}
              </span>
              <span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
                >
                  {order.status}
                </span>
              </span>
              <span className="text-sm font-medium text-foreground text-right">
                {formatPrice(order.total)}
              </span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </div>
            {/* Mobile row */}
            <div className="flex flex-col gap-2 px-5 py-4 sm:hidden">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Order #{order.display_id}
                </span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
                >
                  {order.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Order Detail Section (inline) ──────────────────────────────────

function OrderDetailSection({
  orderId,
  onBack,
}: {
  orderId: string;
  onBack: () => void;
}) {
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrderById(orderId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-border/40" />
        ))}
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </button>

      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-foreground">
                Order #{order.display_id}
              </h2>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(order.status)}`}
              >
                {order.status}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <Clock className="h-3.5 w-3.5" />
              {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Items
        </h3>
        <div className="divide-y divide-border">
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-4 py-3">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="h-16 w-16 rounded-xl border border-border object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-background">
                  <Package className="h-6 w-6 text-muted" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-sm text-muted">Qty: {item.quantity}</p>
              </div>
              <p className="text-sm font-medium text-foreground">
                {formatPrice(item.total)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Address */}
      {order.shipping_address && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-secondary" />
            <h3 className="font-semibold text-foreground">Shipping Address</h3>
          </div>
          <div className="rounded-xl bg-background p-4">
            <p className="text-sm font-medium text-foreground">
              {order.shipping_address.first_name}{" "}
              {order.shipping_address.last_name}
            </p>
            <p className="text-sm text-muted">
              {order.shipping_address.address_1}
            </p>
            {order.shipping_address.address_2 && (
              <p className="text-sm text-muted">
                {order.shipping_address.address_2}
              </p>
            )}
            <p className="text-sm text-muted">
              {order.shipping_address.city}
              {order.shipping_address.province
                ? `, ${order.shipping_address.province}`
                : ""}{" "}
              {order.shipping_address.postal_code}
            </p>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 font-semibold text-foreground">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span className="text-foreground">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Shipping</span>
            <span className="text-foreground">
              {formatPrice(order.shipping_total)}
            </span>
          </div>
          {order.discount_total > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Discount</span>
              <span className="text-success">
                -{formatPrice(order.discount_total)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted">Tax</span>
            <span className="text-foreground">
              {formatPrice(order.tax_total)}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-bold text-foreground">Total</span>
            <span className="font-bold text-primary">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
