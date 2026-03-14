"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  validateGoogleCallback,
  createCustomerFromOAuth,
  refreshAuthToken,
  mergeWishlistAfterAuth,
  updateCustomer,
} from "@/lib/medusa-api";
import { setAuthToken, clearAuthToken } from "@/lib/http";
import { useQueryClient } from "@tanstack/react-query";

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) return {};
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(payload));
}

function GoogleCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    if (!params.code) {
      setError("Missing authentication code from Google."); // eslint-disable-line react-hooks/set-state-in-effect -- one-time init guard
      return;
    }

    (async () => {
      try {
        let token = await validateGoogleCallback(params);

        const decoded = decodeJwtPayload(token);
        const actorId = decoded.actor_id as string | undefined;
        const userMeta = (decoded.user_metadata ?? {}) as Record<string, string>;

        if (!actorId) {
          const email = userMeta.email;
          if (!email) {
            setError("Google did not provide an email address.");
            return;
          }

          setAuthToken(token);

          try {
            await createCustomerFromOAuth(token, {
              email,
              first_name: userMeta.given_name || userMeta.name?.split(" ")[0],
              last_name: userMeta.family_name || userMeta.name?.split(" ").slice(1).join(" "),
            });
          } catch {
            // Customer with this email may already exist (e.g. signed up via email/password).
            // That's fine — Medusa will link the Google auth identity to the existing customer
            // when we refresh the token below.
          }

          try {
            await updateCustomer({
              metadata: { auth_provider: "google", email_verified: true },
            });
          } catch {
            // May fail if customer wasn't linked yet — will retry after token refresh
          }

          token = await refreshAuthToken(token);
        }

        setAuthToken(token);

        try {
          await updateCustomer({
            metadata: { auth_provider: "google", email_verified: true },
          });
        } catch {
          // non-critical -- metadata update can fail silently
        }

        try {
          const { customer, wishlistIds } = await mergeWishlistAfterAuth();
          queryClient.setQueryData(["wishlist"], wishlistIds);
          if (customer) {
            queryClient.setQueryData(["customer"], customer);
          }
        } catch {
          // wishlist merge is non-critical
        }

        router.replace("/account");
      } catch (err) {
        clearAuthToken();
        const msg = err instanceof Error ? err.message : "Authentication failed";
        setError(msg);
      }
    })();
  }, [searchParams, router, queryClient]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="border-border/50 bg-card space-y-4 rounded-2xl border p-8">
          <p className="text-danger text-sm font-medium">{error}</p>
          <button
            onClick={() => router.push("/account/login")}
            className="bg-foreground hover:bg-foreground/85 inline-flex rounded-full px-6 py-2.5 text-sm font-semibold text-white transition"
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
      <p className="text-muted text-sm">Signing you in with Google...</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-24">
          <Loader2 className="text-secondary h-8 w-8 animate-spin" />
          <p className="text-muted text-sm">Loading...</p>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
