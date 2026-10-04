"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { ClothingIllustration } from "@/components/clothing-illustration";
import { FilterIllustration } from "@/components/filter-illustration";
import { EnamelUtilityIcon } from "@/components/enamel-utility-icon";

type Filters = Record<string, string | number | undefined>;
type Props = {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  facets?: { sizes: string[]; colours?: string[] };
  children?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  onReset?: () => void;
  total?: number;
  updating?: boolean;
};

const optionClass = (selected: boolean) =>
  `relative flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none ${selected ? "border-primary/40 bg-primary-light text-primary" : "border-border bg-white text-foreground hover:border-primary/40 hover:bg-primary-light/30"}`;

function SectionHeading({ name, title }: { name: "age" | "size" | "gender"; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <FilterIllustration name={name} />
      <h3 className="text-foreground text-sm font-bold">{title}</h3>
    </div>
  );
}

export function CatalogueFilters({
  filters,
  onFilterChange,
  facets,
  children,
  open = false,
  onClose,
  onReset,
  total = 0,
  updating = false,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const panelId = useId();
  const extraCount = [filters.price, filters.availability, filters.sale].filter(Boolean).length;
  const panelRef = useRef<HTMLElement>(null);
  const sizes = Array.from(
    new Set([...(facets?.sizes ?? []), ...(filters.size ? [String(filters.size)] : [])]),
  );

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), select, input, [tabindex="0"]',
        ) ?? [],
      );
      const first = elements[0];
      const last = elements.at(-1);
      if (!panelRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const desktop = window.matchMedia?.("(min-width: 1024px)");
    const resize = (event: MediaQueryListEvent) => {
      if (event.matches) onClose?.();
    };
    desktop?.addEventListener("change", resize);
    document.addEventListener("keydown", keyboard);
    return () => {
      desktop?.removeEventListener("change", resize);
      document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    // A category or Reset button can disappear as the query changes.
    if (open && !panelRef.current?.contains(document.activeElement)) {
      panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    }
  });

  const toggle = (key: string, value: string) =>
    onFilterChange({ [key]: filters[key] === value ? undefined : value });
  const tick = (selected: boolean) =>
    selected && <Check aria-hidden="true" className="h-3 w-3 shrink-0" />;
  return (
    <>
      {open && (
        <button
          aria-label="Dismiss filters"
          onClick={onClose}
          tabIndex={-1}
          className="bg-foreground/35 fixed inset-0 z-70 cursor-default backdrop-blur-[2px]"
        />
      )}
      <aside
        ref={panelRef}
        id="catalogue-filter-panel"
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-label="Product filters"
        className={
          open
            ? "bg-card fixed inset-y-0 left-0 z-80 flex w-[min(360px,calc(100%-24px))] flex-col shadow-2xl"
            : "border-border bg-card hidden self-start rounded-2xl border lg:flex lg:flex-col"
        }
      >
        <div className="border-border flex items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="text-foreground text-lg font-bold">Find their fit</h2>
            <p className="text-muted mt-0.5 text-xs">A few choices. Their next favourite.</p>
          </div>
          {open && (
            <button
              type="button"
              aria-label="Close filters"
              onClick={onClose}
              className="border-border flex h-11 w-11 shrink-0 items-center justify-center rounded-full border focus-visible:ring-2 focus-visible:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <section
          aria-label="Refine clothing"
          className={`divide-border divide-y px-4 ${open ? "min-h-0 flex-1 overflow-y-auto overscroll-contain" : ""}`}
        >
          {children && <div className="py-4">{children}</div>}
          <section aria-label="Gender" className="py-4">
            <SectionHeading name="gender" title="Shop for" />
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "girls", label: "Girls", icon: "dress" },
                  { value: "boys", label: "Boys", icon: "shirt" },
                  { value: "unisex", label: "Unisex", icon: "outfit" },
                ] as const
              ).map(({ value, label, icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filters.audience === value}
                  onClick={() => toggle("audience", value)}
                  className={`${optionClass(filters.audience === value)} flex-col`}
                >
                  <ClothingIllustration name={icon} size={34} />
                  <span className="flex items-center gap-1">
                    {label}
                    {tick(filters.audience === value)}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-muted mt-2 text-[11px] leading-relaxed">
              Unisex styles are included in Girls and Boys too.
            </p>
          </section>
          <section aria-label="Age" className="py-4">
            <SectionHeading name="age" title="Age" />
            <div className="grid grid-cols-3 gap-2">
              {[
                ["2-4", "2–4"],
                ["5-8", "5–8"],
                ["9-12", "9–12"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${label} years`}
                  aria-pressed={filters.age === value}
                  onClick={() => toggle("age", value)}
                  className={`${optionClass(filters.age === value)} flex-col`}
                >
                  <span className="text-base font-bold">{label}</span>
                  <span className="flex items-center gap-1 text-[11px]">
                    years{tick(filters.age === value)}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section aria-label="Size" className="py-4">
            <SectionHeading name="size" title="Size" />
            {sizes.length ? (
              <div className="grid grid-cols-3 gap-2">
                {sizes.map((size) => (
                  <button
                    type="button"
                    key={size}
                    aria-label={`Size ${size}`}
                    aria-pressed={filters.size === size}
                    onClick={() => toggle("size", size)}
                    className={optionClass(filters.size === size)}
                  >
                    {size}
                    {tick(filters.size === size)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted text-xs">Sizes appear when matching styles are available.</p>
            )}
            <p className="text-muted mt-3 text-[11px] leading-relaxed">
              Age is a guide. Check each product’s size information for the best fit.
            </p>
          </section>
          <section className="py-4">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls={panelId}
              onClick={() => setMoreOpen(!moreOpen)}
              className="text-foreground flex min-h-11 w-full items-center gap-2 text-left text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
            >
              <EnamelUtilityIcon name="wallet" size={38} />
              <span>Price & availability</span>
              {extraCount > 0 && (
                <span className="bg-primary-light text-primary rounded-full px-1.5 text-xs">
                  {extraCount}
                </span>
              )}
              <ChevronDown
                aria-hidden="true"
                className={`ml-auto h-4 w-4 transition ${moreOpen ? "rotate-180" : ""}`}
              />
            </button>
            {moreOpen && (
              <div id={panelId} className="mt-3 space-y-4">
                <div role="group" aria-label="Price" className="space-y-2">
                  <p className="text-muted text-xs">Price range</p>
                  {[
                    { value: "", label: "Any price" },
                    { value: "u1000", label: "Under KSh1,000" },
                    { value: "1000-5000", label: "KSh1,000 – KSh5,000" },
                    { value: "o5000", label: "Over KSh5,000" },
                  ].map(({ value, label }) => {
                    const selected = String(filters.price ?? "") === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          value ? toggle("price", value) : onFilterChange({ price: undefined })
                        }
                        className={`${optionClass(selected)} w-full justify-between px-3 text-left`}
                      >
                        <span>{label}</span>
                        {tick(selected)}
                      </button>
                    );
                  })}
                </div>
                <div
                  role="group"
                  aria-label="Availability and offers"
                  className="grid grid-cols-2 gap-2"
                >
                  {[
                    { key: "availability", value: "in_stock", label: "In stock only" },
                    { key: "sale", value: "true", label: "On sale" },
                  ].map(({ key, value, label }) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={filters[key] === value}
                      onClick={() => toggle(key, value)}
                      className={`${optionClass(filters[key] === value)} flex-col gap-2`}
                    >
                      {key === "sale" ? (
                        <ClothingIllustration name="sale" size={34} />
                      ) : (
                        <EnamelUtilityIcon name="stock" size={34} />
                      )}
                      <span className="flex items-center gap-1">
                        {label}
                        {tick(filters[key] === value)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </section>
        {open && (
          <div className="border-border bg-card flex items-center gap-3 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {onReset && Object.values(filters).some(Boolean) && (
              <button
                type="button"
                onClick={onReset}
                className="text-muted min-h-12 rounded-lg px-2 text-sm underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="bg-primary flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {updating ? "Show results" : `Show ${total} product${total === 1 ? "" : "s"}`}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
