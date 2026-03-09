// ── Product ─────────────────────────────────────────────────────────
export type MedusaProductImage = {
  id: string;
  url: string;
  metadata?: Record<string, unknown>;
};

export type MedusaProductOptionValue = {
  id: string;
  value: string;
  option_id: string;
  metadata?: Record<string, unknown>;
};

export type MedusaProductOption = {
  id: string;
  title: string;
  product_id: string;
  values: MedusaProductOptionValue[];
};

export type MedusaMoneyAmount = {
  id: string;
  amount: number;
  currency_code: string;
  min_quantity?: number | null;
  max_quantity?: number | null;
};

export type MedusaProductVariant = {
  id: string;
  title: string;
  sku?: string | null;
  thumbnail?: string | null;
  inventory_quantity?: number;
  manage_inventory?: boolean;
  allow_backorder?: boolean;
  options?: { id: string; value: string; option_id: string }[];
  product?: Pick<MedusaProduct, "id" | "thumbnail" | "images"> | null;
  calculated_price?: {
    calculated_amount: number;
    original_amount: number;
    currency_code: string;
  };
  prices?: MedusaMoneyAmount[];
};

export type MedusaProduct = {
  id: string;
  title: string;
  handle: string;
  subtitle?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  status: string;
  is_giftcard: boolean;
  discountable: boolean;
  collection_id?: string | null;
  type_id?: string | null;
  weight?: string | null;
  images?: MedusaProductImage[];
  options?: MedusaProductOption[];
  variants?: MedusaProductVariant[];
  collection?: { id: string; title: string; handle: string } | null;
  categories?: MedusaProductCategory[];
  tags?: { id: string; value: string }[];
  type?: { id: string; value: string } | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
};

// ── Category ────────────────────────────────────────────────────────
export type MedusaProductCategory = {
  id: string;
  name: string;
  handle: string;
  description?: string;
  rank: number;
  parent_category_id?: string | null;
  parent_category?: MedusaProductCategory | null;
  category_children?: MedusaProductCategory[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// ── Cart ────────────────────────────────────────────────────────────
export type MedusaLineItem = {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  quantity: number;
  variant_id?: string;
  product_id?: string;
  unit_price: number;
  original_total: number;
  total: number;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  variant?: MedusaProductVariant;
  product?: MedusaProduct;
};

export type MedusaAddress = {
  id?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country_code?: string;
  phone?: string;
};

export type MedusaShippingMethod = {
  id: string;
  name: string;
  amount: number;
  shipping_option_id: string;
};

export type MedusaCart = {
  id: string;
  email?: string | null;
  currency_code: string;
  items: MedusaLineItem[];
  region?: { id: string; name: string; currency_code: string } | null;
  shipping_address?: MedusaAddress | null;
  billing_address?: MedusaAddress | null;
  shipping_methods?: MedusaShippingMethod[];
  payment_collection?: {
    id: string;
    payment_sessions?: { id: string; provider_id: string; status: string }[];
  } | null;
  promotions?: { code: string }[];
  total: number;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  item_total: number;
};

// ── Customer ────────────────────────────────────────────────────────
export type MedusaCustomer = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  has_account: boolean;
  addresses?: MedusaAddress[];
  metadata?: Record<string, unknown>;
};

// ── Region ──────────────────────────────────────────────────────────
export type MedusaRegion = {
  id: string;
  name: string;
  currency_code: string;
  countries: { iso_2: string; display_name: string }[];
};

// ── Shipping Option ─────────────────────────────────────────────────
export type MedusaShippingOption = {
  id: string;
  name: string;
  amount: number;
  provider_id: string;
};

// ── Collection ──────────────────────────────────────────────────────
export type MedusaCollection = {
  id: string;
  title: string;
  handle: string;
};

// ── Paginated response ──────────────────────────────────────────────
export type MedusaPaginatedResponse<K extends string, T> = {
  [key in K]: T[];
} & {
  count: number;
  offset: number;
  limit: number;
};

// ── Order ───────────────────────────────────────────────────────────
export type MedusaOrder = {
  id: string;
  display_id: number;
  email: string;
  currency_code: string;
  items: MedusaLineItem[];
  shipping_address?: MedusaAddress;
  total: number;
  subtotal: number;
  shipping_total: number;
  tax_total: number;
  discount_total: number;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};
