"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginCustomer, registerCustomer } from "@/lib/medusa-api";
import { setAuthToken } from "@/lib/http";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      registerMutation.mutate();
    } else {
      loginMutation.mutate();
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;
  const error = loginMutation.error || registerMutation.error;

  const inputClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="mb-8 text-center text-2xl font-bold text-foreground">
        {isRegister ? "Create Account" : "Sign In"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        {isRegister && (
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              placeholder="First name"
              required
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className={inputClass}
            />
            <input
              placeholder="Last name"
              required
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className={inputClass}
            />
          </div>
        )}
        <input
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputClass}
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className={inputClass}
        />

        {error && (
          <p className="text-sm text-danger">{(error as Error).message}</p>
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
            onClick={() => setIsRegister(!isRegister)}
            className="font-medium text-primary hover:underline"
          >
            {isRegister ? "Sign in" : "Create one"}
          </button>
        </p>
      </form>
    </div>
  );
}
