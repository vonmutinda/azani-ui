import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";

const port = 9101;
const baseUrl = `http://127.0.0.1:${port}`;
let server;

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json();
  return { response, body };
}

before(async () => {
  server = spawn(process.execPath, ["scripts/mock-medusa-server.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, MOCK_MEDUSA_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("mock server startup timed out")), 5_000);
    server.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`mock server exited during startup with code ${code}`));
    });
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes(`localhost:${port}`)) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
});

after(async () => {
  if (!server || server.exitCode !== null) return;
  server.kill("SIGTERM");
  await new Promise((resolve) => server.once("exit", resolve));
});

test("clothing categories expose the seven populated garment departments", async () => {
  const { response, body } = await request("/store/clothing-categories");

  assert.equal(response.status, 200);
  assert.deepEqual(
    body.product_categories.map((category) => category.handle),
    [
      "tops",
      "bottoms",
      "dresses-jumpsuits",
      "sets-outfits",
      "knitwear-outerwear",
      "sleepwear",
      "underwear-socks",
    ],
  );
  assert.equal(body.count, 7);
});

test("clothing products carry QA garment metadata and real size-colour combinations", async () => {
  const { response, body } = await request("/store/clothing-products?limit=100");

  assert.equal(response.status, 200);
  assert.ok(body.products.length >= 7);
  assert.ok(body.products.every((product) => product.title.startsWith("QA ")));
  assert.ok(
    body.products.every((product) =>
      ["girls", "boys", "unisex"].includes(product.metadata.clothing.audience),
    ),
  );
  assert.ok(
    body.products.every((product) => product.thumbnail === null && product.images.length === 0),
  );
  assert.ok(
    body.products.every((product) =>
      product.variants.every(
        (variant) =>
          Number.isInteger(variant.metadata.clothing.age_min) &&
          Number.isInteger(variant.metadata.clothing.age_max) &&
          variant.options.some((option) => option.option_id.endsWith("_size")) &&
          variant.options.some((option) => option.option_id.endsWith("_colour")),
      ),
    ),
  );
  assert.deepEqual(body.facets.sizes, [...body.facets.sizes].sort());
  assert.deepEqual(body.facets.colours, [...body.facets.colours].sort());
});

test("audience, age, size, colour, stock, price, and sale filters compose on one variant", async () => {
  const girls = await request("/store/clothing-products?audience=girls&limit=100");
  assert.ok(girls.body.products.some((product) => product.metadata.clothing.audience === "unisex"));
  assert.ok(
    girls.body.products.every((product) =>
      ["girls", "unisex"].includes(product.metadata.clothing.audience),
    ),
  );

  const boys = await request("/store/clothing-products?audience=boys&limit=100");
  assert.ok(boys.body.products.some((product) => product.metadata.clothing.audience === "unisex"));
  assert.ok(
    boys.body.products.every((product) =>
      ["boys", "unisex"].includes(product.metadata.clothing.audience),
    ),
  );

  const exactVariant = await request(
    "/store/clothing-products?age=5-8&size=6-7%20Years&colour=Navy&availability=in_stock&price=1000-5000&sale=true",
  );
  assert.deepEqual(
    exactVariant.body.products.map((product) => product.handle),
    ["qa-unisex-fleece-set"],
  );
  const matchingVariants = exactVariant.body.products[0].variants.filter((variant) => {
    const values = variant.options.map((option) => option.value);
    return (
      variant.metadata.clothing.age_min <= 8 &&
      variant.metadata.clothing.age_max >= 5 &&
      values.includes("6-7 Years") &&
      values.includes("Navy") &&
      variant.inventory_quantity > 0 &&
      variant.calculated_price.calculated_amount >= 1000 &&
      variant.calculated_price.calculated_amount <= 5000 &&
      variant.calculated_price.original_amount > variant.calculated_price.calculated_amount
    );
  });
  assert.equal(matchingVariants.length, 1);

  const splitAcrossVariants = await request(
    "/store/clothing-products?size=6-7%20Years&colour=Rust&availability=in_stock",
  );
  assert.ok(
    !splitAcrossVariants.body.products.some((product) => product.handle === "qa-unisex-fleece-set"),
  );
});

test("sorting happens before pagination and legacy list filters still compose", async () => {
  const sorted = await request("/store/clothing-products?sort=price_desc&limit=2&offset=1");
  const allSorted = await request("/store/clothing-products?sort=price_desc&limit=100");
  assert.deepEqual(
    sorted.body.products.map((product) => product.id),
    allSorted.body.products.slice(1, 3).map((product) => product.id),
  );

  const target = allSorted.body.products.find(
    (product) => product.handle === "qa-unisex-fleece-set",
  );
  const categoryId = target.categories[0].id;
  const filtered = await request(
    `/store/clothing-products?id[]=${target.id}&category_id[]=${categoryId}&handle=${target.handle}&q=fleece`,
  );
  assert.deepEqual(
    filtered.body.products.map((product) => product.id),
    [target.id],
  );
});

test("clothing detail is available while invalid filters return 400", async () => {
  const detail = await request("/store/clothing-products/prod_qa_fleece_set");
  assert.equal(detail.response.status, 200);
  assert.equal(detail.body.product.metadata.clothing.audience, "unisex");

  for (const path of [
    "/store/clothing-products?audience=adults",
    "/store/clothing-products?age=0-1",
    "/store/clothing-products?availability=preorder",
    "/store/clothing-products?price=free",
    "/store/clothing-products?sort=random",
  ]) {
    const invalid = await request(path);
    assert.equal(invalid.response.status, 400);
  }
});

test("existing commerce product route remains available", async () => {
  const { response, body } = await request("/store/products?limit=1");
  assert.equal(response.status, 200);
  assert.equal(body.products.length, 1);
});

test("mock checkout rejects legacy/default providers and unconfirmed orders", async () => {
  for (const provider_id of [undefined, "pp_system_default", "pp_mpesa_mpesa"]) {
    const response = await fetch(`${baseUrl}/store/payment-collections/pc_test/payment-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id }),
    });
    assert.equal(response.status, 400);
  }
  const cartResponse = await fetch(`${baseUrl}/store/carts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ region_id: "reg_ke" }),
  });
  const { cart } = await cartResponse.json();
  const response = await fetch(`${baseUrl}/store/carts/${cart.id}/complete`, { method: "POST" });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).type, "payment_not_confirmed");
});

test("unisex is an accepted audience and excludes girls-only and boys-only garments", async () => {
  const { response, body } = await request("/store/clothing-products?audience=unisex&limit=100");
  assert.equal(response.status, 200);
  assert.ok(body.products.length > 0);
  assert.ok(body.products.every((product) => product.metadata.clothing.audience === "unisex"));
});
