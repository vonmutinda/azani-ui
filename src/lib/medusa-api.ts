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
  getAuthToken,
  clearStoredWishlistProductIds,
  getStoredWishlistProductIds,
  setStoredWishlistProductIds,
} from "@/lib/http";

// ── Products ────────────────────────────────────────────────────────

const PRODUCT_PRICE_FIELDS = "+variants.calculated_price,+variants.prices";
const WISHLIST_METADATA_KEY = "wishlist_product_ids";

async function getProductPricingParams() {
  const regionsRes = await getRegions();
  const region =
    regionsRes.regions.find((r) =>
      r.countries.some((c) => c.iso_2 === "et"),
    ) ?? regionsRes.regions[0];

  return {
    fields: PRODUCT_PRICE_FIELDS,
    ...(region ? { region_id: region.id } : { country_code: "et" }),
  };
}

function normalizeWishlistProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0)),
  );
}

export function getCustomerWishlistProductIds(customer: MedusaCustomer | null | undefined): string[] {
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
  }>("store/products", {
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

  const res = await medusaRequest<{ products: MedusaProduct[] }>(
    "store/products",
    { searchParams: { handle, limit: 1, ...pricingParams } },
  );
  return res.products[0] ?? null;
}

export async function getProductById(id: string) {
  const pricingParams = await getProductPricingParams();

  return medusaRequest<{ product: MedusaProduct }>(`store/products/${id}`, {
    searchParams: pricingParams,
  });
}

export async function getProductsByIds(productIds: string[]) {
  if (productIds.length === 0) return [];

  const products = await Promise.all(
    productIds.map(async (productId) => {
      try {
        const res = await getProductById(productId);
        return res.product;
      } catch {
        return null;
      }
    }),
  );

  const productMap = new Map(
    products
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
  }>("store/product-categories", {
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
  }>("store/product-categories", {
    searchParams: { handle, limit: 1, include_descendants_tree: true },
  });
  return res.product_categories[0] ?? null;
}

// ── Cart ────────────────────────────────────────────────────────────

export async function getOrCreateCart(): Promise<MedusaCart> {
  const cartId = getStoredCartId();

  if (cartId) {
    try {
      const res = await medusaRequest<{ cart: MedusaCart }>(
        `store/carts/${cartId}`,
      );
      return res.cart;
    } catch {
      // Cart not found or expired, create new one
    }
  }

  // Get Ethiopia region for cart (fallback to first available)
  const regionsRes = await medusaRequest<{ regions: MedusaRegion[] }>(
    "store/regions",
    { searchParams: { limit: 50 } },
  );
  const region =
    regionsRes.regions.find((r) =>
      r.countries.some((c) => c.iso_2 === "et"),
    ) ?? regionsRes.regions[0];

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
    const res = await medusaRequest<{ cart: MedusaCart }>(
      `store/carts/${cartId}`,
    );
    return res.cart;
  } catch {
    return null;
  }
}

export async function addToCart(variantId: string, quantity = 1) {
  const cart = await getOrCreateCart();
  return medusaRequest<{ cart: MedusaCart }>(
    `store/carts/${cart.id}/line-items`,
    {
      method: "POST",
      body: { variant_id: variantId, quantity },
    },
  );
}

export async function updateLineItem(lineItemId: string, quantity: number) {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");

  return medusaRequest<{ cart: MedusaCart }>(
    `store/carts/${cartId}/line-items/${lineItemId}`,
    {
      method: "POST",
      body: { quantity },
    },
  );
}

export async function removeLineItem(lineItemId: string) {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");

  return medusaRequest<{ cart: MedusaCart }>(
    `store/carts/${cartId}/line-items/${lineItemId}`,
    { method: "DELETE" },
  );
}

export async function updateCart(data: Record<string, unknown>) {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");

  return medusaRequest<{ cart: MedusaCart }>(`store/carts/${cartId}`, {
    method: "POST",
    body: data,
  });
}

export async function addPromoCode(code: string) {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");

  return medusaRequest<{ cart: MedusaCart }>(
    `store/carts/${cartId}/promotions`,
    {
      method: "POST",
      body: { promo_codes: [code] },
    },
  );
}

export async function removePromoCode(code: string) {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");

  return medusaRequest<{ cart: MedusaCart }>(
    `store/carts/${cartId}/promotions`,
    {
      method: "DELETE",
      body: { promo_codes: [code] },
    },
  );
}

// ── Shipping ────────────────────────────────────────────────────────

export async function getShippingOptions() {
  const cartId = getStoredCartId();
  if (!cartId) return { shipping_options: [] };

  return medusaRequest<{ shipping_options: MedusaShippingOption[] }>(
    "store/shipping-options",
    { searchParams: { cart_id: cartId } },
  );
}

export async function addShippingMethod(optionId: string) {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");

  return medusaRequest<{ cart: MedusaCart }>(
    `store/carts/${cartId}/shipping-methods`,
    {
      method: "POST",
      body: { option_id: optionId },
    },
  );
}

// ── Payment ─────────────────────────────────────────────────────────

export async function initializePaymentSession() {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");

  // Create payment collection for the cart
  const pcRes = await medusaRequest<{
    payment_collection: { id: string; payment_sessions?: { id: string; provider_id: string; status: string }[] };
  }>("store/payment-collections", {
    method: "POST",
    body: { cart_id: cartId },
  });

  const pcId = pcRes.payment_collection.id;

  // Create a payment session with the system default provider
  return medusaRequest<{
    payment_collection: { id: string; payment_sessions: { id: string; provider_id: string; status: string }[] };
  }>(`store/payment-collections/${pcId}/payment-sessions`, {
    method: "POST",
    body: { provider_id: "pp_system_default" },
  });
}

// ── Checkout ────────────────────────────────────────────────────────

export async function completeCart() {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error("No cart found");

  return medusaRequest<{ type: string; cart?: MedusaCart; order?: unknown }>(
    `store/carts/${cartId}/complete`,
    { method: "POST" },
  );
}

// ── Auth ────────────────────────────────────────────────────────────

export async function loginCustomer(email: string, password: string) {
  const res = await medusaRequest<{ token: string }>(
    "auth/customer/emailpass",
    {
      method: "POST",
      body: { email, password },
    },
  );
  return res;
}

export async function registerCustomer(data: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}) {
  // First create auth identity
  const authRes = await medusaRequest<{ token: string }>(
    "auth/customer/emailpass/register",
    {
      method: "POST",
      body: { email: data.email, password: data.password },
    },
  );

  // Then create the customer
  const customerRes = await medusaRequest<{ customer: MedusaCustomer }>(
    "store/customers",
    {
      method: "POST",
      body: {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
      },
      headers: {
        Authorization: `Bearer ${authRes.token}`,
      },
    },
  );

  return { token: authRes.token, customer: customerRes.customer };
}

