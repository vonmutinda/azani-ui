"use client";

import Link from "next/link";
import { Baby, ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getCart, getCategories } from "@/lib/medusa-api";
import { KokobCategory, toKokobCategory, TOP_LEVEL_HANDLES, resolveToMainAndSub } from "@/lib/categories";
import { CategoryIcon } from "@/components/category-icon";

function MegaMenu({ category, onClose }: { category: KokobCategory; onClose: () => void }) {
  const children = category.children ?? [];
  return (
    <div className="absolute left-0 top-full z-50 w-full border-b border-border bg-card shadow-lg">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {children.map((sub) => (
          <div key={sub.slug}>
            <Link
              href={`/products?category=${sub.slug}`}
              onClick={onClose}
              className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground transition hover:text-primary"
            >
              <CategoryIcon icon={sub.icon} size={16} className="text-primary" />
              {sub.name}
            </Link>
            {sub.children && sub.children.length > 0 && (
              <ul className="space-y-1">
                {sub.children.map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={`/products?category=${child.slug}`}
                      onClick={onClose}
                      className="block py-0.5 text-xs text-muted transition hover:text-primary"
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
  const megaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = usePathname();
  const headerSearchParams = useSearchParams();
  const currentCategorySlug = headerSearchParams.get("category") ?? undefined;
  const isProductsPage = pathname === "/products";

  const categoriesQuery = useQuery({
    queryKey: ["categories-nav"],
    queryFn: () => getCategories({ parent_category_id: "null" }),
    staleTime: 5 * 60 * 1000,
  });

  const topCategories: KokobCategory[] = (categoriesQuery.data?.product_categories ?? [])
    .filter((c) => TOP_LEVEL_HANDLES.includes(c.handle))
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
  const cartCount = cartQuery.data?.items?.length ?? 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const openMega = (slug: string) => {
    if (megaTimeout.current) clearTimeout(megaTimeout.current);
    setActiveMega(slug);
  };

  const closeMega = () => {
    megaTimeout.current = setTimeout(() => setActiveMega(null), 200);
  };

  useEffect(() => {
    return () => { if (megaTimeout.current) clearTimeout(megaTimeout.current); };
  }, []);

  const activeCategory = topCategories.find((c) => c.slug === activeMega);

  return (
    <header className="sticky top-0 z-50 bg-card">
      <div className="bg-primary px-4 py-1.5 text-center text-xs font-medium text-white sm:text-sm">
        Free delivery on orders over Br500 &mdash; Shop baby essentials with love
      </div>

      <div className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <Baby className="h-5 w-5" />
            </div>
            <div className="leading-none">
              <span className="text-lg font-extrabold tracking-tight text-foreground">Kokob</span>
              <span className="block text-[10px] font-medium uppercase tracking-widest text-muted">Baby Shop</span>
            </div>
          </Link>

          <form onSubmit={handleSearch} className="hidden flex-1 items-center lg:flex lg:max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search baby products, brands..."
                className="h-10 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-light focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
          </form>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="rounded-full p-2.5 text-muted transition hover:bg-primary-light hover:text-primary lg:hidden"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link href="/account/login" className="hidden rounded-full p-2.5 text-muted transition hover:bg-primary-light hover:text-primary sm:inline-flex">
              <User className="h-5 w-5" />
            </Link>
            <Link href="/account/wishlist" className="hidden rounded-full p-2.5 text-muted transition hover:bg-primary-light hover:text-primary sm:inline-flex">
              <Heart className="h-5 w-5" />
            </Link>
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-primary">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="ml-1 rounded-full p-2.5 text-muted transition hover:bg-primary-light lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="relative hidden border-b border-border bg-card lg:block">
        <nav className="mx-auto flex w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/products"
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              isProductsPage && !currentCategorySlug
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:border-primary hover:text-primary"
            }`}
          >
            All Products
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
                  className={`flex items-center gap-1 border-b-2 px-4 py-3 text-sm font-medium transition ${
                    activeMega === cat.slug || isNavActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {cat.name}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </nav>

        {activeCategory && (
          <div onMouseEnter={() => openMega(activeCategory.slug)} onMouseLeave={closeMega}>
            <MegaMenu category={activeCategory} onClose={() => setActiveMega(null)} />
          </div>
        )}
      </div>

      {searchOpen && (
        <div className="border-b border-border bg-card px-4 py-3 lg:hidden">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="h-10 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
              />
            </div>
            <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white">
              Search
            </button>
          </form>
        </div>
      )}

      {mobileOpen && (
        <nav className="border-b border-border bg-card px-4 py-4 lg:hidden">
          <div className="space-y-1">
            <Link href="/products" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-primary-light">
              All Products
            </Link>
            {topCategories.map((cat) => (
              <div key={cat.slug}>
                <Link
                  href={`/products?category=${cat.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-primary-light"
                >
                  <CategoryIcon icon={cat.icon} size={16} className="text-primary" />
                  {cat.name}
                </Link>
                {cat.children && (
                  <div className="ml-7 space-y-0.5">
                    {cat.children.slice(0, 5).map((sub) => (
                      <Link
                        key={sub.slug}
                        href={`/products?category=${sub.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-md px-3 py-1.5 text-xs text-muted hover:text-primary"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <Link href="/account/wishlist" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-primary-light hover:text-primary">
                Wishlist
              </Link>
              <Link href="/account/login" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-primary-light hover:text-primary">
                Account
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
