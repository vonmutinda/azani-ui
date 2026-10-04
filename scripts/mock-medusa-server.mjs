import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.MOCK_MEDUSA_PORT ?? process.env.PORT ?? 9000);
const now = () => new Date().toISOString();

const region = {
  id: "reg_ke",
  name: "Kenya",
  currency_code: "kes",
  countries: [{ iso_2: "ke", display_name: "Kenya" }],
};

function category(id, name, handle, rank) {
  return {
    id,
    name,
    handle,
    rank,
    parent_category_id: null,
    description: `QA garment fixtures for the ${name.toLowerCase()} department.`,
    created_at: now(),
    updated_at: now(),
    category_children: [],
  };
}

const categories = [
  category("pcat_tops", "Tops", "tops", 0),
  category("pcat_bottoms", "Bottoms", "bottoms", 1),
  category("pcat_dresses_jumpsuits", "Dresses & Jumpsuits", "dresses-jumpsuits", 2),
  category("pcat_sets_outfits", "Sets & Outfits", "sets-outfits", 3),
  category("pcat_knitwear_outerwear", "Knitwear & Outerwear", "knitwear-outerwear", 4),
  category("pcat_sleepwear", "Sleepwear", "sleepwear", 5),
  category("pcat_underwear_socks", "Underwear & Socks", "underwear-socks", 6),
];

function flattenCategories(list) {
  return list.flatMap((cat) => [cat, ...flattenCategories(cat.category_children ?? [])]);
}

const flatCategories = flattenCategories(categories);
const categoryByHandle = new Map(flatCategories.map((cat) => [cat.handle, cat]));

function money(amount, id) {
  return { id: `price_${id}`, amount, currency_code: "kes" };
}

function variant(productId, idx, optionIds, item) {
  const amount = item.price;
  return {
    id: `variant_${productId}_${idx}`,
    title: `${item.size} / ${item.colour}`,
    sku: `${productId.toUpperCase()}-${idx}`,
    inventory_quantity: item.inventory,
    manage_inventory: true,
    allow_backorder: false,
    options: [
      { id: `optval_${productId}_size_${idx}`, option_id: optionIds.size, value: item.size },
      {
        id: `optval_${productId}_colour_${idx}`,
        option_id: optionIds.colour,
        value: item.colour,
      },
    ],
    prices: [money(amount, `${productId}_${idx}`)],
    calculated_price: {
      calculated_amount: amount,
      original_amount: item.originalPrice ?? amount,
      currency_code: "kes",
    },
    metadata: { clothing: { age_min: item.ageMin, age_max: item.ageMax } },
  };
}

function product({
  id,
  title,
  handle,
  description,
  categoryHandle,
  audience,
  variants,
  createdDaysAgo = 10,
}) {
  const cats = [categoryByHandle.get(categoryHandle)].filter(Boolean);
  const optionIds = { size: `opt_${id}_size`, colour: `opt_${id}_colour` };
  const uniqueValues = (key) => [...new Set(variants.map((item) => item[key]))];
  const options = [
    {
      id: optionIds.size,
      title: "Size",
      product_id: id,
      values: uniqueValues("size").map((value, index) => ({
        id: `optval_${id}_size_value_${index}`,
        option_id: optionIds.size,
        value,
      })),
    },
    {
      id: optionIds.colour,
      title: "Colour",
      product_id: id,
      values: uniqueValues("colour").map((value, index) => ({
        id: `optval_${id}_colour_value_${index}`,
        option_id: optionIds.colour,
        value,
      })),
    },
  ];
  const productVariants = variants.map((item, index) => variant(id, index + 1, optionIds, item));

  return {
    id,
    title,
    handle,
    description,
    thumbnail: null,
    status: "published",
    is_giftcard: false,
    discountable: true,
    images: [],
    options,
    variants: productVariants,
    categories: cats,
    tags: [
      ...cats.map((cat) => ({ id: `tag_${cat.handle}`, value: cat.name })),
      { id: `tag_${id}_qa`, value: "QA garment" },
    ],
    metadata: { clothing: { audience } },
    created_at: new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: now(),
  };
}

