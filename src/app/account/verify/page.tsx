"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { verifyEmail, resendVerificationEmail } from "@/lib/medusa-api";
import Link from "next/link";
import { CheckCircle, AlertTriangle, Loader2, Mail } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search);
  }, []);

  const token = searchParams?.get("token") ?? "";
  const email = searchParams?.get("email") ?? "";

  const missingParams = !token || !email;
  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">(
    missingParams ? "error" : "loading",
  );
  const [resendSent, setResendSent] = useState(false);

  const resendMutation = useMutation({
    mutationFn: () => resendVerificationEmail(email),
    onSuccess: () => setResendSent(true),
  });

  useEffect(() => {
    if (missingParams) return;

    verifyEmail(token, email)
      .then((res) => {
        if (res.already_verified) {
          setStatus("already");
        } else {
          setStatus("success");
        }
      })
      .catch(() => {
        setStatus("error");
      });
  }, [token, email, missingParams]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-border bg-card flex flex-col items-center gap-5 rounded-2xl border p-5 text-center shadow-sm sm:p-8">
          <Loader2 className="text-secondary h-10 w-10 animate-spin" />
          <h1 className="text-foreground text-xl font-bold">Verifying Your Email...</h1>
          <p className="text-muted text-sm">Please wait while we confirm your email address.</p>
        </div>
      </div>
    );
  }

  if (status === "success" || status === "already") {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-border bg-card flex flex-col items-center gap-5 rounded-2xl border p-5 text-center shadow-sm sm:p-8">
          <div className="bg-accent-green-light flex h-16 w-16 items-center justify-center rounded-full">
            <CheckCircle className="text-accent-green h-7 w-7" />
          </div>
          <h1 className="text-foreground text-xl font-bold">
            {status === "already" ? "Already Verified" : "Email Verified!"}
          </h1>
          <p className="text-muted text-sm">
            {status === "already"
              ? "Your email address has already been verified."
              : "Your email address has been confirmed. Your account is now fully set up."}
          </p>
          <Link
            href="/account"
            className="bg-foreground hover:bg-foreground/85 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition"
          >
            Continue to Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-border bg-card flex flex-col items-center gap-5 rounded-2xl border p-5 text-center shadow-sm sm:p-8">
        <div className="bg-danger/10 flex h-16 w-16 items-center justify-center rounded-full">
          <AlertTriangle className="text-danger h-7 w-7" />
        </div>
        <h1 className="text-foreground text-xl font-bold">Verification Failed</h1>
        <p className="text-muted text-sm">
          This verification link has expired or is invalid.
          {email && " You can request a new verification email below."}
        </p>

        {email && !resendSent && (
          <button
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
            className="bg-foreground hover:bg-foreground/85 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            {resendMutation.isPending ? "Sending..." : "Resend Verification Email"}
          </button>
        )}

        {resendSent && (
          <p className="text-accent-green text-sm font-medium">
            A new verification email has been sent. Check your inbox.
          </p>
        )}

        <Link
          href="/account"
          className="text-secondary text-sm font-medium transition hover:underline"
        >
          Go to Account
        </Link>
      </div>
    </div>
  );
}
