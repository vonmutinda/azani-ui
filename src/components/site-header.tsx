"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  Heart,
  LayoutGrid,
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
  { icon: Truck, text: "Free delivery over Br10,000" },
  { icon: Shield, text: "Safe & certified products" },
];

function MegaMenu({ category, onClose }: { category: KokobCategory; onClose: () => void }) {
  const children = category.children ?? [];
  return (
    <div className="absolute inset-x-0 top-full z-50 hidden lg:block">
      <div className="bg-card/98 border-border/40 border-t shadow-xl backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8">
          <p className="text-foreground mb-4 text-base font-semibold">{category.name}</p>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {children.map((sub) => (
              <div key={sub.slug}>
                <Link
                  href={`/products?category=${sub.slug}`}
                  onClick={onClose}
                  className="text-foreground hover:text-secondary mb-2 flex items-center gap-2 text-sm font-semibold transition"
                >
                  <CategoryIcon icon={sub.icon} size={15} colored />
                  {sub.name}
                </Link>
                {sub.children && sub.children.length > 0 && (
                  <ul className="space-y-0.5">
                    {sub.children.map((child) => (
                      <li key={child.slug}>
                        <Link
                          href={`/products?category=${child.slug}`}
                          onClick={onClose}
                          className="text-muted hover:text-foreground block py-1.5 text-sm transition"
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
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Image
              src="/logo.png"
              alt="Kokob Baby Shop"
              width={288}
              height={96}
              className="h-14 w-auto sm:h-16 lg:h-[68px]"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
            <div className="flex items-center gap-0.5">
              <Link
                href="/products"
                aria-label="All Products"
                title="All Products"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  isProductsPage && !currentCategorySlug
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-[15px] w-[15px]" />
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
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition ${
                        activeMega === cat.slug || isNavActive
                          ? "bg-foreground/[0.06] text-foreground"
                          : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
                      }`}
                    >
                      {cat.name}
                      <ChevronDown
                        className={`h-3 w-3 shrink-0 opacity-50 transition-transform ${activeMega === cat.slug ? "rotate-180" : ""}`}
                      />
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
              {cartCount > 0 && (
                <span className="bg-primary flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
              className={`ml-1 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:hidden ${
                mobileOpen
                  ? "bg-foreground text-white"
                  : "text-foreground hover:bg-foreground/[0.04]"
              }`}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              <span className="hidden sm:inline">{mobileOpen ? "Close" : "Menu"}</span>
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
              <Link
                href="/products"
                onClick={() => setMobileOpen(false)}
                className="text-foreground hover:bg-foreground/[0.04] block rounded-lg px-3 py-2.5 text-sm font-semibold transition"
              >
                All Products
              </Link>
              {topCategories.map((cat) => (
                <div key={cat.slug}>
                  <Link
                    href={`/products?category=${cat.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="text-foreground hover:bg-foreground/[0.04] flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition"
                  >
                    <CategoryIcon icon={cat.icon} size={15} colored />
                    {cat.name}
                  </Link>
                  {cat.children && (
                    <div className="ml-8 space-y-0.5">
                      {cat.children.slice(0, 5).map((sub) => (
                        <Link
                          key={sub.slug}
                          href={`/products?category=${sub.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className="text-muted hover:text-foreground block rounded-lg px-3 py-2 text-sm transition"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
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