const products = [
  product({
    id: "prod_qa_tee",
    title: "QA Unisex Everyday Tee",
    handle: "qa-unisex-everyday-tee",
    description: "Clearly labelled QA fixture for testing top filters and garment variants.",
    categoryHandle: "tops",
    audience: "unisex",
    variants: [
      { size: "2-3 Years", colour: "Mint", ageMin: 2, ageMax: 3, price: 850, inventory: 8 },
      { size: "4-5 Years", colour: "Mint", ageMin: 4, ageMax: 5, price: 950, inventory: 3 },
      { size: "6-7 Years", colour: "Navy", ageMin: 6, ageMax: 7, price: 1100, inventory: 12 },
    ],
    createdDaysAgo: 2,
  }),
  product({
    id: "prod_qa_chinos",
    title: "QA Boys Chinos",
    handle: "qa-boys-chinos",
    description: "Clearly labelled QA fixture for testing bottom filters and garment variants.",
    categoryHandle: "bottoms",
    audience: "boys",
    variants: [
      { size: "4-5 Years", colour: "Khaki", ageMin: 4, ageMax: 5, price: 1650, inventory: 5 },
      { size: "6-7 Years", colour: "Khaki", ageMin: 6, ageMax: 7, price: 1750, inventory: 0 },
      { size: "9-10 Years", colour: "Navy", ageMin: 9, ageMax: 10, price: 1950, inventory: 9 },
    ],
    createdDaysAgo: 12,
  }),
  product({
    id: "prod_qa_dress",
    title: "QA Girls Day Dress",
    handle: "qa-girls-day-dress",
    description: "Clearly labelled QA fixture for testing dress filters and garment variants.",
    categoryHandle: "dresses-jumpsuits",
    audience: "girls",
    variants: [
      { size: "2-3 Years", colour: "Coral", ageMin: 2, ageMax: 3, price: 2400, inventory: 4 },
      { size: "5-6 Years", colour: "Coral", ageMin: 5, ageMax: 6, price: 2600, inventory: 6 },
      { size: "9-10 Years", colour: "Teal", ageMin: 9, ageMax: 10, price: 2850, inventory: 2 },
    ],
    createdDaysAgo: 6,
  }),
  product({
    id: "prod_qa_fleece_set",
    title: "QA Unisex Fleece Set",
    handle: "qa-unisex-fleece-set",
    description: "Clearly labelled QA fleece outfit fixture for composed filter and sale testing.",
    categoryHandle: "sets-outfits",
    audience: "unisex",
    variants: [
      {
        size: "6-7 Years",
        colour: "Navy",
        ageMin: 6,
        ageMax: 7,
        price: 3200,
        originalPrice: 3800,
        inventory: 6,
      },
      {
        size: "6-7 Years",
        colour: "Rust",
        ageMin: 6,
        ageMax: 7,
        price: 3200,
        originalPrice: 3800,
        inventory: 0,
      },
      {
        size: "8-9 Years",
        colour: "Navy",
        ageMin: 8,
        ageMax: 9,
        price: 3400,
        originalPrice: 4000,
        inventory: 0,
      },
    ],
    createdDaysAgo: 4,
  }),
  product({
    id: "prod_qa_jacket",
    title: "QA Boys Outerwear Jacket",
    handle: "qa-boys-outerwear-jacket",
    description: "Clearly labelled QA fixture for testing outerwear and upper price filters.",
    categoryHandle: "knitwear-outerwear",
    audience: "boys",
    variants: [
      { size: "4-5 Years", colour: "Forest", ageMin: 4, ageMax: 5, price: 5200, inventory: 3 },
      { size: "9-10 Years", colour: "Navy", ageMin: 9, ageMax: 10, price: 5900, inventory: 7 },
      { size: "11-12 Years", colour: "Forest", ageMin: 11, ageMax: 12, price: 6200, inventory: 1 },
    ],
    createdDaysAgo: 20,
  }),
  product({
    id: "prod_qa_pyjamas",
    title: "QA Girls Pyjama Set",
    handle: "qa-girls-pyjama-set",
    description: "Clearly labelled QA fixture for testing sleepwear filters and garment variants.",
    categoryHandle: "sleepwear",
    audience: "girls",
    variants: [
      { size: "3-4 Years", colour: "Lilac", ageMin: 3, ageMax: 4, price: 1850, inventory: 10 },
      { size: "5-6 Years", colour: "Lilac", ageMin: 5, ageMax: 6, price: 1950, inventory: 4 },
      { size: "10-12 Years", colour: "Plum", ageMin: 10, ageMax: 12, price: 2250, inventory: 0 },
    ],
    createdDaysAgo: 8,
  }),
  product({
    id: "prod_qa_socks",
    title: "QA Unisex Sock Pack",
    handle: "qa-unisex-sock-pack",
    description: "Clearly labelled QA fixture for testing underwear and sock filters.",
    categoryHandle: "underwear-socks",
    audience: "unisex",
    variants: [
      { size: "2-4 Years", colour: "White", ageMin: 2, ageMax: 4, price: 650, inventory: 14 },
      { size: "5-8 Years", colour: "Navy", ageMin: 5, ageMax: 8, price: 750, inventory: 9 },
      { size: "9-12 Years", colour: "Black", ageMin: 9, ageMax: 12, price: 850, inventory: 11 },
    ],
    createdDaysAgo: 15,
  }),
];

