"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  loginCustomer,
  loginWithGoogle,
  mergeWishlistAfterAuth,
  registerCustomer,
  requestPasswordReset,
} from "@/lib/medusa-api";
import { clearAuthToken, setAuthToken } from "@/lib/http";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Mail, Eye, EyeOff, ShieldCheck } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type View = "login" | "register" | "forgot" | "forgot-sent" | "registered";

type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  barColor: string;
};

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "", color: "text-muted", barColor: "bg-border" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const capped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;

  const map: Record<number, Omit<PasswordStrength, "score">> = {
    0: { label: "Too weak", color: "text-danger", barColor: "bg-danger" },
    1: { label: "Weak", color: "text-danger", barColor: "bg-danger" },
    2: { label: "Fair", color: "text-accent-yellow", barColor: "bg-accent-yellow" },
    3: { label: "Good", color: "text-accent-green", barColor: "bg-accent-green" },
    4: { label: "Strong", color: "text-accent-green", barColor: "bg-accent-green" },
  };

  return { score: capped, ...map[capped] };
}

function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
  if (!/\d/.test(password)) errors.push("One number");
  return errors;
}

function normalizeError(error: Error): string {
  const msg = error.message;
  if (/identity.*already exists/i.test(msg)) {
    return "An account with this email already exists.";
  }
  if (/unauthorized|invalid.*credentials/i.test(msg)) {
    return "Invalid email or password.";
  }
  return msg;
}

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm_password: "",
    first_name: "",
    last_name: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [postAuthError, setPostAuthError] = useState<string | null>(null);
  const [registeredState, setRegisteredState] = useState<{
    email: string;
    canContinueToAccount: boolean;
  } | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const passwordErrors = useMemo(() => getPasswordErrors(form.password), [form.password]);

  const finalizeAuthenticatedSession = async () => {
    try {
      const { customer, wishlistIds } = await mergeWishlistAfterAuth();
      queryClient.setQueryData(["wishlist"], wishlistIds);

      if (!customer) {
        clearAuthToken();
        queryClient.setQueryData(["customer"], null);
        return null;
      }

      queryClient.setQueryData(["customer"], customer);
      return customer;
    } catch {
      clearAuthToken();
      queryClient.setQueryData(["customer"], null);
      return null;
    }
  };

  const loginMutation = useMutation({
    mutationFn: () => loginCustomer(form.email, form.password),
    onSuccess: async (data) => {
      setPostAuthError(null);
      setAuthToken(data.token);
      const customer = await finalizeAuthenticatedSession();
      if (!customer) {
        setPostAuthError("We couldn't keep you signed in. Please sign in again.");
        return;
      }
      router.push("/account");
    },
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      registerCustomer({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
      }),
    onSuccess: async (data) => {
      setPostAuthError(null);
      setAuthToken(data.token);
      const customer = await finalizeAuthenticatedSession();
      setRegisteredState({
        email: data.customer.email ?? form.email,
        canContinueToAccount: !!customer,
      });
      setView("registered");
    },
  });

  const forgotMutation = useMutation({
    mutationFn: () => requestPasswordReset(forgotEmail),
    onSuccess: () => setView("forgot-sent"),
  });

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!EMAIL_RE.test(form.email)) {
      errors.email = "Please enter a valid email address.";
    }

    if (view === "register") {
      if (!form.first_name.trim()) errors.first_name = "First name is required.";
      if (!form.last_name.trim()) errors.last_name = "Last name is required.";

      if (form.password.length < 8) {
        errors.password = "Password must be at least 8 characters.";
      } else if (!/[A-Z]/.test(form.password)) {
        errors.password = "Password needs at least one uppercase letter.";
      } else if (!/[a-z]/.test(form.password)) {
        errors.password = "Password needs at least one lowercase letter.";
      } else if (!/\d/.test(form.password)) {
        errors.password = "Password needs at least one number.";
      }

      if (form.password !== form.confirm_password) {
        errors.confirm_password = "Passwords do not match.";
      }
    } else {
      if (form.password.length < 1) {
        errors.password = "Password is required.";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPostAuthError(null);
    if (!validate()) return;
    if (view === "register") {
      registerMutation.mutate();
    } else {
      loginMutation.mutate();
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(forgotEmail)) return;
    forgotMutation.mutate();
  };

  const switchTo = (v: View) => {
    setView(v);
    setValidationErrors({});
    setPostAuthError(null);
    if (v !== "registered") {
      setRegisteredState(null);
    }
    loginMutation.reset();
    registerMutation.reset();
    forgotMutation.reset();
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;
  const apiError = loginMutation.error || registerMutation.error;

  const inputClass =
    "h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/15";

  /* ── Post-registration verification notice ── */
  if (view === "registered") {
    const registrationEmail = registeredState?.email ?? form.email;
    const canContinueToAccount = registeredState?.canContinueToAccount ?? false;

    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-border/50 bg-card flex flex-col items-center gap-5 rounded-2xl border p-5 text-center sm:p-8">
          <div className="bg-secondary-light flex h-16 w-16 items-center justify-center rounded-full">
            <Mail className="text-secondary h-7 w-7" />
          </div>
          <h1 className="text-foreground text-xl font-bold">Check Your Inbox</h1>
          <p className="text-muted text-sm leading-relaxed">
            We&apos;ve sent a verification email to{" "}
            <span className="text-foreground font-medium">{registrationEmail}</span>. Please click
            the link in the email to verify your account.
          </p>
          <Link
            href={canContinueToAccount ? "/account" : "/account/login"}
            className="bg-foreground hover:bg-foreground/85 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition"
          >
            {canContinueToAccount ? "Continue to Account" : "Sign In to Continue"}
          </Link>
          <p className="text-muted text-xs">
            {canContinueToAccount
              ? "Didn't receive it? Check your spam folder or sign in to resend."
              : "Your account is ready. If you aren't kept signed in, sign in again to continue."}
          </p>
        </div>
      </div>
    );
  }

  /* ── Forgot password: sent confirmation ── */
  if (view === "forgot-sent") {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-border/50 bg-card flex flex-col items-center gap-5 rounded-2xl border p-5 text-center sm:p-8">
          <div className="bg-accent-green-light flex h-16 w-16 items-center justify-center rounded-full">
            <CheckCircle className="text-accent-green h-7 w-7" />
          </div>
          <h1 className="text-foreground text-xl font-bold">Reset Link Sent</h1>
          <p className="text-muted text-sm leading-relaxed">
            If an account exists for{" "}
            <span className="text-foreground font-medium">{forgotEmail}</span>, you&apos;ll receive
            an email with instructions to reset your password.
          </p>
          <button
            onClick={() => switchTo("login")}
            className="bg-foreground hover:bg-foreground/85 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  /* ── Forgot password form ── */
  if (view === "forgot") {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-foreground mb-8 text-center text-2xl font-bold">Forgot Password</h1>
        <form
          onSubmit={handleForgotSubmit}
          className="border-border/50 bg-card space-y-4 rounded-2xl border p-6"
        >
          <p className="text-muted text-sm">
            Enter the email address associated with your account and we&apos;ll send you a link to
            reset your password.
          </p>
          <div>
            <label className="text-muted mb-1.5 block text-sm font-medium">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className={inputClass}
              autoFocus
            />
          </div>

          {forgotMutation.error && (
            <p className="text-danger text-sm">{(forgotMutation.error as Error).message}</p>
          )}

          <button
            type="submit"
            disabled={forgotMutation.isPending || !EMAIL_RE.test(forgotEmail)}
            className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 w-full rounded-full py-3 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
          >
            {forgotMutation.isPending ? "Sending..." : "Send Reset Link"}
          </button>

          <p className="text-muted text-center text-sm">
            <button
              type="button"
              onClick={() => switchTo("login")}
              className="text-secondary focus-visible:ring-secondary/20 rounded font-medium transition hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              Back to Sign In
            </button>
          </p>
        </form>
      </div>
    );
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setPostAuthError(null);
    try {
      const result = await loginWithGoogle();
      if ("location" in result && result.location) {
        window.location.href = result.location;
        return;
      }
      if ("token" in result && typeof result.token === "string") {
        setAuthToken(result.token);
        await finalizeAuthenticatedSession();
        router.push("/account");
        return;
      }
      setPostAuthError("Google sign-in failed. Please try again.");
    } catch {
      setPostAuthError("Could not connect to Google. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ── Login / Register form ── */
  const isRegister = view === "register";

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-foreground mb-8 text-center text-2xl font-bold">
        {isRegister ? "Create Account" : "Sign In"}
      </h1>

      <div className="mb-4 space-y-4">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || isPending}
          className="border-border/50 bg-card hover:bg-foreground/[0.04] focus-visible:ring-border flex w-full items-center justify-center gap-3 rounded-full border px-4 py-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {googleLoading ? "Connecting..." : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3">
          <div className="bg-border h-px flex-1" />
          <span className="text-muted text-xs font-medium uppercase">or</span>
          <div className="bg-border h-px flex-1" />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-border/50 bg-card space-y-4 rounded-2xl border p-6"
      >
        {isRegister && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-muted mb-1.5 block text-sm font-medium">First name</label>
              <input
                placeholder="First name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className={inputClass}
              />
              {validationErrors.first_name && (
                <p className="text-danger mt-1 text-sm">{validationErrors.first_name}</p>
              )}
            </div>
            <div>
              <label className="text-muted mb-1.5 block text-sm font-medium">Last name</label>
              <input
                placeholder="Last name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className={inputClass}
              />
              {validationErrors.last_name && (
                <p className="text-danger mt-1 text-sm">{validationErrors.last_name}</p>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="text-muted mb-1.5 block text-sm font-medium">Email</label>
          <input
            type="text"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
          {validationErrors.email && (
            <p className="text-danger mt-1 text-sm">{validationErrors.email}</p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-muted text-sm font-medium">Password</label>
            {!isRegister && (
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(form.email);
                  switchTo("forgot");
                }}
                className="text-secondary text-xs font-medium transition hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={isRegister ? "Min. 8 characters" : "Password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {validationErrors.password && (
            <p className="text-danger mt-1 text-sm">{validationErrors.password}</p>
          )}

          {/* Password strength meter -- only during registration */}
          {isRegister && form.password.length > 0 && (
            <div className="mt-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        level <= strength.score ? strength.barColor : "bg-border"
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium ${strength.color}`}>{strength.label}</span>
              </div>

              {passwordErrors.length > 0 && (
                <ul className="space-y-0.5">
                  {passwordErrors.map((err) => (
                    <li key={err} className="text-muted flex items-center gap-1.5 text-xs">
                      <span className="bg-border inline-block h-1 w-1 rounded-full" />
                      {err}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Confirm password -- only during registration */}
        {isRegister && (
          <div>
            <label className="text-muted mb-1.5 block text-sm font-medium">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter your password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="text-muted hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {validationErrors.confirm_password && (
              <p className="text-danger mt-1 text-sm">{validationErrors.confirm_password}</p>
            )}
            {form.confirm_password.length > 0 &&
              form.password === form.confirm_password &&
              !validationErrors.confirm_password && (
                <p className="text-accent-green mt-1 flex items-center gap-1 text-xs">
                  <ShieldCheck className="h-3.5 w-3.5" /> Passwords match
                </p>
              )}
          </div>
        )}

        {postAuthError && <p className="text-danger text-sm">{postAuthError}</p>}
        {!postAuthError && apiError && (
          <p className="text-danger text-sm">{normalizeError(apiError as Error)}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 w-full rounded-full py-3 text-sm font-semibold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
        >
          {isPending ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
        </button>

        {isRegister && (
          <p className="text-muted text-center text-xs leading-relaxed">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        )}

        <p className="text-muted text-center text-sm">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => switchTo(isRegister ? "login" : "register")}
            className="text-secondary focus-visible:ring-secondary/20 rounded font-medium transition hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {isRegister ? "Sign in" : "Create one"}
          </button>
        </p>
      </form>
    </div>
  );
}
