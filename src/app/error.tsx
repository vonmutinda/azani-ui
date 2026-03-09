"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <div className="bg-danger/10 mb-6 flex h-20 w-20 items-center justify-center rounded-full">
        <AlertTriangle className="text-danger h-9 w-9" />
      </div>
      <h1 className="text-foreground mb-2 text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted mb-8 text-sm">
        An unexpected error occurred. Please try again or return to the home page.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
        <Link
          href="/"
          className="border-border hover:bg-background text-foreground inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-semibold shadow-sm transition"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
