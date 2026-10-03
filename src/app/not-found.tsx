import Link from "next/link";
import { EnamelUtilityIcon } from "@/components/enamel-utility-icon";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="border-border bg-card flex flex-col items-center gap-5 rounded-xl border p-8 sm:p-12">
        <EnamelUtilityIcon name="search" size={64} />
        <p className="text-muted text-sm">404 · Page not found</p>
        <h1 className="text-2xl font-bold">Let’s find your next favourite</h1>
        <p className="text-muted">
          This page may have moved. Browse our clothing or return to the homepage to start again.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/products" className={buttonVariants()}>
            Shop clothing
          </Link>
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
