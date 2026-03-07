import Link from "next/link";
import Image from "next/image";
import { Heart, Mail, MapPin, Phone } from "lucide-react";

const TOP_CATEGORIES = [
  { name: "Feeding", slug: "feeding" },
  { name: "Bath & Diapering", slug: "bath-diapering" },
  { name: "Nursery", slug: "nursery" },
  { name: "Baby Gear", slug: "baby-gear" },
  { name: "Clothing", slug: "clothing" },
  { name: "Toys & Books", slug: "toys-books" },
  { name: "Mom & Maternity", slug: "mom-maternity" },
];

export function SiteFooter() {
  return (
    <footer className="border-border bg-card mt-10 border-t">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Kokob Baby Shop"
              width={224}
              height={72}
              className="h-16 w-auto"
            />
          </Link>
          <p className="text-muted text-sm leading-relaxed">
            Quality baby products, clothing, toys and essentials. Curated with love for your little
            ones.
          </p>
          <div className="text-muted space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Phone className="text-primary h-3.5 w-3.5" /> +251 911 000 000
            </div>
            <div className="flex items-center gap-2">
              <Mail className="text-secondary h-3.5 w-3.5" /> hello@kokob.shop
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="text-accent-green h-3.5 w-3.5" /> Addis Ababa, Ethiopia
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-foreground mb-4 text-sm font-bold">Categories</h4>
          <ul className="text-muted space-y-2.5 text-sm">
            {TOP_CATEGORIES.map((cat) => (
              <li key={cat.slug}>
                <Link
                  href={`/products?category=${cat.slug}`}
                  className="hover:text-foreground transition"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-foreground mb-4 text-sm font-bold">Quick Links</h4>
          <ul className="text-muted space-y-2.5 text-sm">
            <li>
              <Link href="/products" className="hover:text-foreground transition">
                All Products
              </Link>
            </li>
            <li>
              <Link href="/products?category=clothing" className="hover:text-foreground transition">
                New Arrivals
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
              <span className="text-muted/60 cursor-default">Shipping Info</span>
            </li>
            <li>
              <span className="text-muted/60 cursor-default">Returns & Exchanges</span>
            </li>
            <li>
              <span className="text-muted/60 cursor-default">Privacy Policy</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-border border-t">
        <div className="text-muted mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-5 text-xs sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <span>&copy; {new Date().getFullYear()} Kokob Baby Shop. All rights reserved.</span>
          <span className="flex items-center gap-1">
            Made with <Heart className="text-primary h-3 w-3" fill="currentColor" /> for little ones
          </span>
        </div>
      </div>
    </footer>
  );
}
