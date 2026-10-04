import {
  assertCartEditable,
  clearCheckoutRecovery,
  getCheckoutRecovery,
  PAYMENT_LOCK_MESSAGE,
  rememberCheckoutCart,
  saveCheckoutRecovery,
} from "@/lib/checkout-recovery";
import {
  MedusaCart,
  MedusaProduct,
  MedusaProductCategory,
  MedusaRegion,
  MedusaShippingOption,
  MedusaCustomer,
  MedusaAddress,
  MedusaOrder,
} from "@/types/medusa";
import {
  medusaRequest,
  getStoredCartId,
  setStoredCartId,
  clearStoredCartId,
  getAuthToken,
  clearAuthToken,
  clearStoredWishlistProductIds,
  getStoredWishlistProductIds,
  setStoredWishlistProductIds,
} from "@/lib/http";

// ── Products ────────────────────────────────────────────────────────

const PRODUCT_PRICE_FIELDS =
  "+variants.calculated_price,+variants.prices,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder";
const ORDER_FIELDS = "*items,*items.variant,*items.product,*items.product.images";
const WISHLIST_METADATA_KEY = "wishlist_product_ids";

async function getProductPricingParams() {
  const regionsRes = await getRegions();
  const region =
    regionsRes.regions.find((r) => r.countries.some((c) => c.iso_2 === "ke")) ??
    regionsRes.regions[0];

  return {
    fields: PRODUCT_PRICE_FIELDS,
    ...(region ? { region_id: region.id } : { country_code: "ke" }),
  };
}

function normalizeWishlistProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0)),
  );
}

const SAFE_ID_RE = /^[a-zA-Z0-9_-]+$/;

function validateId(id: string): string {
  if (!SAFE_ID_RE.test(id)) throw new Error("Invalid ID format");
  return id;
}

function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const status = (error as Error & { status?: number }).status;
  if (status === 401 || status === 403) return true;

  return /unauthorized|forbidden|invalid token|jwt|auth/i.test(error.message);
}

export function getCustomerWishlistProductIds(
  customer: MedusaCustomer | null | undefined,
): string[] {
  return normalizeWishlistProductIds(customer?.metadata?.[WISHLIST_METADATA_KEY]);
}

export async function getProducts(
  params: Record<string, string | number | boolean | string[] | undefined> = {},
) {
  const pricingParams = await getProductPricingParams();

  return medusaRequest<{
    products: MedusaProduct[];
    count: number;
    offset: number;
    limit: number;
    facets?: { sizes: string[]; colours: string[] };
  }>("store/clothing-products", {
    searchParams: {
      limit: 20,
      offset: 0,
      ...params,
      ...pricingParams,
    },
  });
}

export async function getProductByHandle(handle: string) {
  const pricingParams = await getProductPricingParams();

  const res = await medusaRequest<{ products: MedusaProduct[] }>("store/clothing-products", {
    searchParams: { handle, limit: 1, ...pricingParams },
  });
  return res.products[0] ?? null;
}

export async function getProductById(id: string) {
  const pricingParams = await getProductPricingParams();

  return medusaRequest<{ product: MedusaProduct }>(`store/clothing-products/${validateId(id)}`, {
    searchParams: pricingParams,
  });
}

export async function getProductsByIds(productIds: string[]) {
  if (productIds.length === 0) return [];

  const listed = await getProducts({ id: productIds, limit: productIds.length });
  const listedProducts = listed.products ?? [];

  const listedProductMap = new Map(listedProducts.map((product) => [product.id, product]));
  const missingIds = productIds.filter((productId) => !listedProductMap.has(productId));

  const fetchedProducts = await Promise.all(
    missingIds.map(async (productId) => {
      try {
        const res = await getProductById(productId);
        return res.product;
      } catch (error) {
        if ((error as Error & { status?: number }).status === 404) return null;
        throw error;
      }
    }),
  );

  const productMap = new Map(
    [...listedProducts, ...fetchedProducts]
      .filter((product): product is MedusaProduct => product !== null)
      .map((product) => [product.id, product]),
  );

  return productIds
    .map((productId) => productMap.get(productId))
    .filter((product): product is MedusaProduct => !!product);
}

// ── Categories ──────────────────────────────────────────────────────

export async function getCategories(
  params: Record<string, string | number | boolean | undefined> = {},
) {
  return medusaRequest<{
    product_categories: MedusaProductCategory[];
    count: number;
    offset: number;
    limit: number;
  }>("store/clothing-categories", {
    searchParams: {
      limit: 100,
      include_descendants_tree: true,
      ...params,
    },
  });
}

