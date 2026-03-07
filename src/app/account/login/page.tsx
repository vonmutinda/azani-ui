"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  loginCustomer,
  mergeWishlistAfterAuth,
  registerCustomer,
  requestPasswordReset,
} from "@/lib/medusa-api";
import { setAuthToken } from "@/lib/http";
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

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const passwordErrors = useMemo(() => getPasswordErrors(form.password), [form.password]);

  const loginMutation = useMutation({
    mutationFn: () => loginCustomer(form.email, form.password),
    onSuccess: async (data) => {
      setAuthToken(data.token);
      const { customer, wishlistIds } = await mergeWishlistAfterAuth();
      queryClient.setQueryData(["customer"], customer);
      queryClient.setQueryData(["wishlist"], wishlistIds);
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
      setAuthToken(data.token);
      const { customer, wishlistIds } = await mergeWishlistAfterAuth();
      queryClient.setQueryData(["customer"], customer ?? data.customer);
      queryClient.setQueryData(["wishlist"], wishlistIds);
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
    loginMutation.reset();
    registerMutation.reset();
    forgotMutation.reset();
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;
  const apiError = loginMutation.error || registerMutation.error;

  const inputClass =
    "h-10 w-full rounded-xl border border-border bg-white px-3 text-sm shadow-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/15";

  /* ── Post-registration verification notice ── */
  if (view === "registered") {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-border bg-card flex flex-col items-center gap-5 rounded-2xl border p-5 text-center shadow-sm sm:p-8">
          <div className="bg-secondary-light flex h-16 w-16 items-center justify-center rounded-full">
            <Mail className="text-secondary h-7 w-7" />
          </div>
          <h1 className="text-foreground text-xl font-bold">Check Your Inbox</h1>
          <p className="text-muted text-sm leading-relaxed">
            We&apos;ve sent a verification email to{" "}
            <span className="text-foreground font-medium">{form.email}</span>. Please click the link
            in the email to verify your account.
          </p>
          <Link
            href="/account"
            className="bg-foreground hover:bg-foreground/85 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition"
          >
            Continue to Account
          </Link>
          <p className="text-muted text-xs">
            Didn&apos;t receive it? Check your spam folder or sign in to resend.
          </p>
        </div>
      </div>
    );
  }

  /* ── Forgot password: sent confirmation ── */
  if (view === "forgot-sent") {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-border bg-card flex flex-col items-center gap-5 rounded-2xl border p-5 text-center shadow-sm sm:p-8">
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
            className="bg-foreground hover:bg-foreground/85 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition"
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
          className="border-border bg-card space-y-4 rounded-2xl border p-6 shadow-sm"
        >
          <p className="text-muted text-sm">
            Enter the email address associated with your account and we&apos;ll send you a link to
            reset your password.
          </p>
          <div>
            <label className="text-muted mb-1.5 block text-xs font-medium">Email</label>
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
            className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 w-full rounded-full py-3 text-sm font-semibold text-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
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

  /* ── Login / Register form ── */
  const isRegister = view === "register";

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-foreground mb-8 text-center text-2xl font-bold">
        {isRegister ? "Create Account" : "Sign In"}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="border-border bg-card space-y-4 rounded-2xl border p-6 shadow-sm"
      >
        {isRegister && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-muted mb-1.5 block text-xs font-medium">First name</label>
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
              <label className="text-muted mb-1.5 block text-xs font-medium">Last name</label>
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
          <label className="text-muted mb-1.5 block text-xs font-medium">Email</label>
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
            <label className="text-muted text-xs font-medium">Password</label>
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
            <label className="text-muted mb-1.5 block text-xs font-medium">Confirm Password</label>
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

        {apiError && <p className="text-danger text-sm">{normalizeError(apiError as Error)}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 w-full rounded-full py-3 text-sm font-semibold text-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
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
