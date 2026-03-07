"use client";

import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { resetPassword } from "@/lib/medusa-api";
import Link from "next/link";
import { CheckCircle, AlertTriangle } from "lucide-react";

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordPage() {
  const searchParams = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search);
  }, []);

  const token = searchParams?.get("token") ?? "";
  const email = searchParams?.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  const mutation = useMutation({
    mutationFn: () => resetPassword(token, email, password),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    mutation.mutate();
  };

  const inputClass =
    "h-10 w-full rounded-xl border border-border bg-white px-3 text-sm shadow-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/15";

  if (!token || !email) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-border bg-card flex flex-col items-center gap-5 rounded-2xl border p-8 text-center shadow-sm">
          <div className="bg-danger/10 flex h-16 w-16 items-center justify-center rounded-full">
            <AlertTriangle className="text-danger h-7 w-7" />
          </div>
          <h1 className="text-foreground text-xl font-bold">Invalid Reset Link</h1>
          <p className="text-muted text-sm">
            This password reset link is missing required parameters. Please request a new reset
            link.
          </p>
          <Link
            href="/account/login"
            className="bg-foreground hover:bg-foreground/85 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-border bg-card flex flex-col items-center gap-5 rounded-2xl border p-8 text-center shadow-sm">
          <div className="bg-accent-green-light flex h-16 w-16 items-center justify-center rounded-full">
            <CheckCircle className="text-accent-green h-7 w-7" />
          </div>
          <h1 className="text-foreground text-xl font-bold">Password Reset!</h1>
          <p className="text-muted text-sm">
            Your password has been updated successfully. You can now sign in with your new password.
          </p>
          <Link
            href="/account/login"
            className="bg-foreground hover:bg-foreground/85 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-foreground mb-8 text-center text-2xl font-bold">Set New Password</h1>

      <form
        onSubmit={handleSubmit}
        className="border-border bg-card space-y-4 rounded-2xl border p-6 shadow-sm"
      >
        <p className="text-muted text-sm">
          Enter a new password for <span className="text-foreground font-medium">{email}</span>.
        </p>

        <div>
          <label className="text-muted mb-1.5 block text-xs font-medium">New Password</label>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoFocus
          />
        </div>

        <div>
          <label className="text-muted mb-1.5 block text-xs font-medium">Confirm Password</label>
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {validationError && <p className="text-danger text-sm">{validationError}</p>}

        {mutation.error && (
          <p className="text-danger text-sm">
            This reset link has expired or is invalid. Please{" "}
            <Link href="/account/login" className="text-secondary font-medium underline">
              request a new one
            </Link>
            .
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 w-full rounded-full py-3 text-sm font-semibold text-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
        >
          {mutation.isPending ? "Resetting..." : "Reset Password"}
        </button>

        <p className="text-muted text-center text-sm">
          <Link
            href="/account/login"
            className="text-secondary focus-visible:ring-secondary/20 rounded font-medium transition hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Back to Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
