import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClothingFit } from "@/components/clothing-fit";
import { mockProduct } from "../fixtures";
import type { MedusaProduct } from "@/types/medusa";

const product: MedusaProduct = {
  ...mockProduct,
  options: [
    {
      id: "size",
      title: "Size",
      product_id: mockProduct.id,
      values: [{ id: "s4", option_id: "size", value: "4 years" }],
    },
  ],
  variants: [
    {
      ...mockProduct.variants![0],
      options: [{ id: "s4", option_id: "size", value: "4 years" }],
      metadata: { clothing: { age_min: 3, age_max: 4 } },
    },
  ],
  metadata: { clothing: { material: "Cotton", care: "Machine wash" } },
};

async function openGuide() {
  await userEvent.click(screen.getByText("Size & fit guide"));
}

describe("ClothingFit", () => {
  it("offers supplier labels and contact help instead of an empty measurement table", async () => {
    render(<ClothingFit product={product} />);
    await openGuide();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("4 years")).toBeVisible();
    expect(screen.getByText(/3–4 years/)).toBeVisible();
    expect(screen.getByText(/measurements.*not.*supplied/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /sizing help/i })).toHaveAttribute("href", "/contact");
    expect(screen.queryByText("Not supplied")).not.toBeInTheDocument();
  });

  it("shows supplied child height measurements with their supplier size label", async () => {
    render(
      <ClothingFit
        product={{
          ...product,
          variants: [
            {
              ...product.variants![0],
              metadata: {
                clothing: {
                  age_min: 3,
                  age_max: 4,
                  height_min_cm: 98,
                  height_max_cm: 104,
                },
              },
            },
          ],
        }}
      />,
    );
    await openGuide();
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Child height" })).toBeInTheDocument();
    expect(within(table).getByText("98–104 cm")).toBeInTheDocument();
    expect(within(table).getByText("4 years")).toBeInTheDocument();
  });

  it("keeps material and care visible before opening sizing help", () => {
    render(<ClothingFit product={product} />);
    expect(screen.getByText("Cotton")).toBeVisible();
    expect(screen.getByText("Machine wash")).toBeVisible();
  });

  it("preserves supplier labels when no age or height metadata is provided", async () => {
    render(
      <ClothingFit
        product={{
          ...product,
          variants: [{ ...product.variants![0], metadata: {} }],
        }}
      />,
    );
    await openGuide();
    expect(screen.getByText("4 years")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sizing help/i })).toHaveAttribute("href", "/contact");
  });
});
