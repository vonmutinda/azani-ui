import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StoreShell } from "@/components/store-shell";

const route = vi.hoisted(() => ({ pathname: "/checkout" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => <nav>Shop navigation</nav> }));
vi.mock("@/components/site-footer", () => ({ SiteFooter: () => <footer>Shop footer</footer> }));

describe("StoreShell", () => {
  it("keeps checkout focused with cart recovery, help and policies", () => {
    route.pathname = "/checkout";
    render(
      <StoreShell>
        <h1>Checkout</h1>
      </StoreShell>,
    );
    expect(screen.queryByText("Shop navigation")).not.toBeInTheDocument();
    expect(screen.queryByText("Shop footer")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: /Back to cart/ })).toHaveAttribute("href", "/cart");
    expect(screen.getByRole("link", { name: "Delivery" })).toHaveAttribute(
      "href",
      "/policies/shipping",
    );
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("retains shopping navigation on catalogue routes", () => {
    route.pathname = "/products";
    render(
      <StoreShell>
        <h1>Clothing</h1>
      </StoreShell>,
    );
    expect(screen.getByText("Shop navigation")).toBeInTheDocument();
    expect(screen.getByText("Shop footer")).toBeInTheDocument();
  });
});
