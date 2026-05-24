import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import { siteConfig } from "@/lib/site-config";

const mockUsePathname = vi.fn(() => "/");

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

beforeEach(() => {
  mockUsePathname.mockReturnValue("/");
});

describe("FloatingWhatsApp", () => {
  it("renders an anchor to wa.me with the configured number and encoded prefill message", () => {
    render(<FloatingWhatsApp />);
    const link = screen.getByRole("link", { name: /chat with us on whatsapp/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toMatch(new RegExp(`^https://wa\\.me/${siteConfig.whatsapp.number}\\?text=`));
    expect(href).toContain(encodeURIComponent(siteConfig.whatsapp.prefillMessage));
  });

  it("has an aria-label", () => {
    render(<FloatingWhatsApp />);
    expect(screen.getByLabelText("Chat with us on WhatsApp")).toBeInTheDocument();
  });

  it("opens in a new tab with safe rel attributes", () => {
    render(<FloatingWhatsApp />);
    const link = screen.getByRole("link", { name: /chat with us on whatsapp/i });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("stays out of cart and checkout action areas", () => {
    mockUsePathname.mockReturnValue("/cart");
    const { rerender } = render(<FloatingWhatsApp />);

    expect(
      screen.queryByRole("link", { name: /chat with us on whatsapp/i }),
    ).not.toBeInTheDocument();

    mockUsePathname.mockReturnValue("/checkout");
    rerender(<FloatingWhatsApp />);

    expect(
      screen.queryByRole("link", { name: /chat with us on whatsapp/i }),
    ).not.toBeInTheDocument();
  });
});
