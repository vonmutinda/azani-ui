import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import OrderDetailPage from "@/app/account/orders/[id]/page";
import { renderWithProviders } from "../test-utils";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useParams: () => ({ id: "order_123" }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OrderDetailPage", () => {
  it("shows loading and redirects to account page", () => {
    renderWithProviders(<OrderDetailPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith("/account?order=order_123");
  });
});
