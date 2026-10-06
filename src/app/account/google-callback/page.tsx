"use client";

import { useEffect, useRef, useState, Suspense, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  validateGoogleCallback,
  linkGoogleToExistingCustomer,
  refreshAuthToken,
  getCustomer,
  mergeWishlistAfterAuth,
} from "@/lib/medusa-api";
import { setAuthToken, clearAuthToken, getAuthToken } from "@/lib/http";
import { useQueryClient } from "@tanstack/react-query";

function GoogleCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const ran = useRef(false);
  const pendingToken = useRef<string | null>(null);
  const failure = "We couldn't complete Google sign-in. Please start again.";

  const fail = () => {
    pendingToken.current = null;
    clearAuthToken();
    queryClient.clear();
    setNeedsPassword(false);
    setError(failure);
  };

  const complete = async (token: string, existingPassword?: string) => {
    try {
      const result = await linkGoogleToExistingCustomer(token, existingPassword);
      const refreshed = await refreshAuthToken(token);
      setAuthToken(refreshed);
      const customer = await getCustomer();
      if (!customer || customer.id !== result.customer_id) {
        throw new Error("Customer session could not be confirmed");
      }
      pendingToken.current = null;
      queryClient.setQueryData(["customer"], customer);
      let sessionValid = true;
      try {
        const { customer: mergedCustomer, wishlistIds } = await mergeWishlistAfterAuth();
        sessionValid = mergedCustomer?.id === customer.id;
        queryClient.setQueryData(["wishlist"], wishlistIds);
      } catch (caught) {
        const status = (caught as { status?: number })?.status;
        if (status === 401 || status === 403) sessionValid = false;
        // A wishlist failure must not turn a confirmed account into a login failure.
      }
      if (!sessionValid || getAuthToken() !== refreshed)
        throw new Error("Customer session expired");
      router.replace("/account");
    } catch (caught) {
      const type = (caught as { type?: string })?.type;
      if (type === "google_link_required") {
        pendingToken.current = token;
        setNeedsPassword(true);
        setError(null);
      } else if (type === "google_link_password_invalid") {
        setError("That password could not verify your existing Azani account. Please try again.");
      } else {
        fail();
      }
    }
  };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    clearAuthToken();
    queryClient.clear();
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    if (!params.state || (!params.code && !params.error)) {
      setError(failure);
      return;
    }
    (async () => {
      try {
        const token = await validateGoogleCallback(params);
        if (params.error) {
          fail();
          return;
        }
        await complete(token);
      } catch {
        fail();
      }
    })();
    // Only process this authorization code once, including under React Strict Mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, queryClient]);

  const connect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingToken.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      await complete(pendingToken.current, password);
    } finally {
      setPassword("");
      setBusy(false);
    }
  };

  if (needsPassword) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <form
          onSubmit={connect}
          className="border-border/50 bg-card space-y-4 rounded-2xl border p-8"
        >
          <h1 className="text-foreground text-xl font-bold">Connect your existing account</h1>
          <p className="text-muted text-sm">
            This Google account matches an existing Azani account. Enter your Azani password to
            connect it and keep your orders and saved items.
          </p>
          <label htmlFor="existing-password" className="block text-sm font-medium">
            Existing Azani password
          </label>
          <input
            id="existing-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
            className="border-border bg-background w-full rounded-lg border px-3 py-2"
          />
          {error && (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !password}
            className="bg-primary hover:bg-primary-hover rounded-full px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Connecting..." : "Connect Google"}
          </button>
          <Link href="/account/login" className="text-primary block text-sm underline">
            Use email sign-in or reset your password
          </Link>
        </form>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="border-border/50 bg-card space-y-4 rounded-2xl border p-8">
          <h1 className="text-foreground text-xl font-bold">Sign-in unsuccessful</h1>
          <p role="alert" className="text-danger text-sm font-medium">
            {error}
          </p>
          <button
            onClick={() => router.push("/account/login")}
            className="bg-primary hover:bg-primary-hover inline-flex rounded-full px-6 py-2.5 text-sm font-semibold text-white"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-24">
      <Loader2 className="text-secondary h-8 w-8 animate-spin" />
      <p className="text-muted text-sm" role="status">
        Signing you in with Google...
      </p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Loading...</p>}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
