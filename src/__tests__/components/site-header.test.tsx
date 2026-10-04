import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/site-header";
import { mockCart } from "../fixtures";

vi.mock("@/lib/medusa-api", () => ({
  getProducts: vi.fn().mockResolvedValue({ products: [], count: 0 }),
  getCart: vi.fn().mockResolvedValue(null),
  getCategories: vi.fn(),
  getCustomer: vi.fn().mockResolvedValue(null),
}));

describe("SiteHeader", () => {
  it("opens labelled search and restores focus when Escape closes it", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SiteHeader />
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("textbox", { name: "Search clothing" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("textbox", { name: "Search clothing" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toHaveFocus();
  });

  it("makes the age menu operable by click and Escape", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SiteHeader />
      </QueryClientProvider>,
    );
    const button = screen.getByRole("button", { name: "Shop by Age" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);
    expect(screen.getByRole("link", { name: "2–4 years" })).toBeVisible();
    await user.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("closes the age menu when Search opens and restores the search trigger", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SiteHeader />
      </QueryClientProvider>,
    );
    const ageButton = screen.getByRole("button", { name: "Shop by Age" });
    await user.click(ageButton);
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(ageButton).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Search" })).toHaveFocus();
  });

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
    expect(html).not.toContain('href="/products?sale=true"');
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
