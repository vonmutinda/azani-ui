import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductDetail } from "@/components/product-detail";
import { renderWithProviders } from "../test-utils";
import { mockProduct } from "../fixtures";
import type { MedusaProduct } from "@/types/medusa";

const mockGetProductById = vi.fn();
const mockAddToCart = vi.fn();
const mockGetWishlistProductIds = vi.fn();
const mockToggleWishlistProduct = vi.fn();
const mockGetProducts = vi.fn();

vi.mock("@/lib/medusa-api", () => ({
  getProductById: (...args: unknown[]) => mockGetProductById(...args),
  addToCart: (...args: unknown[]) => mockAddToCart(...args),
  getCart: vi.fn().mockResolvedValue(null),
  getWishlistProductIds: (...args: unknown[]) => mockGetWishlistProductIds(...args),
  toggleWishlistProduct: (...args: unknown[]) => mockToggleWishlistProduct(...args),
  getProducts: (...args: unknown[]) => mockGetProducts(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWishlistProductIds.mockResolvedValue([]);
  mockToggleWishlistProduct.mockResolvedValue(["prod_01"]);
  mockGetProducts.mockResolvedValue({ products: [] });
});

afterEach(() => vi.unstubAllGlobals());

function makeColourProduct(): MedusaProduct {
  return {
    ...mockProduct,
    title: "Everyday Hooded Tracksuit",
    thumbnail: "https://example.com/mocha.png",
    images: [
      { id: "img_mocha", url: "https://example.com/mocha.png" },
      { id: "img_sand", url: "https://example.com/sand.png" },
    ],
    metadata: {
      colour_images: {
        Mocha: ["https://example.com/mocha.png"],
        Sand: ["https://example.com/sand.png"],
      },
    },
    options: [
      {
        id: "size",
        title: "Size",
        product_id: "prod_01",
        values: [
          { id: "size4", value: "4", option_id: "size" },
          { id: "size10", value: "10", option_id: "size" },
        ],
      },
      {
        id: "colour",
        title: "Colour",
        product_id: "prod_01",
        values: [
          { id: "mocha", value: "Mocha", option_id: "colour" },
          { id: "sand", value: "Sand", option_id: "colour" },
        ],
      },
    ],
    variants: ["4", "10"].flatMap((size) =>
      ["Mocha", "Sand"].map((colour) => ({
        ...mockProduct.variants![0],
        id: `${size}-${colour}`,
        title: `${size} / ${colour}`,
        manage_inventory: false,
        options: [
          { id: `size-${size}`, option_id: "size", value: size },
          { id: `colour-${colour}`, option_id: "colour", value: colour },
        ],
      })),
    ),
  };
}

describe("ProductDetail", () => {
  it("offers the mobile purchase action only after all options are chosen and adds that variant", async () => {
    let visibilityChanged: (entries: { isIntersecting: boolean }[]) => void = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: typeof visibilityChanged) {
          visibilityChanged = callback;
        }
        observe() {
          visibilityChanged([{ isIntersecting: false }]);
        }
        disconnect() {}
      },
    );
    mockGetProductById.mockResolvedValueOnce({ product: makeColourProduct() });
    mockAddToCart
      .mockRejectedValueOnce(new Error("Stock changed. Please try again."))
      .mockResolvedValue({ cart: { id: "cart_1", items: [] } });
    const user = userEvent.setup();
    renderWithProviders(<ProductDetail productId="prod_01" headingLevel={1} onBack={vi.fn()} />);
    await screen.findByRole("group", { name: "Size" });
    expect(screen.queryByRole("region", { name: "Selected outfit" })).not.toBeInTheDocument();
    await user.click(
      within(screen.getByRole("group", { name: "Size" })).getByRole("button", { name: "4" }),
    );
    expect(screen.queryByRole("region", { name: "Selected outfit" })).not.toBeInTheDocument();
    await user.click(
      within(screen.getByRole("group", { name: "Colour" })).getByRole("button", { name: "Sand" }),
    );
    act(() => visibilityChanged([{ isIntersecting: true }]));
    expect(screen.queryByRole("region", { name: "Selected outfit" })).not.toBeInTheDocument();
    act(() => visibilityChanged([{ isIntersecting: false }]));
    const purchase = screen.getByRole("region", { name: "Selected outfit" });
    expect(within(purchase).getByText(/Size: 4 · Colour: Sand/)).toBeInTheDocument();
    await user.click(within(purchase).getByRole("button", { name: "Add selected item to cart" }));
    expect(await within(purchase).findByRole("alert")).toHaveTextContent(
      "Stock changed. Please try again.",
    );
    await user.click(within(purchase).getByRole("button", { name: "Add selected item to cart" }));
    await waitFor(() => expect(mockAddToCart).toHaveBeenCalledTimes(2));
    expect(mockAddToCart).toHaveBeenLastCalledWith("4-Sand", 1);
    vi.unstubAllGlobals();
  });

  it("shows the selected colour before size selection and preserves manual browsing on size changes", async () => {
    const product = makeColourProduct();
    mockGetProductById.mockResolvedValueOnce({ product });
    const user = userEvent.setup();
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    const colourGroup = await screen.findByRole("group", { name: "Colour" });
    await user.click(within(colourGroup).getByRole("button", { name: "Sand" }));
    expect(screen.getByAltText(product.title)).toHaveAttribute(
      "src",
      "https://example.com/sand.png",
    );
    expect(screen.getByRole("button", { name: "Choose size and colour" })).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Show image 1 of Everyday Hooded Tracksuit" }),
    );
    await user.click(
      within(screen.getByRole("group", { name: "Size" })).getByRole("button", {
        name: /^4$/,
      }),
    );
    expect(screen.getByAltText(product.title)).toHaveAttribute(
      "src",
      "https://example.com/mocha.png",
    );
    expect(screen.getByRole("button", { name: "Add to Cart" })).toBeEnabled();
    await user.click(within(colourGroup).getByRole("button", { name: "Mocha" }));
    await user.click(within(colourGroup).getByRole("button", { name: "Sand" }));
    expect(screen.getByAltText(product.title)).toHaveAttribute(
      "src",
      "https://example.com/sand.png",
    );
  });

  it.each([
    { name: "missing", metadata: {} },
    {
      name: "invalid",
      metadata: { colour_images: { Sand: ["https://example.com/unrelated.png"] } },
    },
  ])("preserves gallery browsing when colour-photo links are $name", async ({ metadata }) => {
    const product = { ...makeColourProduct(), metadata };
    mockGetProductById.mockResolvedValueOnce({ product });
    const user = userEvent.setup();
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    const colourGroup = await screen.findByRole("group", { name: "Colour" });
    await user.click(
      screen.getByRole("button", { name: "Show image 2 of Everyday Hooded Tracksuit" }),
    );
    await user.click(within(colourGroup).getByRole("button", { name: "Sand" }));
    expect(screen.getByAltText(product.title)).toHaveAttribute(
      "src",
      "https://example.com/sand.png",
    );
  });

  it("preserves manual browsing when switching from a mapped to an unmapped colour", async () => {
    const product = {
      ...makeColourProduct(),
      metadata: { colour_images: { Mocha: ["https://example.com/mocha.png"] } },
    };
    mockGetProductById.mockResolvedValueOnce({ product });
    const user = userEvent.setup();
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    const colours = await screen.findByRole("group", { name: "Colour" });
    await user.click(within(colours).getByRole("button", { name: "Mocha" }));
    await user.click(
      screen.getByRole("button", { name: "Show image 2 of Everyday Hooded Tracksuit" }),
    );
    await user.click(within(colours).getByRole("button", { name: "Sand" }));
    expect(screen.getByAltText(product.title)).toHaveAttribute(
      "src",
      "https://example.com/sand.png",
    );
    await user.click(within(colours).getByRole("button", { name: "Mocha" }));
    expect(screen.getByAltText(product.title)).toHaveAttribute(
      "src",
      "https://example.com/mocha.png",
    );
  });

  it("shows loading skeleton initially", () => {
    mockGetProductById.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    expect(screen.getByText("Back to products")).toBeInTheDocument();
  });

  it("renders product title and price when loaded", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Pampers Baby Dry Diapers" })).toBeInTheDocument();
    });
    expect(screen.getByText("KSh85,000.00")).toBeInTheDocument();
  });

  it("uses the page heading for a standalone product", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} headingLevel={1} />);
    expect(
      await screen.findByRole("heading", { level: 1, name: mockProduct.title }),
    ).toBeInTheDocument();
  });

  it("keeps embedded product headings below the page heading", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    expect(
      await screen.findByRole("heading", { level: 2, name: mockProduct.title }),
    ).toBeInTheDocument();
  });

  it("groups product options under their accessible option name", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    const options = await screen.findByRole("group", { name: "Pack Size" });
    expect(within(options).getByRole("button", { name: "24 Count" })).toBeInTheDocument();
    expect(within(options).getByRole("button", { name: "50 Count" })).toBeInTheDocument();
  });

  it("names quantity controls and prevents going below one or above available stock", async () => {
    mockGetProductById.mockResolvedValueOnce({
      product: {
        ...mockProduct,
        variants: [{ ...mockProduct.variants![0], manage_inventory: true, inventory_quantity: 2 }],
      },
    });
    const user = userEvent.setup();
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    const decrease = await screen.findByRole("button", { name: "Decrease quantity" });
    const increase = screen.getByRole("button", { name: "Increase quantity" });
    expect(decrease).toBeDisabled();
    await user.click(increase);
    expect(screen.getByLabelText("Selected quantity")).toHaveTextContent("2");
    expect(increase).toBeDisabled();
    expect(decrease).toBeEnabled();
    await user.click(decrease);
    expect(screen.getByLabelText("Selected quantity")).toHaveTextContent("1");
    expect(decrease).toBeDisabled();
  });

  it("renders product description", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Premium diapers for all-night comfort")).toBeInTheDocument();
    });
  });

  it("renders UTF-8 paragraphs, exact section headings and semantic bullet lists", async () => {
    mockGetProductById.mockResolvedValueOnce({
      product: {
        ...mockProduct,
        description:
          "Soft café cotton for everyday wear.\r\nA comfortable fit.\r\n\r\nMade for play — and rest.\r\n\r\nProduct details:\r\n- Cotton fabric\r\n• Relaxed fit\r\n\r\nCare\r\n- Wash cold",
      },
    });
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: mockProduct.title });

    const details = screen.getByRole("heading", { name: "Product details", level: 4 });
    const description = details.parentElement!;
    expect(within(description).getAllByRole("paragraph")).toHaveLength(2);
    expect(within(description).getAllByRole("paragraph")[0]).toHaveTextContent(
      "Soft café cotton for everyday wear. A comfortable fit.",
    );
    expect(within(description).getAllByRole("paragraph")[1]).toHaveTextContent(
      "Made for play — and rest.",
    );
    const lists = within(description).getAllByRole("list");
    expect(lists).toHaveLength(2);
    expect(
      within(lists[0])
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Cotton fabric", "Relaxed fit"]);
    expect(within(description).getByRole("heading", { name: "Care", level: 4 })).toBeVisible();
    expect(within(lists[1]).getByRole("listitem")).toHaveTextContent("Wash cold");
    expect(screen.getByRole("button", { name: "Specifications" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: "Description" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("does not invent Care or interpret unsupported headings and Markdown", async () => {
    mockGetProductById.mockResolvedValueOnce({
      product: {
        ...mockProduct,
        description:
          "**Soft cotton** [Shop](https://example.com)\n\nProduct details\n- Real detail\n\nproduct details:\n# Care\nCare instructions: More text\nProduct details: inline text\n* literal bullet",
      },
    });
    const { container } = renderWithProviders(
      <ProductDetail productId="prod_01" onBack={vi.fn()} />,
    );
    await screen.findByRole("heading", { name: mockProduct.title });
    expect(screen.getByRole("heading", { name: "Product details", level: 4 })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Care" })).not.toBeInTheDocument();
    expect(screen.getByText("**Soft cotton** [Shop](https://example.com)")).toBeInTheDocument();
    expect(screen.getByText(/product details: # Care Care instructions:/)).toHaveTextContent(
      "Product details: inline text * literal bullet",
    );
    expect(container.querySelector('a[href="https://example.com"]')).toBeNull();
    expect(container.querySelector("strong")).toBeNull();
  });

  it.each([undefined, null, "", " \r\n\t ", "<p></p>"])(
    "shows the description fallback for empty copy %j",
    async (description) => {
      mockGetProductById.mockResolvedValueOnce({ product: { ...mockProduct, description } });
      renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
      expect(
        await screen.findByText("No description available for this product yet."),
      ).toBeVisible();
      expect(screen.queryByRole("heading", { name: "Care" })).not.toBeInTheDocument();
    },
  );

  it("strips legacy HTML and never injects malicious markup", async () => {
    mockGetProductById.mockResolvedValueOnce({
      product: {
        ...mockProduct,
        description:
          '<p>Legacy <strong>cotton</strong></p>\n\nProduct details:\n- <img src=x onerror="alert(1)">Safe detail <script>alert(2)</script>\n\nCare:\nWash gently <svg onload="alert(3)"></svg>',
      },
    });
    const { container } = renderWithProviders(
      <ProductDetail productId="prod_01" onBack={vi.fn()} />,
    );
    await screen.findByRole("heading", { name: mockProduct.title });
    const description = screen.getByRole("heading", { name: "Product details" }).parentElement!;
    expect(within(description).getByText("Legacy cotton")).toBeInTheDocument();
    expect(within(description).getByRole("listitem")).toHaveTextContent("Safe detail alert(2)");
    expect(within(description).getByRole("heading", { name: "Care" })).toBeVisible();
    expect(description.querySelector("script, img, svg, strong, [onerror], [onload]")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });

  it("retains all long description copy and treats single-paragraph copy as one paragraph", async () => {
    const description = "Soft cotton — café. ".repeat(700) + "END";
    mockGetProductById.mockResolvedValueOnce({ product: { ...mockProduct, description } });
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    const paragraph = await screen.findByText(description);
    expect(paragraph.tagName).toBe("P");
    expect(paragraph.textContent).toBe(description);
    expect(screen.queryByRole("heading", { name: "Product details" })).not.toBeInTheDocument();
  });

  it("renders product options", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Pack Size")).toBeInTheDocument();
      expect(screen.getByText("24 Count")).toBeInTheDocument();
      expect(screen.getByText("50 Count")).toBeInTheDocument();
    });
  });

  it("calls onBack when back button is clicked", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    const onBack = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<ProductDetail productId="prod_01" onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Pampers Baby Dry Diapers" })).toBeInTheDocument();
    });

    await user.click(screen.getByText("Back to products"));
    expect(onBack).toHaveBeenCalled();
  });

  it("renders 'Product not found' when no product", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: null });

    renderWithProviders(<ProductDetail productId="nonexistent" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Product not found")).toBeInTheDocument();
    });
  });

  it("shows Add to Cart button", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Add to Cart")).toBeInTheDocument();
    });
  });

  it("shows product image", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      const img = screen.getByAltText("Pampers Baby Dry Diapers");
      expect(img).toBeInTheDocument();
    });
  });

  it("toggles wishlist from the detail page", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    const user = userEvent.setup();

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Pampers Baby Dry Diapers" })).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Add to wishlist"));

    expect(mockToggleWishlistProduct).toHaveBeenCalledWith("prod_01");
  });

  it("renders a breadcrumb linking home and the product category", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    const nav = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");

    const categoryLink = within(nav).getByRole("link", { name: "Diapers" });
    expect(categoryLink).toHaveAttribute("href", "/products?category=diapers");

    const current = within(nav).getByText("Pampers Baby Dry Diapers");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("disables an option value that has no in-stock variant", async () => {
    const productWithSoldOut: MedusaProduct = {
      ...mockProduct,
      variants: [
        mockProduct.variants![0], // 24 Count — in stock
        // 50 Count — managed inventory, zero on hand → sold out
        { ...mockProduct.variants![1], manage_inventory: true, inventory_quantity: 0 },
      ],
    };
    mockGetProductById.mockResolvedValueOnce({ product: productWithSoldOut });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    expect(screen.getByRole("button", { name: /24 Count/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /50 Count/i })).toBeDisabled();
  });

  it("clears an incompatible clothing option and requires an explicit replacement", async () => {
    const product: MedusaProduct = {
      ...mockProduct,
      options: [
        {
          id: "opt_size",
          title: "Size",
          product_id: "prod_01",
          values: [
            { id: "ov_s", value: "S", option_id: "opt_size" },
            { id: "ov_m", value: "M", option_id: "opt_size" },
          ],
        },
        {
          id: "opt_color",
          title: "Color",
          product_id: "prod_01",
          values: [
            { id: "ov_red", value: "Red", option_id: "opt_color" },
            { id: "ov_blue", value: "Blue", option_id: "opt_color" },
          ],
        },
      ],
      variants: [
        {
          id: "v_s_red",
          title: "S / Red",
          options: [
            { id: "ov_s", value: "S", option_id: "opt_size" },
            { id: "ov_red", value: "Red", option_id: "opt_color" },
          ],
          prices: [{ id: "p1", amount: 1000, currency_code: "kes" }],
        },
        {
          id: "v_s_blue",
          title: "S / Blue",
          options: [
            { id: "ov_s", value: "S", option_id: "opt_size" },
            { id: "ov_blue", value: "Blue", option_id: "opt_color" },
          ],
          prices: [{ id: "p2", amount: 1000, currency_code: "kes" }],
        },
        {
          // M / Red is the only sold-out combination
          id: "v_m_red",
          title: "M / Red",
          manage_inventory: true,
          inventory_quantity: 0,
          options: [
            { id: "ov_m", value: "M", option_id: "opt_size" },
            { id: "ov_red", value: "Red", option_id: "opt_color" },
          ],
          prices: [{ id: "p3", amount: 1000, currency_code: "kes" }],
        },
        {
          id: "v_m_blue",
          title: "M / Blue",
          options: [
            { id: "ov_m", value: "M", option_id: "opt_size" },
            { id: "ov_blue", value: "Blue", option_id: "opt_color" },
          ],
          prices: [{ id: "p4", amount: 1000, currency_code: "kes" }],
        },
      ],
    };
    mockGetProductById.mockResolvedValueOnce({ product });
    const user = userEvent.setup();

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    // Explicitly choose S / Red, then switch to M where Red is sold out.
    await user.click(screen.getByRole("button", { name: "S" }));
    await user.click(screen.getByRole("button", { name: "Red" }));
    await user.click(screen.getByRole("button", { name: "M" }));

    // No colour is silently substituted. The customer must choose Blue.
    expect(screen.getByRole("button", { name: "M" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Choose size and colour" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Blue" }));
    expect(screen.getByRole("button", { name: "Add to Cart" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Red" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the original price and discount when the selected variant is on sale", async () => {
    const discounted: MedusaProduct = {
      ...mockProduct,
      variants: [
        {
          ...mockProduct.variants![0],
          calculated_price: {
            calculated_amount: 85000,
            original_amount: 100000,
            currency_code: "kes",
          },
        },
        mockProduct.variants![1],
      ],
    };
    mockGetProductById.mockResolvedValueOnce({ product: discounted });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    // Selected (first) variant is discounted 100,000 → 85,000.
    expect(screen.getByText("KSh100,000.00")).toBeInTheDocument();
    expect(screen.getByText("-15%")).toBeInTheDocument();
  });

  it("links to delivery and returns policies without promising universal free delivery", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    expect(screen.getByRole("link", { name: "Delivery policy" })).toHaveAttribute(
      "href",
      "/policies/shipping",
    );
    expect(screen.queryByText(/Free delivery on orders/i)).not.toBeInTheDocument();
    expect(screen.getByText("Pay securely with M-Pesa")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /returns/i })).toHaveAttribute(
      "href",
      "/policies/returns",
    );
  });

  it("shows the star rating and review count when the product has rating metadata", async () => {
    const rated: MedusaProduct = {
      ...mockProduct,
      metadata: { rating: 4.5, review_count: 128 },
    };
    mockGetProductById.mockResolvedValueOnce({ product: rated });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    expect(screen.getByText(/128 reviews/i)).toBeInTheDocument();
    expect(screen.queryByText("No reviews yet")).not.toBeInTheDocument();
  });

  it("omits ratings when there is no actual review data", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    expect(screen.queryByText("No reviews yet")).not.toBeInTheDocument();
  });

  it("does not present a rating without a positive review count", async () => {
    mockGetProductById.mockResolvedValueOnce({
      product: { ...mockProduct, metadata: { rating: 4.5, review_count: 0 } },
    });
    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: mockProduct.title });
    expect(screen.queryByText(/0 reviews/i)).not.toBeInTheDocument();
  });

  it("shows the description in an accordion section open by default", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    expect(screen.getByRole("button", { name: "Description" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("Premium diapers for all-night comfort")).toBeInTheDocument();
  });

  it("expands a collapsed accordion section on click", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    const user = userEvent.setup();

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    const deliveryToggle = screen.getByRole("button", { name: /Delivery & returns/i });
    expect(deliveryToggle).toHaveAttribute("aria-expanded", "false");

    await user.click(deliveryToggle);
    expect(deliveryToggle).toHaveAttribute("aria-expanded", "true");
  });

  it("renders related products from the same category", async () => {
    const related1 = {
      ...mockProduct,
      id: "prod_rel_1",
      title: "Baby Wipes Sensitive",
      handle: "baby-wipes-sensitive",
    };
    const related2 = {
      ...mockProduct,
      id: "prod_rel_2",
      title: "Newborn Onesie",
      handle: "newborn-onesie",
    };
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    // Includes the current product, which must be filtered out of the row.
    mockGetProducts.mockResolvedValue({ products: [related1, related2, mockProduct] });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });

    expect(await screen.findByText("You may also like")).toBeInTheDocument();
    expect(screen.getByText("Baby Wipes Sensitive")).toBeInTheDocument();
    expect(screen.getByText("Newborn Onesie")).toBeInTheDocument();
  });

  it("hides the related section when there are no other products in the category", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });
    mockGetProducts.mockResolvedValue({ products: [mockProduct] });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Pampers Baby Dry Diapers" });
    await waitFor(() => expect(mockGetProducts).toHaveBeenCalled());

    expect(screen.queryByText("You may also like")).not.toBeInTheDocument();
  });
});

it.each([
  { rating: NaN, review_count: 12 },
  { rating: Infinity, review_count: 12 },
  { rating: -1, review_count: 12 },
  { rating: 5.1, review_count: 12 },
  { rating: "4.5", review_count: 12 },
  { rating: 4.5, review_count: "12" },
  { rating: 4.5, review_count: 1.5 },
  { rating: 4.5, review_count: Infinity },
  { rating: 4.5, review_count: NaN },
  { rating: 4.5, review_count: -1 },
])("hides malformed supplied PDP rating metadata %#", async (metadata) => {
  mockGetProductById.mockResolvedValueOnce({ product: { ...mockProduct, metadata } });
  renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
  await screen.findByRole("heading", { name: mockProduct.title });
  expect(screen.queryByText(/\(.* reviews\)/)).not.toBeInTheDocument();
});
