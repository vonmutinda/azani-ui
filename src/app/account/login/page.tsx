"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginCustomer, registerCustomer } from "@/lib/medusa-api";
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
    onSuccess: (data) => {
      setAuthToken(data.token);
      router.push("/");
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
    onSuccess: (data) => {
      setAuthToken(data.token);
      router.push("/");
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

  const inputClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="mb-8 text-center text-2xl font-bold text-foreground">
        {isRegister ? "Create Account" : "Sign In"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        {isRegister && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <input
                placeholder="First name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className={inputClass}
              />
              {validationErrors.first_name && (
                <p className="mt-1 text-sm text-danger">{validationErrors.first_name}</p>
              )}
            </div>
            <div>
              <input
                placeholder="Last name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className={inputClass}
              />
              {validationErrors.last_name && (
                <p className="mt-1 text-sm text-danger">{validationErrors.last_name}</p>
              )}
            </div>
          </div>
        )}
        <div>
          <input
            type="text"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
          {validationErrors.email && (
            <p className="mt-1 text-sm text-danger">{validationErrors.email}</p>
          )}
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={inputClass}
          />
          {validationErrors.password && (
            <p className="mt-1 text-sm text-danger">{validationErrors.password}</p>
          )}
        </div>

        {apiError && (
          <p className="text-sm text-danger">{normalizeError(apiError as Error)}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
        </button>

        <p className="text-center text-sm text-muted">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={handleToggleMode}
            className="font-medium text-primary hover:underline"
          >
            {isRegister ? "Sign in" : "Create one"}
          </button>
        </p>
      </form>
    </div>
  );
}