const productsById = new Map(products.map((item) => [item.id, item]));
const carts = new Map();
const orders = [];
const tokens = new Map();
const customer = {
  id: "cus_demo",
  email: "demo@azani.shop",
  first_name: "Amina",
  last_name: "Otieno",
  phone: "+254712345678",
  has_account: true,
  metadata: { email_verified: true, wishlist_product_ids: ["prod_qa_fleece_set"] },
  addresses: [
    {
      id: "addr_demo_1",
      first_name: "Amina",
      last_name: "Otieno",
      address_1: "Westlands Road, Delta Towers",
      city: "Nairobi",
      province: "Nairobi",
      postal_code: "00100",
      country_code: "ke",
      phone: "+254712345678",
    },
  ],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getSearchValues(url, key) {
  return [...url.searchParams.getAll(key), ...url.searchParams.getAll(`${key}[]`)].filter(Boolean);
}

const clothingCategoryIds = new Set(categories.map((item) => item.id));
const clothingFilterValues = {
  audience: new Set(["girls", "boys", "unisex"]),
  age: new Set(["2-4", "5-8", "9-12"]),
  availability: new Set(["in_stock"]),
  price: new Set(["u1000", "1000-5000", "o5000"]),
  sale: new Set(["true"]),
  sort: new Set(["featured", "newest", "price_asc", "price_desc"]),
};

function optionalChoice(url, key) {
  const value = url.searchParams.get(key);
  if (value && !clothingFilterValues[key].has(value)) {
    const error = new Error(`Invalid ${key} filter`);
    error.status = 400;
    throw error;
  }
  return value;
}

function isClothingProduct(item) {
  return (
    item.status === "published" &&
    ["girls", "boys", "unisex"].includes(item.metadata?.clothing?.audience) &&
    item.categories?.some((cat) => clothingCategoryIds.has(cat.id))
  );
}

function variantOptionValue(variantItem, optionTitle, item) {
  const optionId = item.options?.find((option) => option.title === optionTitle)?.id;
  return variantItem.options?.find((option) => option.option_id === optionId)?.value;
}

function variantPrice(variantItem) {
  return (
    variantItem.calculated_price?.calculated_amount ??
    variantItem.prices?.find((item) => item.currency_code === "kes")?.amount ??
    0
  );
}

function variantMatches(variantItem, item, filters) {
  const clothing = variantItem.metadata?.clothing ?? {};
  if (filters.age) {
    const [ageMin, ageMax] = filters.age.split("-").map(Number);
    if (clothing.age_min > ageMax || clothing.age_max < ageMin) return false;
  }
  if (filters.sizes.length > 0) {
    const size = variantOptionValue(variantItem, "Size", item);
    if (!filters.sizes.includes(size)) return false;
  }
  if (filters.colours.length > 0) {
    const colour = variantOptionValue(variantItem, "Colour", item);
    if (!filters.colours.includes(colour)) return false;
  }
  if (filters.availability === "in_stock") {
    const available =
      variantItem.allow_backorder ||
      variantItem.manage_inventory === false ||
      Number(variantItem.inventory_quantity ?? 0) > 0;
    if (!available) return false;
  }

  const price = variantPrice(variantItem);
  if (filters.price === "u1000" && price >= 1000) return false;
  if (filters.price === "1000-5000" && (price < 1000 || price > 5000)) return false;
  if (filters.price === "o5000" && price <= 5000) return false;
  if (
    filters.sale === "true" &&
    !(
      variantItem.calculated_price?.original_amount >
      variantItem.calculated_price?.calculated_amount
    )
  ) {
    return false;
  }
  return true;
}

function listClothingProducts(url) {
  const limit = Math.max(0, Number(url.searchParams.get("limit") ?? 20));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
  const handle = url.searchParams.get("handle");
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const ids = getSearchValues(url, "id");
  const categoryIds = getSearchValues(url, "category_id");
  const filters = {
    audience: optionalChoice(url, "audience"),
    age: optionalChoice(url, "age"),
    availability: optionalChoice(url, "availability"),
    price: optionalChoice(url, "price"),
    sale: optionalChoice(url, "sale"),
    sort: optionalChoice(url, "sort") ?? "featured",
    sizes: getSearchValues(url, "size"),
    colours: getSearchValues(url, "colour"),
  };

  let result = products.filter(isClothingProduct);
  if (handle) result = result.filter((item) => item.handle === handle);
  if (ids.length > 0) result = result.filter((item) => ids.includes(item.id));
  if (categoryIds.length > 0) {
    result = result.filter((item) => item.categories?.some((cat) => categoryIds.includes(cat.id)));
  }
  if (q) {
    result = result.filter((item) =>
      [item.title, item.description, ...(item.tags ?? []).map((tag) => tag.value)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  if (filters.audience) {
    result = result.filter((item) =>
      [filters.audience, "unisex"].includes(item.metadata.clothing.audience),
    );
  }
  result = result.filter((item) =>
    item.variants?.some((variantItem) => variantMatches(variantItem, item, filters)),
  );

  const minimumMatchingPrice = (item) =>
    Math.min(
      ...item.variants
        .filter((variantItem) => variantMatches(variantItem, item, filters))
        .map(variantPrice),
    );
  if (filters.sort === "newest") {
    result.sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
  } else if (filters.sort === "price_asc" || filters.sort === "price_desc") {
    const direction = filters.sort === "price_asc" ? 1 : -1;
    result.sort(
      (left, right) =>
        direction * (minimumMatchingPrice(left) - minimumMatchingPrice(right)) ||
        left.id.localeCompare(right.id),
    );
  }

  const facets = {
    sizes: [
      ...new Set(
        result.flatMap((item) =>
          item.variants.map((variantItem) => variantOptionValue(variantItem, "Size", item)),
        ),
      ),
    ]
      .filter(Boolean)
      .sort(),
    colours: [
      ...new Set(
        result.flatMap((item) =>
          item.variants.map((variantItem) => variantOptionValue(variantItem, "Colour", item)),
        ),
      ),
    ]
      .filter(Boolean)
      .sort(),
  };
  const sliced = result.slice(offset, offset + limit);
  return { products: clone(sliced), count: result.length, offset, limit, facets };
}

let allowedOrigin = "http://localhost:3000";

function send(res, status, body = {}) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Accept,Authorization,x-publishable-api-key",
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(body));
}

function notFound(res) {
  send(res, 404, { message: "Not found" });
}

function readJson(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

function createCart() {
  const cart = {
    id: `cart_${randomUUID().slice(0, 8)}`,
    currency_code: "kes",
    region,
    items: [],
    shipping_methods: [],
    promotions: [],
    metadata: {},
    total: 0,
    subtotal: 0,
    discount_total: 0,
    shipping_total: 0,
    tax_total: 0,
    item_total: 0,
  };
  carts.set(cart.id, cart);
  return cart;
}

function findVariant(variantId) {
  for (const item of products) {
    const variantItem = item.variants?.find(
      (variantCandidate) => variantCandidate.id === variantId,
    );
    if (variantItem) return { product: item, variant: variantItem };
  }
  return null;
}

function recalcCart(cart) {
  cart.item_subtotal = cart.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  cart.shipping_total = (cart.shipping_methods ?? []).reduce(
    (sum, method) => sum + method.amount,
    0,
  );
  const hasDiscount = (cart.promotions ?? []).some(
    (promo) => promo.code.toUpperCase() === "AZANI10",
  );
  cart.shipping_subtotal = cart.shipping_total;
  cart.subtotal = cart.item_subtotal + cart.shipping_subtotal;
  cart.discount_subtotal = hasDiscount ? Math.round(cart.item_subtotal * 0.1) : 0;
  cart.discount_total = cart.discount_subtotal;
  cart.item_total = cart.item_subtotal - cart.discount_subtotal;
  cart.tax_total = 0;
  cart.total = Math.max(cart.subtotal - cart.discount_total, 0);
  return cart;
}

function makeLineItem(productItem, variantItem, quantity) {
  const unitPrice =
    variantItem.calculated_price?.calculated_amount ??
    variantItem.prices?.find((price) => price.currency_code === "kes")?.amount ??
    0;
  return {
    id: `item_${randomUUID().slice(0, 8)}`,
    title: `${productItem.title}${variantItem.title === "Default variant" ? "" : ` - ${variantItem.title}`}`,
    description: variantItem.title,
    thumbnail: productItem.thumbnail,
    quantity,
    variant_id: variantItem.id,
    product_id: productItem.id,
    unit_price: unitPrice,
    original_total: unitPrice * quantity,
    total: unitPrice * quantity,
    subtotal: unitPrice * quantity,
    discount_total: 0,
    tax_total: 0,
    variant: {
      ...clone(variantItem),
      product: { id: productItem.id, thumbnail: productItem.thumbnail, images: productItem.images },
    },
    product: clone(productItem),
  };
}

function updateLineTotals(item) {
  item.original_total = item.unit_price * item.quantity;
  item.total = item.unit_price * item.quantity;
  item.subtotal = item.unit_price * item.quantity;
  return item;
}

function requireCustomer(req) {
  const auth = req.headers.authorization ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  return tokens.has(token) ? customer : null;
}

function listProducts(url) {
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const handle = url.searchParams.get("handle");
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const ids = getSearchValues(url, "id");
  const categoryIds = getSearchValues(url, "category_id");

  let result = [...products];
  if (handle) result = result.filter((item) => item.handle === handle);
  if (ids.length > 0) result = result.filter((item) => ids.includes(item.id));
  if (categoryIds.length > 0) {
    result = result.filter((item) => item.categories?.some((cat) => categoryIds.includes(cat.id)));
  }
  if (q) {
    result = result.filter((item) =>
      [item.title, item.description, ...(item.tags ?? []).map((tag) => tag.value)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }

  const sliced = result.slice(offset, offset + limit);
  return { products: clone(sliced), count: result.length, offset, limit };
}

function shippingOptionsFor(cart) {
  const subtotal = cart?.item_subtotal ?? 0;
  return [
    { id: "so_free", name: "Free Shipping", amount: subtotal >= 5000 ? 0 : 0, provider_id: "mock" },
    { id: "so_standard", name: "Standard Shipping", amount: 150, provider_id: "mock" },
    { id: "so_express", name: "Express Shipping", amount: 500, provider_id: "mock" },
  ];
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && /^http:\/\/localhost:\d+$/.test(origin)) allowedOrigin = origin;
  if (req.method === "OPTIONS") return send(res, 204);

  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/+/, "");
  const body = ["POST", "PUT", "DELETE"].includes(req.method ?? "") ? await readJson(req) : {};

  try {
    if (req.method === "GET" && path === "store/regions") {
      return send(res, 200, { regions: [region], count: 1 });
    }

    if (req.method === "GET" && path === "store/clothing-products") {
      return send(res, 200, listClothingProducts(url));
    }

    if (req.method === "GET" && path.startsWith("store/clothing-products/")) {
      const id = path.split("/").pop();
      const item = productsById.get(id);
      return item && isClothingProduct(item)
        ? send(res, 200, { product: clone(item) })
        : notFound(res);
    }

    if (req.method === "GET" && path === "store/clothing-categories") {
      const handle = url.searchParams.get("handle");
      const list = handle ? [categoryByHandle.get(handle)].filter(Boolean) : categories;
      return send(res, 200, {
        product_categories: clone(list),
        count: list.length,
        offset: 0,
        limit: Number(url.searchParams.get("limit") ?? 100),
      });
    }

    if (req.method === "GET" && path === "store/products") {
      return send(res, 200, listProducts(url));
    }

    if (req.method === "GET" && path.startsWith("store/products/")) {
      const id = path.split("/").pop();
      const item = productsById.get(id);
      return item ? send(res, 200, { product: clone(item) }) : notFound(res);
    }

    if (req.method === "GET" && path === "store/product-categories") {
      const handle = url.searchParams.get("handle");
      const list = handle ? [categoryByHandle.get(handle)].filter(Boolean) : categories;
      return send(res, 200, {
        product_categories: clone(list),
        count: list.length,
        offset: 0,
        limit: Number(url.searchParams.get("limit") ?? 100),
      });
    }

    if (req.method === "POST" && path === "store/carts") {
      return send(res, 200, { cart: clone(recalcCart(createCart())) });
    }

    const cartMatch = path.match(/^store\/carts\/([^/]+)(?:\/(.*))?$/);
    if (cartMatch) {
      const cart = carts.get(cartMatch[1]);
      if (!cart) return notFound(res);
      const subPath = cartMatch[2] ?? "";

      if (req.method === "GET" && !subPath)
        return send(res, 200, { cart: clone(recalcCart(cart)) });

      if (req.method === "POST" && !subPath) {
        Object.assign(cart, body);
        return send(res, 200, { cart: clone(recalcCart(cart)) });
      }

      if (req.method === "POST" && subPath === "line-items") {
        const found = findVariant(body.variant_id);
        if (!found) return notFound(res);
        const existing = cart.items.find((item) => item.variant_id === body.variant_id);
        if (existing) {
          existing.quantity += Number(body.quantity ?? 1);
          updateLineTotals(existing);
        } else {
          cart.items.push(makeLineItem(found.product, found.variant, Number(body.quantity ?? 1)));
        }
        return send(res, 200, { cart: clone(recalcCart(cart)) });
      }

      const lineMatch = subPath.match(/^line-items\/([^/]+)$/);
      if (lineMatch && req.method === "POST") {
        const item = cart.items.find((lineItem) => lineItem.id === lineMatch[1]);
        if (!item) return notFound(res);
        item.quantity = Number(body.quantity ?? item.quantity);
        if (item.quantity <= 0)
          cart.items = cart.items.filter((lineItem) => lineItem.id !== item.id);
        else updateLineTotals(item);
        return send(res, 200, { cart: clone(recalcCart(cart)) });
      }

      if (lineMatch && req.method === "DELETE") {
        cart.items = cart.items.filter((lineItem) => lineItem.id !== lineMatch[1]);
        return send(res, 200, { cart: clone(recalcCart(cart)) });
      }

      if (subPath === "promotions") {
        if (req.method === "POST") {
          const codes = body.promo_codes ?? [];
          cart.promotions = Array.from(
            new Set([...(cart.promotions ?? []).map((promo) => promo.code), ...codes]),
          ).map((code) => ({ code }));
          return send(res, 200, { cart: clone(recalcCart(cart)) });
        }
        if (req.method === "DELETE") {
          const codes = new Set(body.promo_codes ?? []);
          cart.promotions = (cart.promotions ?? []).filter((promo) => !codes.has(promo.code));
          return send(res, 200, { cart: clone(recalcCart(cart)) });
        }
      }

      if (subPath === "shipping-methods" && req.method === "POST") {
        const option = shippingOptionsFor(cart).find((item) => item.id === body.option_id);
        if (!option) return notFound(res);
        cart.shipping_methods = [
          {
            id: `ship_${randomUUID().slice(0, 8)}`,
            name: option.name,
            amount: option.amount,
            shipping_option_id: option.id,
          },
        ];
        return send(res, 200, { cart: clone(recalcCart(cart)) });
      }

      if (subPath === "complete" && req.method === "POST") {
        // This synthetic server has no bank callback confirmation mechanism.
        // Never turn its pending fixtures into an unpaid order.
        return send(res, 400, {
          type: "payment_not_confirmed",
          message:
            "The mock server cannot confirm Family Bank payment. Use mocked unit tests for successful checkout.",
        });
      }
    }

    if (req.method === "GET" && path === "store/shipping-options") {
      const cart = carts.get(url.searchParams.get("cart_id"));
      return send(res, 200, { shipping_options: shippingOptionsFor(cart) });
    }

    if (req.method === "POST" && path === "store/payment-collections") {
      return send(res, 200, {
        payment_collection: { id: `paycol_${randomUUID().slice(0, 8)}`, payment_sessions: [] },
      });
    }

    if (
      req.method === "POST" &&
      path.match(/^store\/payment-collections\/[^/]+\/payment-sessions$/)
    ) {
      if (body.provider_id !== "pp_family_bank_family_bank") {
        return send(res, 400, { message: "Only Family Bank payments are available" });
      }
      return send(res, 200, {
        payment_collection: {
          id: path.split("/")[1],
          payment_sessions: [
            {
              id: `payses_${randomUUID().slice(0, 8)}`,
              provider_id: "pp_family_bank_family_bank",
              status: "pending",
            },
          ],
        },
      });
    }

    if (req.method === "POST" && path === "auth/customer/emailpass") {
      const token = `mock_token_${randomUUID().slice(0, 8)}`;
      customer.email = body.email ?? customer.email;
      tokens.set(token, customer.id);
      return send(res, 200, { token });
    }

    if (req.method === "POST" && path === "auth/customer/emailpass/register") {
      const token = `mock_token_${randomUUID().slice(0, 8)}`;
      customer.email = body.email ?? customer.email;
      tokens.set(token, customer.id);
      return send(res, 200, { token });
    }

    if (req.method === "POST" && path === "store/customers") {
      const authed = requireCustomer(req);
      if (!authed) return send(res, 401, { message: "Unauthorized" });
      Object.assign(customer, body, { has_account: true });
      return send(res, 200, { customer: clone(customer) });
    }

    if (path === "store/customers/me") {
      const authed = requireCustomer(req);
      if (!authed) return send(res, 401, { message: "Unauthorized" });
      if (req.method === "GET") return send(res, 200, { customer: clone(customer) });
      if (req.method === "POST") {
        Object.assign(customer, body);
        return send(res, 200, { customer: clone(customer) });
      }
    }

    if (path === "store/customers/me/addresses") {
      const authed = requireCustomer(req);
      if (!authed) return send(res, 401, { message: "Unauthorized" });
      if (req.method === "GET")
        return send(res, 200, { addresses: clone(customer.addresses ?? []) });
      if (req.method === "POST") {
        const address = { ...body, id: `addr_${randomUUID().slice(0, 8)}` };
        customer.addresses = [...(customer.addresses ?? []), address];
        return send(res, 200, { address: clone(address) });
      }
    }

    const addressMatch = path.match(/^store\/customers\/me\/addresses\/([^/]+)$/);
    if (addressMatch) {
      const authed = requireCustomer(req);
      if (!authed) return send(res, 401, { message: "Unauthorized" });
      if (req.method === "POST") {
        const address = customer.addresses.find((item) => item.id === addressMatch[1]);
        if (!address) return notFound(res);
        Object.assign(address, body);
        return send(res, 200, { address: clone(address) });
      }
      if (req.method === "DELETE") {
        customer.addresses = customer.addresses.filter((item) => item.id !== addressMatch[1]);
        return send(res, 200, {});
      }
    }

    if (req.method === "GET" && path === "store/orders") {
      const authed = requireCustomer(req);
      if (!authed) return send(res, 401, { message: "Unauthorized" });
      return send(res, 200, { orders: clone(orders) });
    }

    if (req.method === "GET" && path.startsWith("store/orders/")) {
      const authed = requireCustomer(req);
      if (!authed) return send(res, 401, { message: "Unauthorized" });
      const order = orders.find((item) => item.id === path.split("/").pop());
      return order ? send(res, 200, { order: clone(order) }) : notFound(res);
    }

    if (req.method === "POST" && path === "auth/customer/emailpass/reset-password")
      return send(res, 200, {});
    if (req.method === "POST" && path === "auth/customer/emailpass/update")
      return send(res, 200, {});
    if (req.method === "POST" && path === "store/customers/verify")
      return send(res, 200, { message: "ok", verified: true });
    if (req.method === "POST" && path === "store/customers/resend-verification")
      return send(res, 200, { message: "sent" });

    return notFound(res);
  } catch (error) {
    console.error(error);
    return send(res, error?.status === 400 ? 400 : 500, {
      message: error instanceof Error ? error.message : "Mock server error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Mock Medusa API listening on http://localhost:${PORT}`);
  console.log("Demo login accepts any email/password. Promo code: AZANI10.");
});
