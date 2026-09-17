import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test-utils";
import { mockProduct } from "../fixtures";
import { ProductDetail } from "@/components/product-detail";
import { ProductCard } from "@/components/product-card";
const add = vi.fn();
const product = {
  ...mockProduct,
  options: [
    {
      id: "size",
      title: "Size",
      product_id: mockProduct.id,
      values: [
        { id: "s4", option_id: "size", value: "4 years" },
        { id: "s6", option_id: "size", value: "6 years" },
      ],
    },
  ],
  variants: [4, 6].map((age) => ({
    ...mockProduct.variants![0],
    id: `v${age}`,
    title: `${age} years`,
    options: [{ id: `s${age}`, option_id: "size", value: `${age} years` }],
    inventory_quantity: 5,
    manage_inventory: true,
    metadata: { clothing: { age_min: age, age_max: age } },
  })),
  metadata: { clothing: { audience: "unisex", material: "Cotton", care: "Machine wash" } },
};
vi.mock("@/lib/medusa-api", () => ({
  getProductById: vi.fn(async () => ({ product })),
  getCart: vi.fn(async () => null),
  getWishlistProductIds: vi.fn(async () => []),
  toggleWishlistProduct: vi.fn(),
  addToCart: (...args: unknown[]) => add(...args),
  getProducts: vi.fn(async () => ({ products: [] })),
}));
describe("Clothing selection", () => {
  it("requires a deliberate size choice before adding clothing", async () => {
    renderWithProviders(<ProductDetail productId={product.id} onBack={() => {}} />);
    const button = await screen.findByRole("button", { name: "Choose size and colour" });
    expect(button).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "6 years" }));
    await userEvent.click(screen.getByRole("button", { name: "Add to Cart" }));
    expect(add).toHaveBeenCalledWith("v6", 1);
  });
  it("cards lead to size selection instead of adding an arbitrary variant", () => {
    renderWithProviders(<ProductCard product={product} />);
    expect(screen.getByRole("link", { name: "Choose size" })).toHaveAttribute(
      "href",
      `/products/${product.id}`,
    );
    expect(screen.queryByRole("button", { name: "Add to cart" })).not.toBeInTheDocument();
  });
});
