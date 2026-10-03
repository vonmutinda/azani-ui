"use client";

import { Suspense } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { usePathname } from "next/navigation";
import { ArrowLeft, MessageCircleQuestion } from "lucide-react";
import { RouteScrollRestoration } from "@/components/route-scroll-restoration";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function StoreShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const checkout = pathname?.startsWith("/checkout");
  const productPage = pathname?.startsWith("/products/");
  return (
    <div
      className={`bg-background text-foreground flex min-h-screen flex-col ${productPage ? "pb-28 md:pb-0" : ""}`}
    >
      <RouteScrollRestoration />
      <a
        href="#main-content"
        className="bg-foreground fixed top-2 left-2 z-[100] -translate-y-24 rounded-lg px-4 py-3 text-white focus:translate-y-0"
      >
        Skip to content
      </a>
      {checkout ? (
        <header className="border-border border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/cart" className="inline-flex min-h-11 items-center gap-2 text-sm">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Back to cart</span>
              <span className="sm:hidden">Cart</span>
            </Link>
            <Link href="/">
              <BrandLogo className="h-16 w-28 object-contain sm:h-20 sm:w-36" />
            </Link>
            <Link href="/contact" className="inline-flex min-h-11 items-center gap-2 text-sm">
              <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
              Help
            </Link>
          </div>
        </header>
      ) : (
        <Suspense fallback={<div aria-hidden="true" className="h-[108px] bg-white sm:h-[124px]" />}>
          <SiteHeader />
        </Suspense>
      )}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      {checkout ? (
        <footer className="border-border mx-auto flex w-full max-w-7xl flex-wrap justify-center gap-x-6 gap-y-2 border-t px-4 py-6 text-sm">
          <Link href="/policies/shipping" className="py-2">
            Delivery
          </Link>
          <Link href="/policies/returns" className="py-2">
            Returns
          </Link>
          <Link href="/policies/privacy" className="py-2">
            Privacy
          </Link>
          <Link href="/policies/terms" className="py-2">
            Terms
          </Link>
        </footer>
      ) : (
        <SiteFooter />
      )}
    </div>
  );
}
