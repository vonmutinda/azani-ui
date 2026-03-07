"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  Truck,
  User,
  X,
  Shield,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getCart, getCategories, getCustomer } from "@/lib/medusa-api";
import {
  KokobCategory,
  toKokobCategory,
  TOP_LEVEL_HANDLES,
  resolveToMainAndSub,
} from "@/lib/categories";
import { CategoryIcon } from "@/components/category-icon";

const TRUST_SIGNALS = [
  { icon: Truck, text: "Free delivery over Br5,000" },
  { icon: Shield, text: "Safe & certified products" },
];

function MegaMenu({ category, onClose }: { category: KokobCategory; onClose: () => void }) {
  const children = category.children ?? [];
  return (
    <div className="border-border absolute top-full left-0 z-50 w-full border-b bg-white shadow-lg">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {children.map((sub) => (
          <div key={sub.slug}>
            <Link
              href={`/products?category=${sub.slug}`}
              onClick={onClose}
              className="text-foreground hover:text-secondary mb-2 flex items-center gap-2 text-sm font-semibold transition"
            >
              <CategoryIcon icon={sub.icon} size={16} colored />
              {sub.name}
            </Link>
            {sub.children && sub.children.length > 0 && (
              <ul className="space-y-0.5">
                {sub.children.map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={`/products?category=${child.slug}`}
                      onClick={onClose}
                      className="text-muted hover:bg-background hover:text-foreground block rounded-lg px-2 py-1.5 text-xs transition"
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const [trustIdx, setTrustIdx] = useState(0);
  const megaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const pathname = usePathname();
  const headerSearchParams = useSearchParams();
  const currentCategorySlug = headerSearchParams.get("category") ?? undefined;
  const isProductsPage = pathname === "/products";

  const categoriesQuery = useQuery({
    queryKey: ["categories-nav"],
    queryFn: () => getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const topCategories: KokobCategory[] = (categoriesQuery.data?.product_categories ?? [])
    .filter((c) => !c.parent_category_id && TOP_LEVEL_HANDLES.includes(c.handle))
    .map(toKokobCategory);

  const activeMainSlug: string | undefined = (() => {
    if (!isProductsPage || !currentCategorySlug) return undefined;
    const resolved = resolveToMainAndSub(currentCategorySlug, topCategories);
    return resolved?.main;
  })();

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

  const openMega = (slug: string) => {
    if (megaTimeout.current) clearTimeout(megaTimeout.current);
    setActiveMega(slug);
  };

  const closeMega = () => {
    megaTimeout.current = setTimeout(() => setActiveMega(null), 200);
  };

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (!prev) setTimeout(() => searchInputRef.current?.focus(), 50);
      return !prev;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (megaTimeout.current) clearTimeout(megaTimeout.current);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrustIdx((i) => (i + 1) % TRUST_SIGNALS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const activeCategory = topCategories.find((c) => c.slug === activeMega);
  const TrustIcon = TRUST_SIGNALS[trustIdx].icon;

  return (
    <header className="sticky top-0 z-50 bg-white">
      {/* Announcement / trust bar */}
      <div className="bg-foreground text-white">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-center gap-6 px-4 text-[11px] font-medium tracking-wide sm:px-6 lg:px-8">
          {/* Mobile: rotating single signal */}
          <div className="flex items-center gap-1.5 sm:hidden">
            <TrustIcon className="h-3 w-3 opacity-70" />
            <span className="transition-opacity duration-300">{TRUST_SIGNALS[trustIdx].text}</span>
          </div>
          {/* Desktop: show all signals */}
          <div className="hidden items-center gap-6 sm:flex">
            {TRUST_SIGNALS.map((s) => (
              <div key={s.text} className="flex items-center gap-1.5">
                <s.icon className="h-3 w-3 opacity-60" />
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main header row: logo | nav | actions */}
      <div className="border-border border-b">
        <div className="mx-auto flex h-[84px] w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Image
              src="/logo.png"
              alt="Kokob Baby Shop"
              width={288}
              height={96}
              className="h-20 w-auto"
              priority
            />
          </Link>

          {/* Desktop nav — centered */}
          <nav className="hide-scrollbar hidden flex-1 items-center justify-center overflow-x-auto lg:flex">
            <div className="flex items-center whitespace-nowrap">
              <Link
                href="/products"
                className={`relative px-3 py-2 text-[13px] font-medium whitespace-nowrap transition ${
                  isProductsPage && !currentCategorySlug
                    ? "text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                All Products
                {isProductsPage && !currentCategorySlug && (
                  <span className="bg-secondary absolute right-3 bottom-0 left-3 h-[2px] rounded-full" />
                )}
              </Link>
              {topCategories.map((cat) => {
                const isNavActive = activeMainSlug === cat.slug;
                return (
                  <div
                    key={cat.slug}
                    className="relative"
                    onMouseEnter={() => openMega(cat.slug)}
                    onMouseLeave={closeMega}
                  >
                    <Link
                      href={`/products?category=${cat.slug}`}
                      className={`relative flex items-center gap-1 px-3 py-2 text-[13px] font-medium whitespace-nowrap transition ${
                        activeMega === cat.slug || isNavActive
                          ? "text-foreground"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {cat.name}
                      <ChevronDown
                        className={`h-3 w-3 shrink-0 transition-transform ${activeMega === cat.slug ? "rotate-180" : ""}`}
                      />
                      {isNavActive && (
                        <span className="bg-secondary absolute right-3 bottom-0 left-3 h-[2px] rounded-full" />
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={toggleSearch}
              aria-label="Search"
              className="text-muted hover:text-foreground focus-visible:ring-border relative rounded-full p-2.5 transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {searchOpen ? (
                <X className="h-[18px] w-[18px]" />
              ) : (
                <Search className="h-[18px] w-[18px]" />
              )}
            </button>
            <Link
              href={isLoggedIn ? "/account" : "/account/login"}
              aria-label="Account"
              className="text-muted hover:text-foreground focus-visible:ring-border relative hidden rounded-full p-2.5 transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:inline-flex"
            >
              <User className="h-[18px] w-[18px]" />
              {isVerified && (
                <span className="bg-secondary absolute right-1.5 bottom-1.5 h-2 w-2 rounded-full ring-2 ring-white" />
              )}
            </Link>
            <Link
              href="/account/wishlist"
              aria-label="Wishlist"
              className="text-muted hover:text-foreground focus-visible:ring-border hidden rounded-full p-2.5 transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:inline-flex"
            >
              <Heart className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/cart"
              aria-label="Cart"
              className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 relative ml-1 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="bg-primary flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
              className="text-muted hover:text-foreground focus-visible:ring-border ml-1 rounded-full p-2.5 transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mega menu */}
      {activeCategory && (
        <div
          className="relative hidden lg:block"
          onMouseEnter={() => openMega(activeCategory.slug)}
          onMouseLeave={closeMega}
        >
          <MegaMenu category={activeCategory} onClose={() => setActiveMega(null)} />
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && (
        <div className="border-border border-b bg-white">
          <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
            <form onSubmit={handleSearch} className="relative">
              <Search className="text-muted absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What are you looking for?"
                className="border-border bg-background placeholder:text-muted-light focus:border-secondary focus:ring-secondary/15 h-12 w-full rounded-2xl border pr-4 pl-11 text-sm transition outline-none focus:ring-2"
              />
            </form>
          </div>
        </div>
      )}

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-border border-b bg-white lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            {/* Mobile search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="text-muted absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="border-border bg-background placeholder:text-muted-light focus:border-secondary focus:ring-secondary/15 h-11 w-full rounded-xl border pr-4 pl-10 text-sm transition outline-none focus:ring-2"
                />
              </div>
            </form>

            <div className="space-y-0.5">
              <Link
                href="/products"
                onClick={() => setMobileOpen(false)}
                className="text-foreground hover:bg-background block rounded-xl px-3 py-2.5 text-sm font-semibold transition"
              >
                All Products
              </Link>
              {topCategories.map((cat) => (
                <div key={cat.slug}>
                  <Link
                    href={`/products?category=${cat.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="text-foreground hover:bg-background flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition"
                  >
                    <CategoryIcon icon={cat.icon} size={16} colored />
                    {cat.name}
                  </Link>
                  {cat.children && (
                    <div className="ml-8 space-y-0.5">
                      {cat.children.slice(0, 5).map((sub) => (
                        <Link
                          key={sub.slug}
                          href={`/products?category=${sub.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className="text-muted hover:bg-background hover:text-foreground block rounded-lg px-3 py-1.5 text-xs transition"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-border mt-3 border-t pt-3">
              <Link
                href="/account/wishlist"
                onClick={() => setMobileOpen(false)}
                className="text-muted hover:bg-background hover:text-foreground flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition"
              >
                <Heart className="h-4 w-4" />
                Wishlist
              </Link>
              <Link
                href={isLoggedIn ? "/account" : "/account/login"}
                onClick={() => setMobileOpen(false)}
                className="text-muted hover:bg-background hover:text-foreground flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition"
              >
                <User className="h-4 w-4" />
                Account
                {isVerified && (
                  <span className="bg-secondary-light text-secondary ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
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
