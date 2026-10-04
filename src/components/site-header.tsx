"use client";

import Link from "next/link";
import { ShopNavIcon } from "@/components/shop-nav-icon";
import { EnamelUtilityIcon } from "@/components/enamel-utility-icon";
import { BrandLogo } from "@/components/brand-logo";
import { ChevronDown, Menu, Search, Shirt, Smartphone, Truck, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useCallback, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getProducts, getCart, getCustomer } from "@/lib/medusa-api";
import { freeDeliveryBarLabel } from "@/lib/shipping";

const TRUST_SIGNALS = [
  { icon: Truck, text: freeDeliveryBarLabel() },
  { icon: Smartphone, text: "Pay with M-Pesa" },
  { icon: Shirt, text: "Kids clothing for ages 2–12" },
];

const PRIMARY_NAV = [
  { label: "Shop All", icon: "shop", href: "/products" },
  { label: "Girls", icon: "girls", href: "/products?audience=girls" },
  { label: "Boys", icon: "boys", href: "/products?audience=boys" },
  { label: "New In", icon: "new", href: "/products?sort=newest" },
  { label: "Sale", icon: "sale", href: "/products?sale=true" },
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
  const [ageOpen, setAgeOpen] = useState(false);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const ageButtonRef = useRef<HTMLButtonElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const offersQuery = useQuery({
    queryKey: ["active-offers"],
    queryFn: () => getProducts({ sale: true, limit: 1 }),
    staleTime: 5 * 60 * 1000,
  });
  const primaryNav = PRIMARY_NAV.filter(
    (entry) => entry.label !== "Sale" || (offersQuery.data?.count ?? 0) > 0,
  );

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
    setMobileOpen(false);
    setAgeOpen(false);
    setSearchOpen((prev) => {
      if (!prev) setTimeout(() => searchInputRef.current?.focus(), 50);
      return !prev;
    });
  }, []);

  const TrustIcon = Shirt;

  return (
    <header
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (searchOpen) {
          setSearchOpen(false);
          searchButtonRef.current?.focus();
        }
        if (mobileOpen) {
          setMobileOpen(false);
          menuButtonRef.current?.focus();
        }
        if (ageOpen) {
          setAgeOpen(false);
          ageButtonRef.current?.focus();
        }
      }}
      className="bg-card/98 supports-[backdrop-filter]:bg-card/92 sticky top-0 z-50 backdrop-blur-xl"
    >
      {/* Trust bar */}
      <div className="bg-accent-yellow-light text-foreground">
        <div className="mx-auto flex h-7 max-w-7xl items-center justify-center gap-6 px-4 text-xs font-medium tracking-wide sm:px-6 sm:text-xs lg:px-8">
          <div className="flex items-center gap-1.5 sm:hidden">
            <TrustIcon className="h-3 w-3 opacity-60" />
            <span className="transition-opacity duration-300">Kids clothing · Ages 2–12</span>
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
        <div className="mx-auto grid h-20 w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 sm:h-24 sm:px-6 lg:flex lg:gap-5 lg:px-8">
          <button
            ref={menuButtonRef}
            onClick={() => {
              setSearchOpen(false);
              setMobileOpen(!mobileOpen);
            }}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className={`inline-flex h-11 w-11 items-center justify-center justify-self-start rounded-lg transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:hidden ${
              mobileOpen ? "bg-foreground text-white" : "text-foreground hover:bg-foreground/[0.04]"
            }`}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link href="/" className="shrink-0 justify-self-center">
            <BrandLogo />
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden min-w-0 flex-1 items-center justify-center lg:flex"
            aria-label="Main navigation"
          >
            <div className="flex items-center gap-0.5">
              {primaryNav.slice(0, 3).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isDestinationActive(item.href) ? "page" : undefined}
                  className={`flex min-w-[66px] flex-col items-center gap-1 rounded-xl px-2.5 py-2 text-[13px] font-semibold whitespace-nowrap transition ${
                    isDestinationActive(item.href)
                      ? "bg-foreground/[0.06] text-foreground"
                      : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
                  }`}
                >
                  <ShopNavIcon name={item.icon} className="h-9 w-9" />
                  {item.label}
                </Link>
              ))}
              <div className="relative">
                <button
                  type="button"
                  ref={ageButtonRef}
                  aria-expanded={ageOpen}
                  aria-controls="age-navigation"
                  onClick={() => {
                    setSearchOpen(false);
                    setAgeOpen(!ageOpen);
                  }}
                  className="text-muted hover:bg-foreground/[0.04] hover:text-foreground flex flex-col items-center gap-1 rounded-xl px-2.5 py-2 text-[13px] font-semibold whitespace-nowrap transition"
                >
                  <ShopNavIcon name="age" className="h-9 w-9" />
                  <span className="flex items-center gap-1">
                    Shop by Age
                    <ChevronDown className={`h-3 w-3 transition ${ageOpen ? "rotate-180" : ""}`} />
                  </span>
                </button>
                <div
                  id="age-navigation"
                  hidden={!ageOpen}
                  className="bg-card border-border absolute top-full left-0 z-50 mt-1 w-44 rounded-xl border p-2 shadow-lg"
                >
                  {AGE_NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setAgeOpen(false)}
                      className="text-muted hover:bg-foreground/[0.04] hover:text-foreground flex min-h-11 items-center rounded-lg px-3 py-2 text-sm transition"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
              {primaryNav.slice(3).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isDestinationActive(item.href) ? "page" : undefined}
                  className={`flex min-w-[66px] flex-col items-center gap-1 rounded-xl px-2.5 py-2 text-[13px] font-semibold whitespace-nowrap transition ${
                    isDestinationActive(item.href)
                      ? "bg-foreground/[0.06] text-foreground"
                      : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
                  }`}
                >
                  <ShopNavIcon name={item.icon} className="h-9 w-9" />
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 justify-self-end lg:ml-auto lg:gap-1.5">
            <button
              ref={searchButtonRef}
              onClick={toggleSearch}
              aria-label={searchOpen ? "Close search" : "Search"}
              aria-expanded={searchOpen}
              aria-controls="store-search"
              className="border-border/50 bg-background text-foreground hover:bg-primary-light/50 inline-flex h-11 w-11 items-center justify-center rounded-xl border transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {searchOpen ? (
                <X className="h-[17px] w-[17px]" />
              ) : (
                <EnamelUtilityIcon name="search" />
              )}
            </button>
            <Link
              href={isLoggedIn ? "/account" : "/account/login"}
              aria-label="Account"
              className="border-border/50 bg-background text-foreground hover:bg-primary-light/50 relative hidden h-11 w-11 items-center justify-center rounded-xl border transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:inline-flex"
            >
              <EnamelUtilityIcon name="account" />
              {isVerified && (
                <span className="bg-secondary ring-card absolute right-1 bottom-1 h-2 w-2 rounded-full ring-2" />
              )}
            </Link>
            <Link
              href="/account/wishlist"
              aria-label="Wishlist"
              className="border-border/50 bg-background text-foreground hover:bg-primary-light/50 hidden h-11 w-11 items-center justify-center rounded-xl border transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:inline-flex"
            >
              <EnamelUtilityIcon name="wishlist" />
            </Link>
            <Link
              href="/cart"
              aria-label="Cart"
              className="border-secondary/20 bg-secondary-light text-foreground hover:bg-secondary/15 relative inline-flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border text-[13px] font-semibold transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:ml-1 lg:w-auto lg:px-3"
            >
              <EnamelUtilityIcon name="cart" />
              <span className="hidden lg:inline">Cart</span>
              {hasHydrated && cartCount > 0 && (
                <span className="bg-primary absolute top-0.5 right-0 flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white lg:static">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div id="store-search" className="bg-card/98 border-border/40 border-t backdrop-blur-xl">
          <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
            <form onSubmit={handleSearch} className="relative">
              <Search className="text-muted absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search clothing"
                placeholder="Search clothing, colours, styles…"
                className="border-border/60 bg-background placeholder:text-muted-light focus:border-secondary focus:ring-secondary/10 h-11 w-full rounded-xl border pr-4 pl-10 text-sm transition outline-none focus:ring-2"
              />
            </form>
          </div>
        </div>
      )}

      {/* Mobile nav */}
      {mobileOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="bg-card/98 border-border/40 max-h-[calc(100dvh-7rem)] overflow-y-auto border-t backdrop-blur-xl lg:hidden"
        >
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search className="text-muted absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search clothing"
                  placeholder="Search clothing, colours, styles…"
                  className="border-border/60 bg-background placeholder:text-muted-light focus:border-secondary focus:ring-secondary/10 h-10 w-full rounded-xl border pr-4 pl-10 text-sm transition outline-none focus:ring-2"
                />
              </div>
            </form>

            <div className="space-y-0.5">
              {primaryNav.slice(0, 3).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-foreground hover:bg-foreground/[0.04] flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition"
                >
                  <ShopNavIcon name={item.icon} className="h-9 w-9" />
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
                    className="text-muted hover:text-foreground flex min-h-11 items-center rounded-lg px-3 py-2 text-sm transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              {primaryNav.slice(3).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-foreground hover:bg-foreground/[0.04] flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition"
                >
                  <ShopNavIcon name={item.icon} className="h-9 w-9" />
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
                <EnamelUtilityIcon name="wishlist" size={24} />
                Wishlist
              </Link>
              <Link
                href={isLoggedIn ? "/account" : "/account/login"}
                onClick={() => setMobileOpen(false)}
                className="text-muted hover:text-foreground hover:bg-foreground/[0.04] flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition"
              >
                <EnamelUtilityIcon name="account" size={24} />
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
