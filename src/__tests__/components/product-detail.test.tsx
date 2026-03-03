import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductDetail } from "@/components/product-detail";
import { renderWithProviders } from "../test-utils";
import { mockProduct } from "../fixtures";

const mockGetProductById = vi.fn();
const mockAddToCart = vi.fn();

vi.mock("@/lib/medusa-api", () => ({
  getProductById: (...args: unknown[]) => mockGetProductById(...args),
  addToCart: (...args: unknown[]) => mockAddToCart(...args),
}));

describe("ProductDetail", () => {
  it("shows loading skeleton initially", () => {
    mockGetProductById.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);
    expect(screen.getByText("Back to products")).toBeInTheDocument();
  });

  it("renders product title and price when loaded", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Pampers Baby Dry Diapers")).toBeInTheDocument();
    });
    expect(screen.getByText("$15.00")).toBeInTheDocument();
  });

  it("renders product description", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: mockProduct });

    renderWithProviders(<ProductDetail productId="prod_01" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Premium diapers for all-night comfort")).toBeInTheDocument();
    });
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
      expect(screen.getByText("Pampers Baby Dry Diapers")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Back to products"));
    expect(onBack).toHaveBeenCalled();
  });

  it("renders 'Product not found' when no product", async () => {
    mockGetProductById.mockResolvedValueOnce({ product: null });

    renderWithProviders(<ProductDetail productId="nonexistent" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Product not found.")).toBeInTheDocument();
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
});
