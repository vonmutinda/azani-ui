"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginCustomer, mergeWishlistAfterAuth, registerCustomer } from "@/lib/medusa-api";
import { setAuthToken } from "@/lib/http";
import { useRouter } from "next/navigation";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

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
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
      router.push("/account");
    },
  });

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!EMAIL_RE.test(form.email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (isRegister) {
      if (!form.first_name.trim()) errors.first_name = "First name is required.";
      if (!form.last_name.trim()) errors.last_name = "Last name is required.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (isRegister) {
      registerMutation.mutate();
    } else {
      loginMutation.mutate();
    }
  };

  const handleToggleMode = () => {
    setIsRegister(!isRegister);
    setValidationErrors({});
    loginMutation.reset();
    registerMutation.reset();
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;
  const apiError = loginMutation.error || registerMutation.error;

  const inputClass =
    "h-10 w-full rounded-xl border border-border bg-white px-3 text-sm shadow-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/15";

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
          <label className="text-muted mb-1.5 block text-xs font-medium">Password</label>
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={inputClass}
          />
          {validationErrors.password && (
            <p className="text-danger mt-1 text-sm">{validationErrors.password}</p>
          )}
        </div>

        {apiError && <p className="text-danger text-sm">{normalizeError(apiError as Error)}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="bg-foreground hover:bg-foreground/85 focus-visible:ring-foreground/30 w-full rounded-full py-3 text-sm font-semibold text-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
        >
          {isPending ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
        </button>

        <p className="text-muted text-center text-sm">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={handleToggleMode}
            className="text-secondary focus-visible:ring-secondary/20 rounded font-medium transition hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {isRegister ? "Sign in" : "Create one"}
          </button>
        </p>
      </form>
    </div>
  );
}
