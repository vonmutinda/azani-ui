"use client";

import Link from "next/link";
import Image from "next/image";
import { Button, Input } from "@heroui/react";
import {
  ChevronDown,
  Heart,
  LayoutGrid,
  Menu,
  Search,
  Shield,
  ShoppingBag,
  Truck,
  User,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getCart, getCategories, getCustomer } from "@/lib/medusa-api";
import { AZANI_DEFAULT_LOGO } from "@/lib/brand-assets";
import {
  Category,
  resolveToMainAndSub,
  toCategory,
  TOP_LEVEL_CATEGORY_NAV,
  TOP_LEVEL_HANDLES,
} from "@/lib/categories";
import { CategoryIcon } from "@/components/category-icon";

const TRUST_SIGNALS = [
  { icon: Truck, text: "Free delivery over KSh5,000" },
  { icon: Shield, text: "Safe & certified products" },
  { icon: Heart, text: "Curated for newborn to mama" },
];

const subscribeToClientSnapshot = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function getNavigationCategories(categories: Category[]): Category[] {
  const categoriesBySlug = new Map(categories.map((category) => [category.slug, category]));

  return TOP_LEVEL_CATEGORY_NAV.map((navCategory) => {
    const category = categoriesBySlug.get(navCategory.slug);

    return {
      ...navCategory,
      description: category?.description ?? navCategory.description,
      children: category?.children ?? [],
    };
  });
}

