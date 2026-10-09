import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductDetailPage from "@/components/product-detail-page";

const { back, push } = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "product_1" }),
  useRouter: () => ({ back, push }),
}));
vi.mock("@/components/product-detail", () => ({
  ProductDetail: ({ onBack }: { onBack: () => void }) => (
    <button onClick={onBack}>Back to clothing</button>
  ),
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("standalone product navigation", () => {
  it("returns through browser history when an earlier entry exists", async () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(2);
    render(<ProductDetailPage />);
    await userEvent.click(screen.getByRole("button", { name: "Back to clothing" }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("returns a direct product visit to the catalogue", async () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);
    render(<ProductDetailPage />);
    await userEvent.click(screen.getByRole("button", { name: "Back to clothing" }));
    expect(push).toHaveBeenCalledWith("/products");
    expect(back).not.toHaveBeenCalled();
  });
});
