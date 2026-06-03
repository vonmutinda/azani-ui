import { Smartphone, ShieldCheck } from "lucide-react";

type Props = {
  compact?: boolean;
};

export function PaymentBadges({ compact = false }: Props) {
  if (compact) {
    return (
      <div className="border-success-ink/20 bg-success-ink/[0.04] text-muted inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-2 text-xs">
        <span className="bg-background text-success-ink inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
          <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="text-foreground shrink-0 font-semibold">M-Pesa accepted</span>
        <span className="hidden sm:inline">Secure mobile checkout</span>
      </div>
    );
  }

  return (
    <div className="border-success-ink/20 bg-success-ink/[0.04] rounded-2xl border p-3">
      <div className="flex items-start gap-3">
        <span className="bg-background text-success-ink inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-foreground text-xs font-semibold">M-Pesa accepted</p>
          <p className="text-muted mt-0.5 text-xs">Secure mobile checkout for Kenyan numbers.</p>
        </div>
      </div>
    </div>
  );
}
