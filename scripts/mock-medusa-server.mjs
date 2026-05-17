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

function category(id, name, handle, rank, children = [], parentId = null) {
  return {
    id,
    name,
    handle,
    rank,
    parent_category_id: parentId,
    description: `${name} essentials for babies and parents.`,
    created_at: now(),
    updated_at: now(),
    category_children: children.map((child) => ({ ...child, parent_category_id: id })),
  };
}

const categories = [
  category("pcat_feeding", "Feeding", "feeding", 0, [
    category("pcat_bottles", "Bottles & Sippy Cups", "bottles-sippy-cups", 0),
    category("pcat_formula", "Baby Formula", "baby-formula", 1),
    category("pcat_weaning", "Weaning Essentials", "weaning-essentials", 2),
  ]),
  category("pcat_bath_diapering", "Bath & Diapering", "bath-diapering", 1, [
    category("pcat_diapers", "Diapers & Pull-Ups", "diapers-pull-ups", 0),
    category("pcat_wipes", "Wipes", "wipes", 1),
    category("pcat_bath_tubs", "Bath Tubs & Seats", "bath-tubs-seats", 2),
  ]),
  category("pcat_nursery", "Nursery", "nursery", 2, [
    category("pcat_cribs", "Cribs & Bassinets", "cribs-bassinets", 0),
    category("pcat_bedding", "Mattresses & Bedding", "mattresses-bedding", 1),
    category("pcat_monitors", "Monitors & Night Lights", "monitors-night-lights", 2),
  ]),
  category("pcat_baby_gear", "Baby Gear", "baby-gear", 3, [
    category("pcat_strollers", "Strollers", "strollers", 0),
    category("pcat_car_seats", "Car Seats", "car-seats", 1),
    category("pcat_carriers", "Baby Carriers & Wraps", "baby-carriers-wraps", 2),
  ]),
  category("pcat_clothing", "Clothing", "clothing", 4, [
    category("pcat_onesies", "Bodysuits & Onesies", "bodysuits-onesies", 0),
    category("pcat_sleepwear", "Sleepwear & Pajamas", "sleepwear-pajamas", 1),
    category("pcat_socks", "Socks & Shoes", "socks-shoes", 2),
  ]),
  category("pcat_toys_books", "Toys & Books", "toys-books", 5, [
    category("pcat_teethers", "Rattles & Teethers", "rattles-teethers", 0),
    category("pcat_books", "Books & Learning", "books-learning", 1),
    category("pcat_stackers", "Building & Stacking Toys", "building-stacking-toys", 2),
  ]),
  category("pcat_mom", "Mom & Maternity", "mom-maternity", 6, [
    category("pcat_nursing", "Nursing Tops & Bras", "nursing-tops-bras", 0),
    category("pcat_pillows", "Nursing Pillows", "nursing-pillows", 1),
    category("pcat_self_care", "Mom Self Care", "mom-self-care", 2),
  ]),
];

function flattenCategories(list) {
  return list.flatMap((cat) => [cat, ...flattenCategories(cat.category_children ?? [])]);
}

const flatCategories = flattenCategories(categories);
const categoryByHandle = new Map(flatCategories.map((cat) => [cat.handle, cat]));

function money(amount, id) {
  return { id: `price_${id}`, amount, currency_code: "kes" };
}

function variant(productId, idx, title, amount, inventory = 12, options = []) {
  return {
    id: `variant_${productId}_${idx}`,
    title,
    sku: `${productId.toUpperCase()}-${idx}`,
    inventory_quantity: inventory,
    manage_inventory: true,
    allow_backorder: false,
    options,
    prices: [money(amount, `${productId}_${idx}`)],
    calculated_price: {
      calculated_amount: amount,
      original_amount: Math.round(amount * 1.12),
      currency_code: "kes",
    },
  };
}