export async function getCategoryByHandle(handle: string) {
  const res = await medusaRequest<{
    product_categories: MedusaProductCategory[];
  }>("store/clothing-categories", {
    searchParams: { handle, limit: 1, include_descendants_tree: true },
  });
  return res.product_categories[0] ?? null;
}

// ── Cart ────────────────────────────────────────────────────────────

export async function getOrCreateCart(): Promise<MedusaCart> {
  const cartId = getStoredCartId();

  if (cartId) {
    try {
      const res = await medusaRequest<{ cart: MedusaCart }>(`store/carts/${validateId(cartId)}`);
      // Medusa still returns 200 for a completed cart, but mutations against
      // it 400 with "already completed". Treat it as gone and mint a fresh one.
      rememberCheckoutCart(res.cart);
      if (!res.cart.completed_at) {
        return res.cart;
      }
      clearStoredCartId();
    } catch {
      // Cart not found or expired, create new one
    }
  }

  const regionsRes = await medusaRequest<{ regions: MedusaRegion[] }>("store/regions", {
    searchParams: { limit: 50 },
  });
  const region =
    regionsRes.regions.find((r) => r.countries.some((c) => c.iso_2 === "ke")) ??
    regionsRes.regions[0];

  const res = await medusaRequest<{ cart: MedusaCart }>("store/carts", {
    method: "POST",
    body: region ? { region_id: region.id } : {},
  });

  setStoredCartId(res.cart.id);
  return res.cart;
}

export async function getCart(): Promise<MedusaCart | null> {
  const cartId = getStoredCartId();
  if (!cartId) return null;

  try {
    const res = await medusaRequest<{ cart: MedusaCart }>(`store/carts/${cartId}`, {
      searchParams: { fields: "+items.variant.title,+shipping_methods.name" },
    });
    rememberCheckoutCart(res.cart);
    // An already-completed cart shouldn't drive the storefront UI (mutations
    // against it 400). Drop the stored id so the next `getOrCreateCart` mints
    // a new one, and surface "no cart" to callers like the cart page.
    if (res.cart.completed_at) {
      clearStoredCartId();
      return null;
    }
    return res.cart;
  } catch {
    return null;
  }
}

// Checkout must retain a callback-completed cart until its order is recovered.
export async function getCheckoutCart(): Promise<MedusaCart | null> {
  const cartId = getCheckoutRecovery()?.cartId ?? getStoredCartId();
  if (!cartId) return null;
  const res = await medusaRequest<{ cart: MedusaCart }>(`store/carts/${validateId(cartId)}`, {
    searchParams: { fields: "+items.variant.title,+shipping_methods.name" },
  });
  rememberCheckoutCart(res.cart);
  return res.cart;
}

export async function addToCart(variantId: string, quantity = 1) {
  const cart = await getOrCreateCart();
  assertCartEditable(cart.id);
  return medusaRequest<{ cart: MedusaCart }>(`store/carts/${cart.id}/line-items`, {
    method: "POST",
    body: { variant_id: variantId, quantity },
  });
}

export async function updateLineItem(lineItemId: string, quantity: number) {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");
  assertCartEditable(cartId);

  return medusaRequest<{ cart: MedusaCart }>(
    `store/carts/${validateId(cartId)}/line-items/${validateId(lineItemId)}`,
    {
      method: "POST",
      body: { quantity },
    },
  );
}

