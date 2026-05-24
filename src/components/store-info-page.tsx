import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import { StoreInfoPageContent } from "@/lib/store-info-pages";

const methodIcons: Record<string, LucideIcon> = {
  "Call Azani": Phone,
  "Email Azani": Mail,
  "WhatsApp Azani": MessageCircle,
};

export function StoreInfoPage({ page }: { page: StoreInfoPageContent }) {
  return (
    <div className="bg-background">
      <article className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Link
          href="/"
          className="az-focus text-muted hover:text-foreground mb-8 inline-flex items-center gap-2 rounded-md text-sm font-semibold transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <header className="max-w-3xl">
          <p className="text-primary mb-3 text-xs font-bold tracking-wide uppercase">
            {page.eyebrow}
          </p>
          <h1 className="text-foreground text-4xl leading-tight font-extrabold sm:text-5xl">
            {page.title}
          </h1>
          <p className="text-muted mt-4 text-lg leading-8">{page.description}</p>
          <p className="text-muted-light mt-4 text-sm">Last updated: {page.updatedAt}</p>
        </header>

        <section
          aria-label={`${page.title} quick facts`}
          className="mt-8 grid gap-3 sm:grid-cols-3"
        >
          {page.quickFacts.map((fact) => (
            <div key={fact.label} className="az-surface p-4">
              <p className="text-muted text-xs font-bold tracking-wide uppercase">{fact.label}</p>
              <p className="text-foreground mt-2 text-sm font-bold">{fact.value}</p>
            </div>
          ))}
        </section>

        {page.contactMethods && (
          <section aria-label="Contact methods" className="mt-10 grid gap-3 sm:grid-cols-3">
            {page.contactMethods.map((method) => {
              const Icon = methodIcons[method.label] ?? MessageCircle;

              return (
                <a
                  key={method.label}
                  href={method.href}
                  target={method.href.startsWith("https://") ? "_blank" : undefined}
                  rel={method.href.startsWith("https://") ? "noopener noreferrer" : undefined}
                  className="az-focus az-surface hover:border-border-hover group flex min-h-36 flex-col justify-between p-4 transition"
                  aria-label={method.label}
                >
                  <span className="text-primary bg-primary-light flex h-10 w-10 items-center justify-center rounded-full">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="text-foreground block text-base font-bold">
                      {method.value}
                    </span>
                    <span className="text-muted mt-2 block text-sm leading-6">
                      {method.description}
                    </span>
                  </span>
                </a>
              );
            })}
          </section>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_16rem]">
          <div className="space-y-8">
            {page.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-foreground text-xl font-bold">{section.title}</h2>
                {section.body && (
                  <p className="text-muted mt-3 text-base leading-8">{section.body}</p>
                )}
                {section.items && (
                  <ul className="text-muted mt-3 space-y-3 text-base leading-7">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="bg-secondary mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <aside className="az-surface h-fit p-5">
            <h2 className="text-foreground text-base font-bold">Need help?</h2>
            <p className="text-muted mt-2 text-sm leading-6">
              Talk to Azani before you order, or ask us to help with an existing order.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/contact" className="az-btn az-btn-primary az-focus px-4">
                Contact Azani
              </Link>
              <Link href="/products" className="az-btn az-btn-outline az-focus px-4">
                Continue shopping
              </Link>
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}
