import { beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import CartPage from "@/app/cart/page";
import { renderWithProviders } from "../test-utils";
import { mockCart, mockEmptyCart, mockProduct, mockCategory } from "../fixtures";

const api = vi.hoisted(() => ({
  getCart: vi.fn(),
  getProductsByIds: vi.fn(),
  getProducts: vi.fn(),
  getCategories: vi.fn(),
  addToCart: vi.fn(),
  updateLineItem: vi.fn(),
  removeLineItem: vi.fn(),
  addPromoCode: vi.fn(),
  removePromoCode: vi.fn(),
  getWishlistProductIds: vi.fn(),
  toggleWishlistProduct: vi.fn(),
}));
vi.mock("@/lib/medusa-api", () => api);
const tops = { ...mockCategory, id: "cat_tops", handle: "tops", category_children: [] };
const bottoms = { ...tops, id: "cat_bottoms", handle: "bottoms" };
const suggested = { ...mockProduct, id: "prod_suggested", title: "Suggested top", options: [] };
const currentProduct = { ...mockProduct, categories: [tops] };

beforeEach(() => {
  vi.resetAllMocks();
  api.getCart.mockResolvedValue(mockCart);
  api.getProductsByIds.mockResolvedValue([currentProduct]);
  api.getCategories.mockResolvedValue({ product_categories: [tops, bottoms] });
  api.getProducts.mockResolvedValue({ products: [mockProduct, suggested], count: 2 });
  api.getWishlistProductIds.mockResolvedValue([]);
  api.addToCart.mockResolvedValue({ cart: mockCart });
});

it("requests public categories of current cart products once and excludes cart products", async () => {
  api.getProductsByIds.mockResolvedValue([
    {
      ...currentProduct,
      categories: [tops, tops, bottoms, { ...tops, id: "cat_retired", handle: "feeding" }],
    },
  ]);
  renderWithProviders(<CartPage />);
  const recommendations = await screen.findByRole("region", { name: "You may also like" });
  expect(api.getProducts).toHaveBeenCalledWith({ category_id: [bottoms.id, tops.id], limit: 8 });
  expect(api.getProducts).toHaveBeenCalledTimes(1);
  expect(within(recommendations).getByText(suggested.title)).toBeInTheDocument();
  expect(within(recommendations).queryByText(mockProduct.title)).not.toBeInTheDocument();
});

it.each([
  { products: [] },
  { products: [{ ...mockProduct, categories: [] }] },
  {
    products: [
      { ...currentProduct, categories: [{ ...tops, id: "cat_retired", handle: "feeding" }] },
    ],
  },
])(
  "falls back to server clothing recommendations without usable categories %#",
  async ({ products }) => {
    api.getProductsByIds.mockResolvedValue(products);
    renderWithProviders(<CartPage />);
    await screen.findByRole("region", { name: "You may also like" });
    expect(api.getProducts).toHaveBeenCalledWith({ limit: 8 });
  },
);

it("falls back safely when product availability lookup fails", async () => {
  api.getProductsByIds.mockRejectedValue(new Error("catalogue unavailable"));
  renderWithProviders(<CartPage />);
  await screen.findByRole("region", { name: "You may also like" });
  expect(api.getProducts).toHaveBeenCalledWith({ limit: 8 });
  expect(screen.getByText(/couldn’t check item availability/i)).toBeInTheDocument();
});

it("falls back safely when public category lookup fails", async () => {
  api.getCategories.mockRejectedValue(new Error("categories unavailable"));
  renderWithProviders(<CartPage />);
  await screen.findByRole("region", { name: "You may also like" });
  expect(api.getProducts).toHaveBeenCalledWith({ limit: 8 });
});

it("makes no product or category recommendation requests for an empty cart", async () => {
  api.getCart.mockResolvedValue(mockEmptyCart);
  renderWithProviders(<CartPage />);
  await screen.findByText("Your cart is empty");
  expect(api.getProductsByIds).not.toHaveBeenCalled();
  expect(api.getProducts).not.toHaveBeenCalled();
  expect(api.getCategories).not.toHaveBeenCalled();
});

it("keeps the cart usable when recommendations fail", async () => {
  api.getProducts.mockRejectedValue(new Error("recommendations unavailable"));
  renderWithProviders(<CartPage />);
  await screen.findByRole("link", { name: "Proceed to Checkout" });
  await waitFor(() => expect(api.getProducts).toHaveBeenCalled());
  expect(screen.queryByRole("region", { name: "You may also like" })).not.toBeInTheDocument();
});

it("shows recommendations without allowing a pending payment to change the amount", async () => {
  localStorage.setItem(
    "azani_checkout_recovery",
    JSON.stringify({ cartId: mockCart.id, sessionId: "ps_pending", state: "unresolved" }),
  );
  renderWithProviders(<CartPage />);
  const recommendations = await screen.findByRole("region", { name: "You may also like" });
  const add = within(recommendations).getByRole("button", { name: "Add to cart" });
  expect(add).toBeDisabled();
  fireEvent.click(add);
  expect(api.addToCart).not.toHaveBeenCalled();
});

it("locks visible recommendation add controls when another tab starts a payment", async () => {
  renderWithProviders(<CartPage />);
  const recommendations = await screen.findByRole("region", { name: "You may also like" });
  const add = within(recommendations).getByRole("button", { name: "Add to cart" });
  expect(add).toBeEnabled();
  act(() => {
    localStorage.setItem(
      "azani_checkout_recovery",
      JSON.stringify({ cartId: mockCart.id, sessionId: "ps_pending", state: "unresolved" }),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: "azani_checkout_recovery" }));
  });
  expect(add).toBeDisabled();
  fireEvent.click(add);
  expect(api.addToCart).not.toHaveBeenCalled();
});

it("does not use unrelated cached cart products or reuse recommendations after cart identity changes", async () => {
  const { queryClient } = renderWithProviders(<CartPage />);
  await screen.findByRole("region", { name: "You may also like" });
  api.getProducts.mockClear();
  api.getProductsByIds.mockResolvedValue([{ ...mockProduct, categories: [bottoms] }]);
  act(() => {
    queryClient.setQueryData(
      ["cart-products", [mockProduct.id]],
      [{ ...mockProduct, categories: [tops] }],
    );
    queryClient.setQueryData(["cart"], { ...mockCart, id: "cart_other" });
  });
  await waitFor(() =>
    expect(api.getProducts).toHaveBeenCalledWith({ category_id: [bottoms.id], limit: 8 }),
  );
  expect(api.getProductsByIds).toHaveBeenCalledTimes(2);
  expect(api.getProducts).toHaveBeenCalledTimes(1);
});

it("excludes embedded cart product identities when line item product_id is absent", async () => {
  api.getCart.mockResolvedValue({
    ...mockCart,
    items: mockCart.items.map((item) => ({
      ...item,
      product_id: undefined,
      product: currentProduct,
    })),
  });
  renderWithProviders(<CartPage />);
  const recommendations = await screen.findByRole("region", { name: "You may also like" });
  expect(api.getProductsByIds).toHaveBeenCalledWith([mockProduct.id]);
  expect(within(recommendations).queryByText(mockProduct.title)).not.toBeInTheDocument();
});
