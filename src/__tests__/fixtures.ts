import {
  MedusaProduct,
  MedusaProductCategory,
  MedusaCart,
  MedusaLineItem,
  MedusaRegion,
} from "@/types/medusa";

export const mockProduct: MedusaProduct = {
  id: "prod_01",
  title: "Pampers Baby Dry Diapers",
  handle: "pampers-baby-dry",
  description: "Premium diapers for all-night comfort",
  thumbnail: "https://example.com/pampers.jpg",
  status: "published",
  is_giftcard: false,
  discountable: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  images: [{ id: "img_01", url: "https://example.com/pampers.jpg" }],
  options: [
    {
      id: "opt_01",
      title: "Pack Size",
      product_id: "prod_01",
      values: [
        { id: "optval_01", value: "24 Count", option_id: "opt_01" },
        { id: "optval_02", value: "50 Count", option_id: "opt_01" },
      ],
    },
  ],
  variants: [
    {
      id: "variant_01",
      title: "24 Count",
      sku: "PAMPERS-24",
      options: [{ id: "optval_01", value: "24 Count", option_id: "opt_01" }],
      prices: [
        { id: "price_01", amount: 1500, currency_code: "usd" },
        { id: "price_02", amount: 85000, currency_code: "kes" },
      ],
    },
    {
      id: "variant_02",
      title: "50 Count",
      sku: "PAMPERS-50",
      options: [{ id: "optval_02", value: "50 Count", option_id: "opt_01" }],
      prices: [
        { id: "price_03", amount: 2800, currency_code: "usd" },
        { id: "price_04", amount: 160000, currency_code: "kes" },
      ],
    },
  ],
  categories: [
    { id: "pcat_01", name: "Diapers", handle: "diapers", rank: 0, created_at: "", updated_at: "" },
  ],
};

export const mockProductMinimal: MedusaProduct = {
  id: "prod_02",
  title: "Baby Wipes",
  handle: "baby-wipes",
  status: "published",
  is_giftcard: false,
  discountable: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockCategory: MedusaProductCategory = {
  id: "pcat_bath_diapering",
  name: "Bath & Diapering",
  handle: "bath-diapering",
  description: "Everything for bath time and diaper changes",
  rank: 0,
  parent_category_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  category_children: [
    {
      id: "pcat_diapers",
      name: "Diapers & Pull-Ups",
      handle: "diapers-pull-ups",
      rank: 0,
      parent_category_id: "pcat_bath_diapering",
      created_at: "",
      updated_at: "",
      category_children: [],
    },
    {
      id: "pcat_wipes",
      name: "Wipes",
      handle: "wipes",
      rank: 1,
      parent_category_id: "pcat_bath_diapering",
      created_at: "",
      updated_at: "",
      category_children: [],
    },
  ],
};

export const mockCategories: MedusaProductCategory[] = [
  mockCategory,
  {
    id: "pcat_feeding",
    name: "Feeding",
    handle: "feeding",
    rank: 1,
    parent_category_id: null,
    created_at: "",
    updated_at: "",
    category_children: [],
  },
  {
    id: "pcat_clothing",
    name: "Clothing",
    handle: "clothing",
    rank: 2,
    parent_category_id: null,
    created_at: "",
    updated_at: "",
    category_children: [],
  },
];

export const mockLineItem: MedusaLineItem = {
  id: "item_01",
  title: "Pampers Baby Dry Diapers - 24 Count",
  description: "24 Count",
  thumbnail: "https://example.com/pampers.jpg",
  quantity: 2,
  variant_id: "variant_01",
  product_id: "prod_01",
  unit_price: 1500,
  original_total: 3000,
  total: 3000,
  subtotal: 3000,
  discount_total: 0,
  tax_total: 0,
};

export const mockCart: MedusaCart = {
  id: "cart_01",
  email: "test@example.com",
  currency_code: "kes",
  items: [mockLineItem],
  total: 3000,
  subtotal: 3000,
  discount_total: 0,
  shipping_total: 0,
  tax_total: 0,
  item_total: 3000,
};

export const mockEmptyCart: MedusaCart = {
  id: "cart_02",
  currency_code: "kes",
  items: [],
  total: 0,
  subtotal: 0,
  discount_total: 0,
  shipping_total: 0,
  tax_total: 0,
  item_total: 0,
};

export const mockRegion: MedusaRegion = {
  id: "reg_01",
  name: "Kenya",
  currency_code: "kes",
  countries: [{ iso_2: "ke", display_name: "Kenya" }],
};
