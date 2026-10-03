import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, buttonVariants } from "@/components/ui/button";

describe("buttonVariants", () => {
  it("uses the brand primary token for the primary variant", () => {
    expect(buttonVariants({ variant: "primary" })).toContain("bg-primary");
  });

  it("uses the secondary token for the secondary variant", () => {
    expect(buttonVariants({ variant: "secondary" })).toContain("bg-secondary");
  });

  it("renders the ghost variant without a solid fill", () => {
    const cls = buttonVariants({ variant: "ghost" });
    expect(cls).not.toContain("bg-primary");
    expect(cls).toContain("text-foreground");
  });

  it("always includes a visible focus ring", () => {
    expect(buttonVariants()).toContain("focus-visible:ring-2");
  });

  it("applies full width only when requested", () => {
    expect(buttonVariants()).not.toContain("w-full");
    expect(buttonVariants({ fullWidth: true })).toContain("w-full");
  });

  it("appends a custom className", () => {
    expect(buttonVariants({ className: "shadow-md" })).toContain("shadow-md");
  });
});

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Add to cart</Button>);
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeInTheDocument();
  });

  it("defaults to type=button", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute("type", "button");
  });

  it("fires onClick when pressed", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
