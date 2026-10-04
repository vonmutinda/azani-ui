import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CatalogueFilters } from "@/components/catalogue-filters";

describe("CatalogueFilters", () => {
  it("keeps a selected size removable when no results supply facets", async () => {
    const onFilterChange = vi.fn();
    render(
      <CatalogueFilters
        filters={{ size: "6 years" }}
        facets={{ sizes: [], colours: [] }}
        onFilterChange={onFilterChange}
      />,
    );
    const selected = screen.getByRole("button", { name: "Size 6 years" });
    expect(selected).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(selected);
    expect(onFilterChange).toHaveBeenCalledWith({ size: undefined });
  });

  it("toggles gender and age without a colour control", async () => {
    const onFilterChange = vi.fn();
    render(
      <CatalogueFilters
        filters={{ audience: "girls", age: "2-4" }}
        onFilterChange={onFilterChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Unisex" }));
    expect(onFilterChange).toHaveBeenLastCalledWith({ audience: "unisex" });
    await userEvent.click(screen.getByRole("button", { name: "2–4 years" }));
    expect(onFilterChange).toHaveBeenLastCalledWith({ age: undefined });
    expect(screen.queryByRole("combobox", { name: "Colour" })).not.toBeInTheDocument();
  });

  it("reveals price and availability only when requested", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<CatalogueFilters filters={{}} onFilterChange={onFilterChange} />);
    const toggle = screen.getByRole("button", { name: "Price & availability" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    await user.click(screen.getByRole("button", { name: "Under KSh1,000" }));
    expect(onFilterChange).toHaveBeenCalledWith({ price: "u1000" });
    await user.click(screen.getByRole("button", { name: "In stock only" }));
    expect(onFilterChange).toHaveBeenCalledWith({ availability: "in_stock" });
    await user.click(screen.getByRole("button", { name: "On sale" }));
    expect(onFilterChange).toHaveBeenCalledWith({ sale: "true" });
  });

  it("clears a selected budget and availability without clearing other facets", async () => {
    const onFilterChange = vi.fn();
    render(
      <CatalogueFilters
        filters={{ price: "u1000", availability: "in_stock", sale: "true", age: "5-8" }}
        onFilterChange={onFilterChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Price & availability/ }));
    expect(screen.getByRole("button", { name: "Under KSh1,000" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "Under KSh1,000" }));
    expect(onFilterChange).toHaveBeenLastCalledWith({ price: undefined });
    await userEvent.click(screen.getByRole("button", { name: "In stock only" }));
    expect(onFilterChange).toHaveBeenLastCalledWith({ availability: undefined });
    await userEvent.click(screen.getByRole("button", { name: "On sale" }));
    expect(onFilterChange).toHaveBeenLastCalledWith({ sale: undefined });
  });

  it("traps focus and restores scrolling and trigger focus when the drawer closes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const view = render(
      <CatalogueFilters filters={{}} onFilterChange={vi.fn()} open onClose={onClose} total={7} />,
    );
    const dialog = screen.getByRole("dialog", { name: "Product filters" });
    expect(document.body.style.overflow).toBe("hidden");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    screen.getByRole("button", { name: "Show 7 products" }).focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close filters" })).toHaveFocus();
    view.rerender(
      <CatalogueFilters filters={{}} onFilterChange={vi.fn()} open onClose={onClose} total={7}>
        <button>Temporary category</button>
      </CatalogueFilters>,
    );
    screen.getByRole("button", { name: "Temporary category" }).focus();
    view.rerender(
      <CatalogueFilters filters={{}} onFilterChange={vi.fn()} open onClose={onClose} total={7} />,
    );
    expect(screen.getByRole("button", { name: "Close filters" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    view.rerender(
      <CatalogueFilters filters={{}} onFilterChange={vi.fn()} open={false} onClose={onClose} />,
    );
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
