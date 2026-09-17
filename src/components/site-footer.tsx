import Link from "next/link";
import Image from "next/image";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

const groups = [
  {
    title: "Shop",
    links: [
      ["All clothing", "/products"],
      ["Girls", "/products?audience=girls"],
      ["Boys", "/products?audience=boys"],
      ["New arrivals", "/products?sort=newest"],
      ["Sale", "/products?sale=true"],
    ],
  },
  {
    title: "Shop by age",
    links: [
      ["2–4 years", "/products?age=2-4"],
      ["5–8 years", "/products?age=5-8"],
      ["9–12 years", "/products?age=9-12"],
    ],
  },
  {
    title: "Here to help",
    links: [
      ["Delivery information", "/policies/shipping"],
      ["Returns & exchanges", "/policies/returns"],
      ["Contact & size help", "/contact"],
      ["My account", "/account/login"],
    ],
  },
];

function FooterLinks({ links }: { links: string[][] }) {
  return (
    <ul className="text-muted space-y-1">
      {links.map(([label, href]) => (
        <li key={href}>
          <Link
            href={href}
            className="hover:text-foreground inline-flex min-h-11 items-center text-sm transition"
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-border border-t bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-10 lg:px-8 lg:py-12">
        <div>
          <Link href="/">
            <Image src="/logo.svg" alt="Azani" width={320} height={100} className="h-12 w-auto" />
          </Link>
          <p className="text-muted mt-4 max-w-xs text-sm leading-relaxed">
            Kids clothing for ages 2–12.
            <br />
            For little moments and big adventures.
          </p>
          <Link
            href="/contact"
            className="text-foreground mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium"
          >
            <MessageCircleQuestion className="h-5 w-5" aria-hidden="true" />
            Let’s help you find the right fit
          </Link>
          {siteConfig.contact.phone !== "+254700000000" && (
            <a href={`tel:${siteConfig.contact.phone}`} className="text-muted block py-2 text-sm">
              {siteConfig.contact.phoneDisplay}
            </a>
          )}
          {process.env.NEXT_PUBLIC_AZANI_EMAIL && (
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="text-muted block py-2 text-sm"
            >
              {siteConfig.contact.email}
            </a>
          )}
          {process.env.NEXT_PUBLIC_AZANI_WHATSAPP_NUMBER && (
            <a
              href={`https://wa.me/${siteConfig.whatsapp.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-success-ink inline-flex min-h-11 items-center text-sm underline underline-offset-4"
            >
              Chat on WhatsApp
            </a>
          )}
        </div>
        {groups.map(({ title, links }) => (
          <div key={title}>
            <details className="border-border border-b sm:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-semibold">
                {title}
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </summary>
              <div className="pb-3">
                <FooterLinks links={links} />
              </div>
            </details>
            <div className="hidden sm:block">
              <h2 className="mb-3 text-base font-bold">{title}</h2>
              <FooterLinks links={links} />
            </div>
          </div>
        ))}
      </div>
      <div className="border-border border-t">
        <div className="text-muted mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Azani</span>
          <div className="flex gap-5">
            <Link href="/policies/privacy" className="py-2">
              Privacy
            </Link>
            <Link href="/policies/terms" className="py-2">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
