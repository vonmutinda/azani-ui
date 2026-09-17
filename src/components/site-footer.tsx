import Link from "next/link";
import Image from "next/image";
import { Facebook, Heart, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="border-border/50 bg-card mt-10 border-t">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <Link href="/">
            <Image src="/logo.svg" alt="Azani" width={320} height={100} className="h-16 w-auto" />
          </Link>
          <p className="text-muted text-sm leading-relaxed">
            Kids clothing for ages 2–12. Browse by garment, audience, age, size and colour.
          </p>
          <div className="text-muted space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Phone className="text-primary h-3.5 w-3.5" /> {siteConfig.contact.phoneDisplay}
            </div>
            <div className="flex items-center gap-2">
              <Mail className="text-secondary h-3.5 w-3.5" /> {siteConfig.contact.email}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="text-accent-green h-3.5 w-3.5" /> {siteConfig.contact.location}
            </div>
          </div>
          <div>
            <h4 className="text-foreground mb-2 text-xs font-bold tracking-wide uppercase">
              Follow us
            </h4>
            <div className="flex items-center gap-2">
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Azani on Instagram"
                className="bg-primary-light text-primary hover:bg-primary inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:text-white"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={siteConfig.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Azani on Facebook"
                className="bg-secondary-light text-secondary hover:bg-secondary inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:text-white"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href={siteConfig.social.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Azani on TikTok"
                className="bg-foreground/5 text-foreground hover:bg-foreground hover:text-background inline-flex h-9 w-9 items-center justify-center rounded-full transition"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 fill-current"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-foreground mb-4 text-sm font-bold">Shop by Age</h4>
          <ul className="text-muted space-y-2.5 text-sm">
            <li>
              <Link href="/products?age=2-4" className="hover:text-foreground transition">
                2–4 years
              </Link>
            </li>
            <li>
              <Link href="/products?age=5-8" className="hover:text-foreground transition">
                5–8 years
              </Link>
            </li>
            <li>
              <Link href="/products?age=9-12" className="hover:text-foreground transition">
                9–12 years
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-foreground mb-4 text-sm font-bold">Quick Links</h4>
          <ul className="text-muted space-y-2.5 text-sm">
            <li>
              <Link href="/products" className="hover:text-foreground transition">
                Shop All
              </Link>
            </li>
            <li>
              <Link href="/products?audience=girls" className="hover:text-foreground transition">
                Girls
              </Link>
            </li>
            <li>
              <Link href="/products?audience=boys" className="hover:text-foreground transition">
                Boys
              </Link>
            </li>
            <li>
              <Link href="/products?sort=newest" className="hover:text-foreground transition">
                New In
              </Link>
            </li>
            <li>
              <Link href="/products?sale=true" className="hover:text-foreground transition">
                Sale
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-foreground transition">
                Shopping Cart
              </Link>
            </li>
            <li>
              <Link href="/account/wishlist" className="hover:text-foreground transition">
                Wishlist
              </Link>
            </li>
            <li>
              <Link href="/account/login" className="hover:text-foreground transition">
                My Account
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-foreground mb-4 text-sm font-bold">Customer Service</h4>
          <ul className="text-muted space-y-2.5 text-sm">
            <li>
              <Link href="/checkout" className="hover:text-foreground transition">
                Checkout
              </Link>
            </li>
            <li>
              <Link href="/policies/shipping" className="hover:text-foreground transition">
                Shipping Policy
              </Link>
            </li>
            <li>
              <Link href="/policies/returns" className="hover:text-foreground transition">
                Returns & Exchanges
              </Link>
            </li>
            <li>
              <Link href="/policies/terms" className="hover:text-foreground transition">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/policies/privacy" className="hover:text-foreground transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-foreground transition">
                Contact Us
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-border/50 border-t">
        <div className="text-muted mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-5 text-xs sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <span>&copy; {new Date().getFullYear()} Azani. All rights reserved.</span>
          <span className="flex items-center gap-1">
            Made with <Heart className="text-primary h-3 w-3" fill="currentColor" /> for kids
          </span>
        </div>
      </div>
    </footer>
  );
}