function MegaMenu({
  category,
  onClose,
  panelId,
}: {
  category: Category;
  onClose: () => void;
  panelId: string;
}) {
  const children = category.children ?? [];

  return (
    <div
      id={panelId}
      role="group"
      aria-label={`${category.name} categories`}
      className="fixed inset-x-0 top-[152px] z-50 hidden lg:block"
    >
      <div className="bg-card/98 border-border/55 border-t shadow-lg backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-6 lg:grid-cols-[260px_1fr] lg:px-8">
          <div className="az-trust-surface border-trust/10 border p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white">
              <CategoryIcon icon={category.icon} size={20} colored />
            </div>
            <p className="text-foreground text-base font-bold">{category.name}</p>
            {category.description && (
              <p className="text-muted mt-2 text-sm leading-6">{category.description}</p>
            )}
            <Link
              href={`/products?category=${category.slug}`}
              onClick={onClose}
              className="text-secondary hover:text-secondary-hover az-focus mt-4 inline-flex rounded-md text-sm font-bold"
            >
              Shop all {category.name}
            </Link>
          </div>

          {children.length > 0 ? (
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {children.map((sub) => (
                <div key={sub.slug}>
                  <Link
                    href={`/products?category=${sub.slug}`}
                    onClick={onClose}
                    className="text-foreground hover:text-secondary az-focus mb-1.5 flex rounded-md text-sm font-bold transition"
                  >
                    {sub.name}
                  </Link>
                  {sub.children && sub.children.length > 0 && (
                    <ul className="space-y-0.5">
                      {sub.children.slice(0, 5).map((child) => (
                        <li key={child.slug}>
                          <Link
                            href={`/products?category=${child.slug}`}
                            onClick={onClose}
                            className="text-muted hover:text-foreground az-focus block rounded-md py-1 text-sm transition"
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
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href={`/products?category=${category.slug}`}
                onClick={onClose}
                className="az-focus border-border/70 hover:border-border-hover hover:bg-surface-soft flex items-center gap-3 rounded-lg border bg-white p-4 transition"
              >
                <CategoryIcon icon={category.icon} size={18} colored />
                <span className="text-foreground text-sm font-bold">Browse {category.name}</span>
              </Link>
            </div>
          )}
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
  const hasHydrated = useSyncExternalStore(
    subscribeToClientSnapshot,
    getClientSnapshot,
    getServerSnapshot,
  );
  const megaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const pathname = usePathname();
  const headerSearchParams = useSearchParams();
  const currentCategorySlug = headerSearchParams.get("category") ?? undefined;
  const isProductsPage = pathname === "/products";

  const categoriesQuery = useQuery({
    queryKey: ["categories-nav"],
    queryFn: () => getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const apiTopCategories: Category[] = (categoriesQuery.data?.product_categories ?? [])
    .filter((c) => !c.parent_category_id && TOP_LEVEL_HANDLES.includes(c.handle))
    .map(toCategory);
  const topCategories = getNavigationCategories(apiTopCategories);

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
  const showCartCount = hasHydrated && cartCount > 0;

  const customerQuery = useQuery({
    queryKey: ["customer"],
    queryFn: getCustomer,
    staleTime: 5 * 60 * 1000,
  });
  const isLoggedIn = !!customerQuery.data;
  const isVerified = customerQuery.data?.metadata?.email_verified === true;
  const accountHref = isLoggedIn ? "/account" : "/account/login";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?q=${encodeURIComponent(searchQuery.trim())}`;
      setSearchOpen(false);
      setMobileOpen(false);
    }
  };

  const openMega = (slug: string) => {
    if (megaTimeout.current) clearTimeout(megaTimeout.current);
    setActiveMega(slug);
  };

  const closeMega = () => {
    megaTimeout.current = setTimeout(() => setActiveMega(null), 180);
  };

  const handleMegaBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    closeMega();
  };

  const closeMenus = () => {
    setMobileOpen(false);
    setActiveMega(null);
  };

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (!prev) {
        setTimeout(() => {
          if (
            typeof window.matchMedia === "function" &&
            window.matchMedia("(min-width: 1024px)").matches
          ) {
            desktopSearchInputRef.current?.focus();
            return;
          }
          mobileSearchInputRef.current?.focus();
        }, 50);
      }
      return !prev;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (megaTimeout.current) clearTimeout(megaTimeout.current);
    };
  }, []);

  return (
    <header className="bg-card/98 supports-[backdrop-filter]:bg-card/92 sticky top-0 z-50 backdrop-blur-xl">
      <div className="bg-foreground text-white/86">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-center px-4 text-[11px] font-semibold tracking-wide sm:px-6 sm:text-xs lg:justify-between lg:px-8">
          <div className="flex items-center gap-1.5 sm:hidden">
            <Truck className="h-3 w-3 opacity-70" />
            <span>Free delivery over KSh5,000</span>
          </div>
          <div className="hidden min-w-0 items-center gap-6 sm:flex lg:gap-8">
            {TRUST_SIGNALS.map((signal) => (
              <div key={signal.text} className="flex items-center gap-1.5 whitespace-nowrap">
                <signal.icon className="h-3.5 w-3.5 opacity-70" />
                <span>{signal.text}</span>
              </div>
            ))}
          </div>
          <Link
            href="/products"
            className="az-focus hidden rounded-md text-white/86 transition hover:text-white lg:inline-flex"
          >
            Shop new arrivals
          </Link>
        </div>
      </div>

      <div className="border-border/55 border-b">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-[72px] lg:px-8">
          <Button
            isIconOnly
            onPress={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            variant="ghost"
            className={`az-focus inline-flex h-10 min-h-10 w-10 min-w-10 items-center justify-center rounded-lg transition lg:hidden ${
              mobileOpen ? "bg-foreground text-white" : "text-foreground hover:bg-foreground/[0.04]"
            }`}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Link
            href="/"
            className="az-focus absolute left-1/2 shrink-0 -translate-x-1/2 rounded-md lg:static lg:translate-x-0"
          >
            <Image
              src={AZANI_DEFAULT_LOGO.logo.inline2x}
              alt="Azani"
              width={AZANI_DEFAULT_LOGO.logo.width}
              height={AZANI_DEFAULT_LOGO.logo.height}
              sizes="(min-width: 1024px) 161px, (min-width: 640px) 138px, 127px"
              className="h-11 w-auto sm:h-12 lg:h-14"
              priority
            />
          </Link>

          <div className="ml-auto flex min-w-0 items-center gap-1.5 lg:gap-2">
            {searchOpen && (
              <form
                id="desktop-product-search"
                role="search"
                aria-label="Desktop product search"
                onSubmit={handleSearch}
                className="relative hidden min-w-0 items-center lg:flex lg:w-64 xl:w-80"
              >
                <Search className="text-muted pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
                <Input
                  ref={desktopSearchInputRef}
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  aria-label="Search products"
                  className="az-form-field h-10 pr-4 pl-10 text-sm"
                  variant="secondary"
                />
              </form>
            )}
            <Button
              isIconOnly
              onPress={toggleSearch}
              aria-label={searchOpen ? "Close search" : "Search"}
              aria-expanded={searchOpen}
              aria-controls="desktop-product-search"
              variant="ghost"
              className="az-icon-button az-focus h-10 min-h-10 w-10 min-w-10 shrink-0"
            >
              {searchOpen ? (
                <X className="h-[18px] w-[18px]" />
              ) : (
                <Search className="h-[18px] w-[18px]" />
              )}
            </Button>
            <Link
              href={accountHref}
              aria-label="Account"
              className="az-focus text-muted hover:bg-foreground/[0.04] hover:text-foreground relative hidden h-10 min-h-10 w-10 min-w-10 items-center justify-center rounded-lg transition sm:inline-flex"
            >
              <User className="h-[18px] w-[18px]" />
              {isVerified && (
                <span className="bg-secondary ring-card absolute right-1.5 bottom-1.5 h-2 w-2 rounded-full ring-2" />
              )}
            </Link>
            <Link
              href="/account/wishlist"
              aria-label="Wishlist"
              className="az-focus text-muted hover:bg-foreground/[0.04] hover:text-foreground hidden h-10 min-h-10 w-10 min-w-10 items-center justify-center rounded-lg transition lg:inline-flex"
            >
              <Heart className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/cart"
              aria-label="Cart"
              className="az-focus text-primary border-primary/15 bg-primary/[0.07] hover:bg-primary/[0.12] relative inline-flex h-11 min-h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded-xl border text-[13px] font-semibold transition sm:h-10 sm:min-h-10 sm:w-auto sm:gap-2 sm:rounded-full sm:px-3 lg:px-4"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline">Cart</span>
              <span
                data-testid="header-cart-count"
                aria-hidden="true"
                className={`bg-primary ring-card absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold text-white ring-2 transition-opacity ${
                  showCartCount ? "opacity-100" : "opacity-0"
                }`}
              >
                {showCartCount ? cartCount : 0}
              </span>
            </Link>
          </div>
        </div>
      </div>

      <div className="border-border/55 hidden border-b lg:block">
        <div className="mx-auto flex h-12 max-w-7xl items-center px-6 lg:px-8">
          <nav aria-label="Primary categories" className="flex min-w-0 flex-1 items-center">
            <Link
              href="/products"
              aria-label="All Products"
              title="All Products"
              className={`az-icon-button az-focus mr-2 h-9 min-h-9 w-9 min-w-9 transition ${
                isProductsPage && !currentCategorySlug
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-[16px] w-[16px]" />
            </Link>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-1">
              {topCategories.map((cat) => {
                const isNavActive = activeMainSlug === cat.slug;
                const isMegaActive = activeMega === cat.slug;
                const panelId = `desktop-category-panel-${cat.slug}`;

                return (
                  <div
                    key={cat.slug}
                    className="relative"
                    onMouseEnter={() => openMega(cat.slug)}
                    onMouseLeave={closeMega}
                    onFocus={() => openMega(cat.slug)}
                    onBlur={handleMegaBlur}
                  >
                    <Link
                      href={`/products?category=${cat.slug}`}
                      aria-haspopup="true"
                      aria-expanded={isMegaActive}
                      aria-controls={panelId}
                      className={`az-focus flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap transition ${
                        isMegaActive || isNavActive
                          ? "bg-primary-light text-primary"
                          : "text-foreground hover:bg-foreground/[0.04] hover:text-primary"
                      }`}
                    >
                      {cat.name}
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 opacity-55 transition-transform ${
                          isMegaActive ? "rotate-180" : ""
                        }`}
                      />
                    </Link>
                    {isMegaActive && (
                      <MegaMenu category={cat} onClose={closeMenus} panelId={panelId} />
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      {searchOpen && (
        <div
          data-testid="mobile-search-below-header"
          className="bg-card/98 border-border/40 border-t backdrop-blur-xl lg:hidden"
        >
          <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
            <form
              onSubmit={handleSearch}
              className="relative"
              role="search"
              aria-label="Mobile product search"
            >
              <Search className="text-muted absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
              <Input
                id="mobile-product-search"
                ref={mobileSearchInputRef}
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="az-form-field h-11 pr-4 pl-10"
                variant="secondary"
              />
            </form>
          </div>
        </div>
      )}

      {mobileOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="bg-card/98 border-border/40 max-h-[calc(100vh-6rem)] overflow-y-auto border-t backdrop-blur-xl lg:hidden"
        >
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="text-muted absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  aria-label="Search products"
                  className="az-form-field h-11 pr-4 pl-10"
                  variant="secondary"
                />
              </div>
            </form>

            <div className="mb-4 grid grid-cols-3 gap-2">
              <Link
                href="/cart"
                onClick={closeMenus}
                className="az-focus border-border/70 hover:border-border-hover flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border bg-white px-2 py-2 text-xs font-bold transition"
              >
                <ShoppingBag className="h-4 w-4" />
                Cart
              </Link>
              <Link
                href="/account/wishlist"
                onClick={closeMenus}
                className="az-focus border-border/70 hover:border-border-hover flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border bg-white px-2 py-2 text-xs font-bold transition"
              >
                <Heart className="h-4 w-4" />
                Wishlist
              </Link>
              <Link
                href={accountHref}
                onClick={closeMenus}
                className="az-focus border-border/70 hover:border-border-hover flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border bg-white px-2 py-2 text-xs font-bold transition"
              >
                <User className="h-4 w-4" />
                Account
              </Link>
            </div>

            <div className="space-y-1">
              <p className="text-muted px-1 pb-1 text-xs font-bold tracking-wide uppercase">
                Shop categories
              </p>
              <Link
                href="/products"
                onClick={closeMenus}
                className="text-foreground hover:bg-foreground/[0.04] az-focus flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition"
              >
                <LayoutGrid className="h-4 w-4" />
                All Products
              </Link>
              {topCategories.map((cat) => (
                <div key={cat.slug} className="rounded-lg">
                  <Link
                    href={`/products?category=${cat.slug}`}
                    onClick={closeMenus}
                    className="text-foreground hover:bg-foreground/[0.04] az-focus flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition"
                  >
                    <CategoryIcon icon={cat.icon} size={17} colored />
                    <span className="min-w-0 flex-1">{cat.name}</span>
                  </Link>
                  {cat.children && cat.children.length > 0 && (
                    <div className="ml-8 grid gap-0.5 pb-1">
                      {cat.children.slice(0, 4).map((sub) => (
                        <Link
                          key={sub.slug}
                          href={`/products?category=${sub.slug}`}
                          onClick={closeMenus}
                          className="text-muted hover:text-foreground hover:bg-foreground/[0.04] az-focus rounded-lg px-3 py-2 text-sm transition"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