export async function getCustomer() {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await medusaRequest<{ customer: MedusaCustomer }>(
      "store/customers/me",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return res.customer;
  } catch {
    return null;
  }
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

  const res = await medusaRequest<{ customer: MedusaCustomer }>(
    "store/customers/me",
    {
      method: "POST",
      body: data,
      headers: { Authorization: `Bearer ${token}` },
    },
  );
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

  const res = await medusaRequest<{ addresses: MedusaAddress[] }>(
    "store/customers/me/addresses",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.addresses;
}

export async function addCustomerAddress(data: Omit<MedusaAddress, "id">) {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await medusaRequest<{ address: MedusaAddress }>(
    "store/customers/me/addresses",
    {
      method: "POST",
      body: data,
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return res.address;
}

export async function updateCustomerAddress(id: string, data: Omit<MedusaAddress, "id">) {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await medusaRequest<{ address: MedusaAddress }>(
    `store/customers/me/addresses/${id}`,
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

  await medusaRequest<void>(
    `store/customers/me/addresses/${id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

// ── Orders ─────────────────────────────────────────────────────────

export async function getOrders() {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await medusaRequest<{ orders: MedusaOrder[] }>(
    "store/orders",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.orders;
}

export async function getOrderById(id: string) {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await medusaRequest<{ order: MedusaOrder }>(
    `store/orders/${id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.order;
}

// ── Regions ─────────────────────────────────────────────────────────

export async function getRegions() {
  return medusaRequest<{ regions: MedusaRegion[]; count: number }>(
    "store/regions",
  );
}
