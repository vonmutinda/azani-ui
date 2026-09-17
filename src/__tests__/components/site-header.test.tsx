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
  it("renders the clothing discovery destinations with canonical query parameters", () => {
    const html = renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <SiteHeader />
      </QueryClientProvider>,
    );

    expect(html).toContain('href="/products"');
    expect(html).toContain('href="/products?audience=girls"');
    expect(html).toContain('href="/products?audience=boys"');
    expect(html).toContain('href="/products?age=2-4"');
    expect(html).toContain('href="/products?age=5-8"');
    expect(html).toContain('href="/products?age=9-12"');
    expect(html).toContain('href="/products?sort=newest"');
    expect(html).toContain('href="/products?sale=true"');
    expect(html).toContain("Shop All");
    expect(html).toContain("Shop by Age");
  });

  it("does not advertise unsupported product certification", () => {
    const html = renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <SiteHeader />
      </QueryClientProvider>,
    );

    expect(html).not.toContain("Safe &amp; certified products");
  });

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
