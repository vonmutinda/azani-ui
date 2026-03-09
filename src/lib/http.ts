const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

type ParamValue = string | number | boolean | undefined;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  searchParams?: Record<string, ParamValue | ParamValue[]>;
  headers?: Record<string, string>;
};

function buildUrl(path: string, searchParams?: RequestOptions["searchParams"]): string {
  const url = new URL(path.replace(/^\//, ""), MEDUSA_BACKEND_URL + "/");

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v !== undefined && v !== null && v !== "") {
            url.searchParams.append(`${key}[]`, String(v));
          }
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export async function medusaRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(buildUrl(path, options.searchParams), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
      ...options.headers,
    },
    credentials: "include",
    cache: "no-store",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = json as { message?: string; type?: string };
    const requestError = new Error(
      error.message ?? `Request failed with status ${response.status}`,
    ) as Error & { status?: number; type?: string };
    requestError.status = response.status;
    requestError.type = error.type;
    throw requestError;
  }

  return json as T;
}

// Cart ID management
const CART_ID_KEY = "medusa_cart_id";

export function getStoredCartId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CART_ID_KEY);
}

export function setStoredCartId(cartId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_ID_KEY, cartId);
}

export function clearStoredCartId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_ID_KEY);
}

// Auth token management
const AUTH_TOKEN_KEY = "medusa_auth_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// Wishlist storage
const WISHLIST_PRODUCT_IDS_KEY = "medusa_wishlist_product_ids";

export function getStoredWishlistProductIds(): string[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(WISHLIST_PRODUCT_IDS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function setStoredWishlistProductIds(productIds: string[]): void {
  if (typeof window === "undefined") return;

  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  localStorage.setItem(WISHLIST_PRODUCT_IDS_KEY, JSON.stringify(uniqueIds));
}

export function clearStoredWishlistProductIds(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(WISHLIST_PRODUCT_IDS_KEY);
}
