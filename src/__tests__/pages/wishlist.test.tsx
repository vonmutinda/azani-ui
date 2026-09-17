import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import WishlistPage from "@/app/account/wishlist/page";
import { renderWithProviders } from "../test-utils";

const mockGetCustomer = vi.fn();
const mockGetWishlistProductIds = vi.fn();
const mockGetProductsByIds = vi.fn();

vi.mock("@/lib/medusa-api", () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  getWishlistProductIds: (...args: unknown[]) => mockGetWishlistProductIds(...args),
  getProductsByIds: (...args: unknown[]) => mockGetProductsByIds(...args),
}));

vi.mock("@/components/product-card", () => ({
  ProductCard: ({ product }: { product: { title: string } }) => <div>{product.title}</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCustomer.mockResolvedValue(null);
  mockGetWishlistProductIds.mockResolvedValue([]);
  mockGetProductsByIds.mockResolvedValue([]);
});

describe("WishlistPage", () => {
  it("shows guest empty state when wishlist is empty", async () => {
    renderWithProviders(<WishlistPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Save products to your wishlist as a guest, or sign in to keep them synced to your account.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("renders wishlisted products", async () => {
    mockGetCustomer.mockResolvedValue({
      id: "cus_1",
      email: "jane@example.com",
      has_account: true,
    });
    mockGetWishlistProductIds.mockResolvedValue(["prod_01"]);
    mockGetProductsByIds.mockResolvedValue([{ id: "prod_01", title: "Pampers Baby Dry Diapers" }]);

    renderWithProviders(<WishlistPage />);

    await waitFor(() => {
      expect(screen.getByText("Pampers Baby Dry Diapers")).toBeInTheDocument();
    });
    expect(screen.getByText("Your saved favorites, synced to your account.")).toBeInTheDocument();
  });

  it("offers a retry instead of reporting saved products as retired on a catalogue error", async () => {
    mockGetWishlistProductIds.mockResolvedValue(["prod_01"]);
    mockGetProductsByIds
      .mockRejectedValueOnce(new Error("Catalogue unavailable"))
      .mockResolvedValueOnce([{ id: "prod_01", title: "Kids Tee" }]);

    renderWithProviders(<WishlistPage />);

    await screen.findByText(/couldn’t load your saved products/i);
    expect(screen.queryByText("No saved products found")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Kids Tee")).toBeInTheDocument();
  });
});
