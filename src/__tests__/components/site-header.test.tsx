import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/site-header";
import { mockCart } from "../fixtures";

vi.mock("@/lib/medusa-api", () => ({
  getCart: vi.fn(),
  getCategories: vi.fn(),
  getCustomer: vi.fn(),
}));

describe("SiteHeader", () => {
  it("does not server-render the cart quantity from client cache", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["cart"], {
      ...mockCart,
      items: [{ ...mockCart.items[0], quantity: 7 }],
    });

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <SiteHeader />
      </QueryClientProvider>,
    );

    expect(html).toContain("Cart");
    expect(html).not.toContain(">7</span>");
  });
});
