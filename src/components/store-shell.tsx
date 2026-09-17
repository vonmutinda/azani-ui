"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowLeft, MessageCircleQuestion } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function StoreShell({ children }: { children: React.ReactNode }) {
  const checkout = usePathname()?.startsWith("/checkout");
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
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
              <Image
                src="/logo.svg"
                alt="Azani"
                width={320}
                height={100}
                className="h-9 w-auto sm:h-11"
              />
            </Link>
            <Link href="/contact" className="inline-flex min-h-11 items-center gap-2 text-sm">
              <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
              Help
            </Link>
          </div>
        </header>
      ) : (
        <Suspense fallback={<div aria-hidden="true" className="h-[93px] bg-white lg:h-[109px]" />}>
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
