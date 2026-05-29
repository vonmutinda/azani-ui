import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { StoreInfoPageContent } from "@/lib/store-info-pages";

export function StoreInfoPage({ page }: { page: StoreInfoPageContent }) {
  const isExternal = (href: string) => href.startsWith("http");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-muted mb-6 flex items-center gap-1.5 text-sm">
        <Link href="/" className="hover:text-foreground transition">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="text-foreground font-medium">{page.title}</span>
      </nav>

      <header>
        <p className="text-primary text-xs font-bold tracking-wider uppercase">{page.eyebrow}</p>
        <h1 className="font-heading text-foreground mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {page.title}
        </h1>
        <p className="text-muted mt-3 max-w-2xl text-base leading-relaxed">{page.description}</p>
        <p className="text-muted-light mt-2 text-xs">Last updated {page.updatedAt}</p>
      </header>

      {page.quickFacts.length > 0 && (
        <dl className="mt-8 grid gap-3 sm:grid-cols-3">
          {page.quickFacts.map((fact) => (
            <div key={fact.label} className="border-border/50 bg-card rounded-2xl border p-4">
              <dt className="text-muted text-xs font-medium tracking-wide uppercase">
                {fact.label}
              </dt>
              <dd className="text-foreground mt-1 text-sm font-semibold">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {page.contactMethods && page.contactMethods.length > 0 && (
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {page.contactMethods.map((method) => (
            <a
              key={method.label}
              href={method.href}
              target={isExternal(method.href) ? "_blank" : undefined}
              rel={isExternal(method.href) ? "noopener noreferrer" : undefined}
              className="group border-border/50 bg-card hover:border-border focus-visible:ring-primary/30 block rounded-2xl border p-5 transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <p className="text-muted text-xs font-medium tracking-wide uppercase">
                {method.label}
              </p>
              <p className="text-primary group-hover:text-primary-hover mt-1 text-sm font-semibold break-words transition">
                {method.value}
              </p>
              <p className="text-muted mt-1.5 text-xs leading-relaxed">{method.description}</p>
            </a>
          ))}
        </div>
      )}

      <div className="mt-10 space-y-8">
        {page.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-foreground text-lg font-bold">{section.title}</h2>
            {section.body && (
              <p className="text-muted mt-2 text-sm leading-relaxed">{section.body}</p>
            )}
            {section.items && section.items.length > 0 && (
              <ul className="mt-3 space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="text-muted flex gap-2.5 text-sm leading-relaxed">
                    <span
                      className="bg-primary mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