export async function removeLineItem(lineItemId: string) {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");
  assertCartEditable(cartId);

  return medusaRequest<{ cart: MedusaCart }>(
    `store/carts/${validateId(cartId)}/line-items/${validateId(lineItemId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function updateCart(data: Record<string, unknown>) {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");
  assertCartEditable(cartId);

  return medusaRequest<{ cart: MedusaCart }>(`store/carts/${cartId}`, {
    method: "POST",
    body: data,
  });
}

export async function addPromoCode(code: string) {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");
  assertCartEditable(cartId);

  return medusaRequest<{ cart: MedusaCart }>(`store/carts/${cartId}/promotions`, {
    method: "POST",
    body: { promo_codes: [code] },
  });
}

export async function removePromoCode(code: string) {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");
  assertCartEditable(cartId);

  return medusaRequest<{ cart: MedusaCart }>(`store/carts/${cartId}/promotions`, {
    method: "DELETE",
    body: { promo_codes: [code] },
  });
}

// ── Shipping ────────────────────────────────────────────────────────

export async function getShippingOptions() {
  const cartId = getStoredCartId();
  if (!cartId) return { shipping_options: [] };

  return medusaRequest<{ shipping_options: MedusaShippingOption[] }>("store/shipping-options", {
    searchParams: { cart_id: cartId },
  });
}

export async function addShippingMethod(optionId: string) {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");
  assertCartEditable(cartId);

  return medusaRequest<{ cart: MedusaCart }>(`store/carts/${cartId}/shipping-methods`, {
    method: "POST",
    body: { option_id: optionId },
  });
}

// ── Payment ─────────────────────────────────────────────────────────

export async function initializePaymentSession(opts?: {
  providerId?: string;
  data?: Record<string, unknown>;
}) {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");

  if (opts?.providerId !== "pp_family_bank_family_bank") {
    throw new Error("Only Family Bank M-Pesa Express payments are available.");
  }
  if (getCheckoutRecovery()?.state === "unresolved") throw new Error(PAYMENT_LOCK_MESSAGE);
  const data: Record<string, string> = {};
  for (const key of ["mpesa_phone", "phone"]) {
    const value = opts.data?.[key];
    if (typeof value === "string") data[key] = value;
  }

  // Lock before the first asynchronous operation; an uncertain response cannot unlock another STK attempt.
  saveCheckoutRecovery({ cartId, sessionId: null, state: "unresolved" });

  // Create payment collection for the cart
  const pcRes = await medusaRequest<{
    payment_collection: {
      id: string;
      payment_sessions?: { id: string; provider_id: string; status: string }[];
    };
  }>("store/payment-collections", {
    method: "POST",
    body: { cart_id: cartId },
  });

  const pcId = pcRes.payment_collection.id;

  const body = { provider_id: "pp_family_bank_family_bank", data };

  const result = await medusaRequest<{
    payment_collection: {
      id: string;
      payment_sessions: { id: string; provider_id: string; status: string }[];
    };
  }>(`store/payment-collections/${pcId}/payment-sessions`, {
    method: "POST",
    body,
  });
  const session = result.payment_collection.payment_sessions?.find(
    (candidate) => candidate.provider_id === "pp_family_bank_family_bank",
  );
  if (session) saveCheckoutRecovery({ cartId, sessionId: session.id, state: "unresolved" });
  return result;
}

// ── Checkout ────────────────────────────────────────────────────────

export async function completeCart() {
  const cartId = getCheckoutRecovery()?.cartId ?? getStoredCartId();
  if (!cartId) throw new Error("No cart found");

  const result = await medusaRequest<{
    type: string;
    cart?: MedusaCart;
    order?: unknown;
    error?: { message?: string };
  }>(`store/carts/${cartId}/complete`, { method: "POST" });
  const order = result.order as { id?: unknown } | undefined;
  if (result.type === "order" && typeof order?.id === "string" && order.id.trim()) {
    if (getStoredCartId() === cartId) clearStoredCartId();
    clearCheckoutRecovery(cartId);
  }
  return result;
}

// ── Auth ────────────────────────────────────────────────────────────

export async function loginCustomer(email: string, password: string) {
  const res = await medusaRequest<{ token: string }>("auth/customer/emailpass", {
    method: "POST",
    body: { email, password },
  });
  return res;
}

export async function registerCustomer(data: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}) {
  // First create auth identity
  const authRes = await medusaRequest<{ token: string }>("auth/customer/emailpass/register", {
    method: "POST",
    body: { email: data.email, password: data.password },
  });

  // Then create the customer
  const customerRes = await medusaRequest<{ customer: MedusaCustomer }>("store/customers", {
    method: "POST",
    body: {
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
    },
    headers: {
      Authorization: `Bearer ${authRes.token}`,
    },
  });

  return { token: authRes.token, customer: customerRes.customer };
}

export async function getCustomer() {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await medusaRequest<{ customer: MedusaCustomer }>("store/customers/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.customer;
  } catch (error) {
    if (isAuthError(error)) {
      clearAuthToken();
    }
    return null;
  }
}

// ── Google OAuth ─────────────────────────────────────────────────────

export async function loginWithGoogle(callbackUrl?: string) {
  const body: Record<string, string> = {};
  if (callbackUrl) body.callback_url = callbackUrl;

  return medusaRequest<{ location: string } | { token: string }>("auth/customer/google", {
    method: "POST",
    body,
  });
}

export async function validateGoogleCallback(params: Record<string, string>) {
  const res = await medusaRequest<{ token: string }>("auth/customer/google/callback", {
    method: "POST",
    searchParams: params,
  });
  return res.token;
}

export async function createCustomerFromOAuth(
  token: string,
  data: { email: string; first_name?: string; last_name?: string },
) {
  return medusaRequest<{ customer: MedusaCustomer }>("store/customers", {
    method: "POST",
    body: data,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function linkGoogleToExistingCustomer(
  token: string,
  data: { email: string; auth_identity_id: string },
) {
  return medusaRequest<{ customer_id: string; linked: boolean }>("store/customers/link-google", {
    method: "POST",
    body: data,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function refreshAuthToken(token: string) {
  const res = await medusaRequest<{ token: string }>("auth/token/refresh", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.token;
}

// ── Customer Profile ────────────────────────────────────────────────

export async function updateCustomer(data: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}) {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await medusaRequest<{ customer: MedusaCustomer }>("store/customers/me", {
    method: "POST",
    body: data,
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.customer;
}

export async function getWishlistProductIds() {
  const token = getAuthToken();
  if (!token) return getStoredWishlistProductIds();

  const customer = await getCustomer();
  return getCustomerWishlistProductIds(customer);
}

export async function setWishlistProductIds(productIds: string[]) {
  const normalizedIds = normalizeWishlistProductIds(productIds);
  const token = getAuthToken();

  if (!token) {
    setStoredWishlistProductIds(normalizedIds);
    return normalizedIds;
  }

  const customer = await getCustomer();
  const nextMetadata = {
    ...(customer?.metadata ?? {}),
    [WISHLIST_METADATA_KEY]: normalizedIds,
  };

  await updateCustomer({ metadata: nextMetadata });
  return normalizedIds;
}

export async function toggleWishlistProduct(productId: string) {
  const wishlistIds = await getWishlistProductIds();
  const nextIds = wishlistIds.includes(productId)
    ? wishlistIds.filter((id) => id !== productId)
    : [...wishlistIds, productId];

  return setWishlistProductIds(nextIds);
}

export async function mergeWishlistAfterAuth() {
  const guestWishlistIds = getStoredWishlistProductIds();
  const customer = await getCustomer();

  if (!customer) {
    return { customer: null, wishlistIds: guestWishlistIds };
  }

  const customerWishlistIds = getCustomerWishlistProductIds(customer);
  const mergedIds = Array.from(new Set([...customerWishlistIds, ...guestWishlistIds]));

  if (guestWishlistIds.length === 0) {
    return { customer, wishlistIds: customerWishlistIds };
  }

  if (mergedIds.length !== customerWishlistIds.length) {
    const updatedCustomer = await updateCustomer({
      metadata: {
        ...(customer?.metadata ?? {}),
        [WISHLIST_METADATA_KEY]: mergedIds,
      },
    });
    clearStoredWishlistProductIds();
    return { customer: updatedCustomer, wishlistIds: mergedIds };
  }

  clearStoredWishlistProductIds();
  return { customer, wishlistIds: customerWishlistIds };
}

// ── Customer Addresses ─────────────────────────────────────────────

export async function getCustomerAddresses() {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await medusaRequest<{ addresses: MedusaAddress[] }>("store/customers/me/addresses", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.addresses;
}

export async function addCustomerAddress(data: Omit<MedusaAddress, "id">) {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await medusaRequest<{ address: MedusaAddress }>("store/customers/me/addresses", {
    method: "POST",
    body: data,
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.address;
}

export async function updateCustomerAddress(id: string, data: Omit<MedusaAddress, "id">) {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await medusaRequest<{ address: MedusaAddress }>(
    `store/customers/me/addresses/${validateId(id)}`,
    {
      method: "POST",
      body: data,
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return res.address;
}

export async function deleteCustomerAddress(id: string) {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  await medusaRequest<void>(`store/customers/me/addresses/${validateId(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Orders ─────────────────────────────────────────────────────────

export async function getOrders() {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await medusaRequest<{ orders: MedusaOrder[] }>("store/orders", {
    headers: { Authorization: `Bearer ${token}` },
    searchParams: { fields: ORDER_FIELDS },
  });
  return res.orders;
}

export async function getOrderById(id: string) {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await medusaRequest<{ order: MedusaOrder }>(`store/orders/${validateId(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
    searchParams: { fields: ORDER_FIELDS },
  });
  return res.order;
}

// ── Password Reset ──────────────────────────────────────────────────

export async function requestPasswordReset(email: string) {
  return medusaRequest("auth/customer/emailpass/reset-password", {
    method: "POST",
    body: { identifier: email },
  });
}

export async function resetPassword(token: string, email: string, password: string) {
  return medusaRequest("auth/customer/emailpass/update", {
    method: "POST",
    body: { email, password },
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Email Verification ──────────────────────────────────────────────

export async function verifyEmail(token: string, email: string) {
  return medusaRequest<{ message: string; verified?: boolean; already_verified?: boolean }>(
    "store/customers/verify",
    {
      method: "POST",
      body: { token, email },
    },
  );
}

export async function resendVerificationEmail(email: string) {
  return medusaRequest<{ message: string }>("store/customers/resend-verification", {
    method: "POST",
    body: { email },
  });
}

// ── Regions ─────────────────────────────────────────────────────────

export async function getRegions() {
  return medusaRequest<{ regions: MedusaRegion[]; count: number }>("store/regions");
}
