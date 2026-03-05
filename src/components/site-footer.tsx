import Link from "next/link";
import { Baby, Heart, Mail, MapPin, Phone } from "lucide-react";

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
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <Baby className="h-5 w-5" />
            </div>
            <div className="leading-none">
              <span className="text-lg font-extrabold tracking-tight text-foreground">Kokob</span>
              <span className="block text-[10px] font-medium uppercase tracking-widest text-muted">Baby Shop</span>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Quality baby products, clothing, toys and essentials. Curated with love for your little ones.
          </p>
          <div className="space-y-2 text-xs text-muted">
            <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" /> +251 911 000 000</div>
            <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-primary" /> hello@kokob.shop</div>
            <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> Addis Ababa, Ethiopia</div>
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold text-foreground">Categories</h4>
          <ul className="space-y-2.5 text-sm text-muted">
            {TOP_CATEGORIES.map((cat) => (
              <li key={cat.slug}>
                <Link href={`/products?category=${cat.slug}`} className="transition hover:text-primary">{cat.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold text-foreground">Quick Links</h4>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><Link href="/products" className="transition hover:text-primary">All Products</Link></li>
            <li><Link href="/products?category=clothing" className="transition hover:text-primary">New Arrivals</Link></li>
            <li><Link href="/cart" className="transition hover:text-primary">Shopping Cart</Link></li>
            <li><Link href="/account/wishlist" className="transition hover:text-primary">Wishlist</Link></li>
            <li><Link href="/account/login" className="transition hover:text-primary">My Account</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold text-foreground">Customer Service</h4>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><Link href="/checkout" className="transition hover:text-primary">Checkout</Link></li>
            <li><span className="cursor-default">Shipping Info</span></li>
            <li><span className="cursor-default">Returns & Exchanges</span></li>
            <li><span className="cursor-default">Privacy Policy</span></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <span>&copy; {new Date().getFullYear()} Kokob Baby Shop. All rights reserved.</span>
          <span className="flex items-center gap-1">Made with <Heart className="h-3 w-3 text-primary" fill="currentColor" /> for little ones</span>
        </div>
      </div>
    </footer>
  );
}
