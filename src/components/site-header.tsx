"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  Heart,
  Menu,
  Search,
  Shirt,
  ShoppingBag,
  Smartphone,
  Truck,
  User,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getCart, getCustomer } from "@/lib/medusa-api";
import { freeDeliveryBarLabel } from "@/lib/shipping";

const TRUST_SIGNALS = [
  { icon: Truck, text: freeDeliveryBarLabel() },
  { icon: Smartphone, text: "Pay with M-Pesa" },
  { icon: Shirt, text: "Kids clothing for ages 2–12" },
];

const PRIMARY_NAV = [
  { label: "Shop All", href: "/products" },
  { label: "Girls", href: "/products?audience=girls" },
  { label: "Boys", href: "/products?audience=boys" },
  { label: "New In", href: "/products?sort=newest" },
  { label: "Sale", href: "/products?sale=true" },
] as const;

const AGE_NAV = [
  { label: "2–4 years", href: "/products?age=2-4" },
  { label: "5–8 years", href: "/products?age=5-8" },
  { label: "9–12 years", href: "/products?age=9-12" },
] as const;

const subscribeToClientSnapshot = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [trustIdx, setTrustIdx] = useState(0);
  const hasHydrated = useSyncExternalStore(
    subscribeToClientSnapshot,
    getClientSnapshot,
    getServerSnapshot,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  const pathname = usePathname();
  const headerSearchParams = useSearchParams();
  const currentQuery = headerSearchParams.toString();

  const isDestinationActive = (href: string) => {
    if (pathname !== "/products") return false;
    const query = href.split("?")[1] ?? "";
    return currentQuery === query;
  };

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
  });
  const cartCount =
    cartQuery.data?.items?.reduce(
      (sum: number, item: { quantity: number }) => sum + item.quantity,
      0,
    ) ?? 0;

  const customerQuery = useQuery({
    queryKey: ["customer"],
    queryFn: getCustomer,
    staleTime: 5 * 60 * 1000,
  });
  const isLoggedIn = !!customerQuery.data;
  const isVerified = customerQuery.data?.metadata?.email_verified === true;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?q=${encodeURIComponent(searchQuery.trim())}`;
      setSearchOpen(false);
    }
  };

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (!prev) setTimeout(() => searchInputRef.current?.focus(), 50);
      return !prev;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrustIdx((i) => (i + 1) % TRUST_SIGNALS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const TrustIcon = TRUST_SIGNALS[trustIdx].icon;

  return (
    <header className="bg-card/98 supports-[backdrop-filter]:bg-card/92 sticky top-0 z-50 backdrop-blur-xl">
      {/* Trust bar */}
      <div className="bg-foreground text-white/80">
        <div className="mx-auto flex h-7 max-w-7xl items-center justify-center gap-6 px-4 text-[11px] font-medium tracking-wide sm:px-6 sm:text-xs lg:px-8">
          <div className="flex items-center gap-1.5 sm:hidden">
            <TrustIcon className="h-3 w-3 opacity-60" />
            <span className="transition-opacity duration-300">{TRUST_SIGNALS[trustIdx].text}</span>
          </div>
          <div className="hidden items-center gap-8 sm:flex">
            {TRUST_SIGNALS.map((s) => (
              <div key={s.text} className="flex items-center gap-1.5">
                <s.icon className="h-3 w-3 opacity-50" />
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="border-border/50 border-b">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:gap-5 lg:px-8">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:hidden ${
              mobileOpen ? "bg-foreground text-white" : "text-foreground hover:bg-foreground/[0.04]"
            }`}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span className="hidden sm:inline">{mobileOpen ? "Close" : "Menu"}</span>
          </button>

          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Image
              src="/logo.svg"
              alt="Azani"
              width={320}
              height={100}
              className="h-14 w-auto sm:h-16"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
            <div className="flex items-center gap-0.5">
              {PRIMARY_NAV.slice(0, 3).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition ${
                    isDestinationActive(item.href)
                      ? "bg-foreground/[0.06] text-foreground"
                      : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="group relative">
                <button
                  type="button"
                  className="text-muted hover:bg-foreground/[0.04] hover:text-foreground flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition"
                >
                  Shop by Age
                  <ChevronDown className="h-3 w-3 opacity-50 transition group-focus-within:rotate-180 group-hover:rotate-180" />
                </button>
                <div className="bg-card border-border/50 invisible absolute top-full left-0 z-50 mt-1 w-40 rounded-xl border p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  {AGE_NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-muted hover:bg-foreground/[0.04] hover:text-foreground block rounded-lg px-3 py-2 text-sm transition"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
              {PRIMARY_NAV.slice(3).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition ${
                    isDestinationActive(item.href)
                      ? "bg-foreground/[0.06] text-foreground"
                      : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={toggleSearch}
              aria-label="Search"
              className="text-muted hover:bg-foreground/[0.04] hover:text-foreground hidden h-9 w-9 items-center justify-center rounded-lg transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:inline-flex"
            >
              {searchOpen ? (
                <X className="h-[17px] w-[17px]" />
              ) : (
                <Search className="h-[17px] w-[17px]" />
              )}
            </button>
            <Link
              href={isLoggedIn ? "/account" : "/account/login"}
              aria-label="Account"
              className="text-muted hover:bg-foreground/[0.04] hover:text-foreground relative hidden h-9 w-9 items-center justify-center rounded-lg transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:inline-flex"
            >
              <User className="h-[17px] w-[17px]" />
              {isVerified && (
                <span className="bg-secondary ring-card absolute right-1 bottom-1 h-2 w-2 rounded-full ring-2" />
              )}
            </Link>
            <Link
              href="/account/wishlist"
              aria-label="Wishlist"
              className="text-muted hover:bg-foreground/[0.04] hover:text-foreground hidden h-9 w-9 items-center justify-center rounded-lg transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:inline-flex"
            >
              <Heart className="h-[17px] w-[17px]" />
            </Link>
            <Link
              href="/cart"
              aria-label="Cart"
              className="bg-foreground hover:bg-foreground/90 relative ml-1 inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cart</span>
              {hasHydrated && cartCount > 0 && (
                <span className="bg-primary flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div className="bg-card/98 border-border/40 border-t backdrop-blur-xl">
          <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
            <form onSubmit={handleSearch} className="relative">
              <Search className="text-muted absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="border-border/60 bg-background placeholder:text-muted-light focus:border-secondary focus:ring-secondary/10 h-11 w-full rounded-xl border pr-4 pl-10 text-sm transition outline-none focus:ring-2"
              />
            </form>
          </div>
        </div>
      )}

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="bg-card/98 border-border/40 border-t backdrop-blur-xl lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search className="text-muted absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="border-border/60 bg-background placeholder:text-muted-light focus:border-secondary focus:ring-secondary/10 h-10 w-full rounded-xl border pr-4 pl-10 text-sm transition outline-none focus:ring-2"
                />
              </div>
            </form>

            <div className="space-y-0.5">
              {PRIMARY_NAV.slice(0, 3).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-foreground hover:bg-foreground/[0.04] block rounded-lg px-3 py-2.5 text-sm font-semibold transition"
                >
                  {item.label}
                </Link>
              ))}
              <p className="text-muted px-3 pt-3 pb-1 text-xs font-semibold tracking-wide uppercase">
                Shop by Age
              </p>
              <div className="ml-3 space-y-0.5">
                {AGE_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-muted hover:text-foreground block rounded-lg px-3 py-2 text-sm transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              {PRIMARY_NAV.slice(3).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-foreground hover:bg-foreground/[0.04] block rounded-lg px-3 py-2.5 text-sm font-semibold transition"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="border-border/40 mt-2 border-t pt-2">
              <Link
                href="/account/wishlist"
                onClick={() => setMobileOpen(false)}
                className="text-muted hover:text-foreground hover:bg-foreground/[0.04] flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition"
              >
                <Heart className="h-4 w-4" />
                Wishlist
              </Link>
              <Link
                href={isLoggedIn ? "/account" : "/account/login"}
                onClick={() => setMobileOpen(false)}
                className="text-muted hover:text-foreground hover:bg-foreground/[0.04] flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition"
              >
                <User className="h-4 w-4" />
                Account
                {isVerified && (
                  <span className="bg-secondary-light text-secondary ml-auto rounded-full px-2 py-0.5 text-xs font-medium">
                    Verified
                  </span>
                )}
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
