import { describe, it, expect, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { renderWithProviders } from "../test-utils";

vi.mock("@/lib/medusa-api", () => ({
  getCart: vi.fn().mockResolvedValue(null),
  getWishlistProductIds: vi.fn().mockResolvedValue([]),
  addToCart: vi.fn(),
  toggleWishlistProduct: vi.fn(),
  getProducts: vi.fn().mockResolvedValue({
    products: [
      {
        id: "prod_01",
        title: "Pampers Baby Dry Diapers",
        handle: "pampers-baby-dry",
        status: "published",
        is_giftcard: false,
        discountable: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        thumbnail: "https://example.com/pampers.jpg",
        variants: [
          {
            id: "variant_01",
            title: "24 Count",
            prices: [{ id: "p1", amount: 1500, currency_code: "usd" }],
          },
        ],
      },
      {
        id: "prod_02",
        title: "Organic Cotton Swaddle Blankets",
        handle: "organic-cotton-swaddle-blankets",
        status: "published",
        is_giftcard: false,
        discountable: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        thumbnail: "https://example.com/swaddles.jpg",
        variants: [
          {
            id: "variant_02",
            title: "3 Pack",
            prices: [{ id: "p2", amount: 2390, currency_code: "usd" }],
          },
        ],
      },
    ],
    count: 1,
    offset: 0,
    limit: 8,
  }),
  getCategories: vi.fn().mockResolvedValue({
    product_categories: [
      {
        id: "pcat_feeding",
        name: "Feeding",
        handle: "feeding",
        description: "Everything for feeding your little one",
        rank: 0,
        parent_category_id: null,
        created_at: "",
        updated_at: "",
        category_children: [],
      },
    ],
    count: 1,
    offset: 0,
    limit: 100,
  }),
}));

describe("Home Page", () => {
  it("renders the hero section", () => {
    renderWithProviders(<Home />);
    expect(screen.getByText(/Everything Your/i)).toBeInTheDocument();
    expect(screen.getByText("Little One")).toBeInTheDocument();
  });

  it("gives the hero product carousel more desktop presence", () => {
    renderWithProviders(<Home />);

    expect(screen.getByTestId("home-hero-layout")).toHaveClass("lg:gap-8");
    expect(screen.getByTestId("home-hero-carousel")).toHaveClass("xl:max-w-[520px]");
  });

  it("rotates the hero product every 6 seconds", async () => {
    let rotateHeroProduct: (() => void) | undefined;
    let intervalMs: number | undefined;
    const setIntervalSpy = vi
      .spyOn(window, "setInterval")
      .mockImplementation((handler, timeout) => {
        if (Number(timeout) === 6_000) {
          intervalMs = Number(timeout);
          rotateHeroProduct = typeof handler === "function" ? handler : undefined;
        }
        return 1 as unknown as ReturnType<typeof setInterval>;
      });

    try {
      renderWithProviders(<Home />);
      const hero = screen.getByTestId("home-hero-carousel");

      await waitFor(() =>
        expect(within(hero).getByText("Pampers Baby Dry Diapers")).toBeInTheDocument(),
      );
      expect(intervalMs).toBe(6_000);

      await act(async () => {
        rotateHeroProduct?.();
      });

      expect(within(hero).getByText("Organic Cotton Swaddle Blankets")).toBeInTheDocument();
    } finally {
      setIntervalSpy.mockRestore();
    }
  });

  it("lets shoppers pause the auto-rotating hero (WCAG 2.2.2)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Home />);

    const pauseButton = await screen.findByRole("button", { name: "Pause product rotation" });
    await user.click(pauseButton);

    expect(screen.getByRole("button", { name: "Resume product rotation" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pause product rotation" }),
    ).not.toBeInTheDocument();
  });

  it("aligns the hero copy with the visual on desktop", () => {
    renderWithProviders(<Home />);

    expect(screen.getByTestId("home-hero-copy")).toHaveClass("lg:self-start");
  });

  it("renders 'Shop Now' link", () => {
    renderWithProviders(<Home />);
    const shopNow = screen.getByText("Shop Now");
    expect(shopNow.closest("a")).toHaveAttribute("href", "/products");
  });

  it("renders explore collection section heading", () => {
    renderWithProviders(<Home />);
    expect(screen.getByText("Explore Our Collection")).toBeInTheDocument();
  });

  it("renders shop by category section heading", () => {
    renderWithProviders(<Home />);
    expect(screen.getByText("Shop by Category")).toBeInTheDocument();
  });

  it("renders the redesigned parent proof section", () => {
    renderWithProviders(<Home />);

    expect(
      screen.getByRole("heading", { name: "Made for the small things parents need fast." }),
    ).toBeInTheDocument();
    expect(screen.getByText("M-Pesa checkout")).toBeInTheDocument();
    expect(screen.getByText("Nairobi dispatch")).toBeInTheDocument();
    expect(screen.getByTestId("home-parent-proof").className).toContain("bg-[linear-gradient");
  });

  it("renders feature bar items", () => {
    renderWithProviders(<Home />);
    expect(screen.getByText("Free Shipping")).toBeInTheDocument();
    expect(screen.getByText("Safe Products")).toBeInTheDocument();
    expect(screen.getByText("Same-Day Express")).toBeInTheDocument();
    expect(screen.getByText("Expert Support")).toBeInTheDocument();
  });

  it("loads and renders product cards", async () => {
    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getAllByText("Pampers Baby Dry Diapers").length).toBeGreaterThan(0);
    });
  });

  it("loads and renders categories", async () => {
    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Feeding")).toBeInTheDocument();
    });
  });

  it("renders promotional banners", () => {
    renderWithProviders(<Home />);
    expect(screen.getByText("Adorable Baby Clothing")).toBeInTheDocument();
    expect(screen.getByText("Feeding Essentials")).toBeInTheDocument();
  });
});