function product({
  id,
  title,
  handle,
  description,
  image,
  categoryHandles,
  price,
  variants = [],
  createdDaysAgo = 10,
}) {
  const cats = categoryHandles.map((handle) => categoryByHandle.get(handle)).filter(Boolean);
  const option = {
    id: `opt_${id}_size`,
    title: "Option",
    product_id: id,
    values: variants.map((item, index) => ({
      id: `optval_${id}_${index}`,
      option_id: `opt_${id}_size`,
      value: item.title,
    })),
  };
  const productVariants =
    variants.length > 0
      ? variants.map((item, index) =>
          variant(id, index + 1, item.title, item.price, item.inventory, [
            { id: `optval_${id}_${index}`, option_id: option.id, value: item.title },
          ]),
        )
      : [variant(id, 1, "Default variant", price)];

  return {
    id,
    title,
    handle,
    description,
    thumbnail: image,
    status: "published",
    is_giftcard: false,
    discountable: true,
    images: [
      { id: `img_${id}_1`, url: image },
      { id: `img_${id}_2`, url: `${image}&sat=-15` },
    ],
    options: variants.length > 0 ? [option] : [],
    variants: productVariants,
    categories: cats,
    tags: cats.map((cat) => ({ id: `tag_${cat.handle}`, value: cat.name })),
    created_at: new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: now(),
  };
}

const products = [
  product({
    id: "prod_pampers",
    title: "Pampers Premium Care Diapers",
    handle: "pampers-premium-care-diapers",
    description:
      "Soft overnight diapers with breathable layers, stretchy sides, and wetness indicators for everyday use.",
    image:
      "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=900&q=80",
    categoryHandles: ["bath-diapering", "diapers-pull-ups"],
    variants: [
      { title: "Size 2 - 36 Count", price: 1890, inventory: 8 },
      { title: "Size 3 - 48 Count", price: 2590, inventory: 3 },
      { title: "Size 4 - 48 Count", price: 2790, inventory: 16 },
    ],
    createdDaysAgo: 4,
  }),
  product({
    id: "prod_wipes",
    title: "WaterWipes Sensitive Baby Wipes",
    handle: "waterwipes-sensitive-baby-wipes",
    description: "Fragrance-free wipes for sensitive newborn skin, packed for nursery and travel.",
    image:
      "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80",
    categoryHandles: ["bath-diapering", "wipes"],
    variants: [
      { title: "Single Pack", price: 420, inventory: 18 },
      { title: "6 Pack Bundle", price: 2190, inventory: 9 },
    ],
    createdDaysAgo: 18,
  }),
  product({
    id: "prod_bottle",
    title: "Anti-Colic Feeding Bottle Set",
    handle: "anti-colic-feeding-bottle-set",
    description: "A starter bottle set with slow-flow nipples and easy-clean anti-colic valves.",
    image:
      "https://images.unsplash.com/photo-1615486511484-92e172cc4fe0?auto=format&fit=crop&w=900&q=80",
    categoryHandles: ["feeding", "bottles-sippy-cups"],
    variants: [
      { title: "2 Bottles", price: 1450, inventory: 14 },
      { title: "4 Bottles", price: 2690, inventory: 6 },
    ],
    createdDaysAgo: 6,
  }),
  product({
    id: "prod_highchair",
    title: "Foldable Baby High Chair",
    handle: "foldable-baby-high-chair",
    description:
      "Compact high chair with wipe-clean tray, adjustable footrest, and sturdy harness.",
    image:
      "https://images.unsplash.com/photo-1569530593440-eab003a255b8?auto=format&fit=crop&w=900&q=80",
    categoryHandles: ["feeding", "weaning-essentials"],
    price: 8490,
    createdDaysAgo: 42,
  }),
  product({
    id: "prod_car_seat",
    title: "Convertible Infant Car Seat",
    handle: "convertible-infant-car-seat",
    description:
      "Rear-facing infant seat with cushioned newborn insert and side impact protection.",
    image:
      "https://images.unsplash.com/photo-1591348278999-ee1d0c06ed7b?auto=format&fit=crop&w=900&q=80",
    categoryHandles: ["baby-gear", "car-seats"],
    price: 18500,
    createdDaysAgo: 22,
  }),
  product({
    id: "prod_blanket",
    title: "Organic Cotton Swaddle Blankets",
    handle: "organic-cotton-swaddle-blankets",
    description: "A breathable four-pack of cotton muslin swaddles in soft neutral prints.",
    image:
      "https://images.unsplash.com/photo-1546015720-b8b30df5aa27?auto=format&fit=crop&w=900&q=80",
    categoryHandles: ["nursery", "mattresses-bedding"],
    variants: [
      { title: "Neutral Pack", price: 2390, inventory: 10 },
      { title: "Safari Pack", price: 2490, inventory: 4 },
    ],
    createdDaysAgo: 2,
  }),
  product({
    id: "prod_onesies",
    title: "Newborn Onesies Gift Set",
    handle: "newborn-onesies-gift-set",
    description: "Five cotton bodysuits with envelope necklines and easy snap closures.",
    image:
      "https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=80",
    categoryHandles: ["clothing", "bodysuits-onesies"],
    variants: [
      { title: "0-3 Months", price: 1990, inventory: 11 },
      { title: "3-6 Months", price: 1990, inventory: 7 },
      { title: "6-9 Months", price: 2090, inventory: 0 },
    ],
    createdDaysAgo: 8,
  }),
  product({
    id: "prod_stacker",
    title: "Wooden Rainbow Stacker",
    handle: "wooden-rainbow-stacker",
    description: "Smooth wooden stacking toy for sorting, balancing, and open-ended play.",
    image:
      "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=900&q=80",
    categoryHandles: ["toys-books", "building-stacking-toys"],
    price: 1750,
    createdDaysAgo: 31,
  }),
  product({
    id: "prod_nursing_pillow",
    title: "Ergonomic Nursing Pillow",
    handle: "ergonomic-nursing-pillow",
    description: "Firm support pillow with washable cover for feeding and tummy-time support.",
    image:
      "https://images.unsplash.com/photo-1590649880765-91b1956b8276?auto=format&fit=crop&w=900&q=80",
    categoryHandles: ["mom-maternity", "nursing-pillows"],
    price: 3490,
    createdDaysAgo: 12,
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
  metadata: { email_verified: true, wishlist_product_ids: ["prod_blanket"] },
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

function send(res, status, body = {}) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "http://localhost:3000",
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
  cart.subtotal = cart.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  cart.item_total = cart.subtotal;
  cart.shipping_total = (cart.shipping_methods ?? []).reduce(
    (sum, method) => sum + method.amount,
    0,
  );
  const hasDiscount = (cart.promotions ?? []).some(
    (promo) => promo.code.toUpperCase() === "AZANI10",
  );
  cart.discount_total = hasDiscount ? Math.round(cart.subtotal * 0.1) : 0;
  cart.tax_total = 0;
  cart.total = Math.max(cart.subtotal + cart.shipping_total - cart.discount_total, 0);
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
  const subtotal = cart?.subtotal ?? 0;
  return [
    { id: "so_free", name: "Free Shipping", amount: subtotal >= 5000 ? 0 : 0, provider_id: "mock" },
    { id: "so_standard", name: "Standard Shipping", amount: 150, provider_id: "mock" },
    { id: "so_express", name: "Express Shipping", amount: 500, provider_id: "mock" },
  ];
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204);

  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/+/, "");
  const body = ["POST", "PUT", "DELETE"].includes(req.method ?? "") ? await readJson(req) : {};

  try {
    if (req.method === "GET" && path === "store/regions") {
      return send(res, 200, { regions: [region], count: 1 });
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
        const order = {
          id: `order_${randomUUID().slice(0, 8)}`,
          display_id: 1000 + orders.length + 1,
          email: cart.email ?? "guest@azani.shop",
          currency_code: "kes",
          items: clone(cart.items),
          shipping_address: cart.shipping_address,
          total: cart.total,
          subtotal: cart.subtotal,
          shipping_total: cart.shipping_total,
          tax_total: cart.tax_total,
          discount_total: cart.discount_total,
          status: "pending",
          fulfillment_status: "not_fulfilled",
          payment_status: "awaiting",
          created_at: now(),
          metadata: {
            ...(cart.metadata ?? {}),
            order_ref: `AZN-2605-${String(orders.length + 1).padStart(3, "0")}D`,
          },
        };
        orders.unshift(order);
        carts.delete(cart.id);
        return send(res, 200, { type: "order", order: clone(order) });
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
      return send(res, 200, {
        payment_collection: {
          id: path.split("/")[1],
          payment_sessions: [
            {
              id: `payses_${randomUUID().slice(0, 8)}`,
              provider_id: body.provider_id ?? "pp_system_default",
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
    return send(res, 500, {
      message: error instanceof Error ? error.message : "Mock server error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Mock Medusa API listening on http://localhost:${PORT}`);
  console.log("Demo login accepts any email/password. Promo code: AZANI10.");
});
