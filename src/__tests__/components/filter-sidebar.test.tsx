import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterSidebar } from "@/components/filter-sidebar";
import { renderWithProviders } from "../test-utils";
import { clothingCategories as mockCategories } from "../clothing-fixtures";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.style.overflow = "";
});

describe("FilterSidebar", () => {
  const defaultProps = {
    filters: {},
    onFilterChange: vi.fn(),
    categories: mockCategories,
  };

  it("renders the Filters heading", () => {
    renderWithProviders(<FilterSidebar {...defaultProps} />);
    expect(screen.getAllByText("Filters").length).toBeGreaterThanOrEqual(1);
  });

  it("renders 'All Categories' button", () => {
    renderWithProviders(<FilterSidebar {...defaultProps} />);
    expect(screen.getByText("All Categories")).toBeInTheDocument();
  });

  it("renders top-level categories that match TOP_LEVEL_HANDLES", () => {
    renderWithProviders(<FilterSidebar {...defaultProps} />);
    expect(screen.getByText("Tops")).toBeInTheDocument();
    expect(screen.getByText("Bottoms")).toBeInTheDocument();
    expect(screen.getByText("Sleepwear")).toBeInTheDocument();
  });

  it("calls onFilterChange when a category is selected", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    renderWithProviders(<FilterSidebar {...defaultProps} onFilterChange={onFilterChange} />);

    await user.click(screen.getByText("Tops"));
    expect(onFilterChange).toHaveBeenCalledWith({ category: "tops" });
  });

  it("calls onFilterChange with undefined when active category is deselected", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    renderWithProviders(
      <FilterSidebar
        filters={{ category: "tops" }}
        onFilterChange={onFilterChange}
        categories={mockCategories}
      />,
    );

    await user.click(screen.getByText("Tops"));
    expect(onFilterChange).toHaveBeenCalledWith({ category: undefined });
  });

  it("renders category rows as pressed buttons without category checkboxes", () => {
    renderWithProviders(
      <FilterSidebar
        filters={{ category: "tops" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    expect(screen.queryByRole("checkbox", { name: /Tops/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tops" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Bottoms" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("adds a second category to the selection without replacing the first", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    renderWithProviders(
      <FilterSidebar
        filters={{ category: "tops" }}
        onFilterChange={onFilterChange}
        categories={mockCategories}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Bottoms" }));
    expect(onFilterChange).toHaveBeenCalledWith({ category: "tops,bottoms" });
  });

  it("opens active child categories and marks the active child button", () => {
    renderWithProviders(
      <FilterSidebar
        filters={{ category: "t-shirts" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    expect(screen.getByText("T-shirts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "T-shirts" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows filter count badge when filters active", () => {
    renderWithProviders(
      <FilterSidebar
        filters={{ category: "tops" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
  });

  it("counts each selected category in the filter badge", () => {
    renderWithProviders(
      <FilterSidebar
        filters={{ category: "tops,bottoms" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'Clear all' button when filters are active", () => {
    renderWithProviders(
      <FilterSidebar
        filters={{ category: "tops" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    expect(screen.getByText("Clear all")).toBeInTheDocument();
  });

  it("offers an explicit close action and restores focus and body scrolling", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <FilterSidebar
        filters={{ category: "tops" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    const trigger = screen.getByRole("button", { name: /Filters/i });
    document.body.style.overflow = "auto";
    await user.click(trigger);

    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("button", { name: "Close filters" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Close filters" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";

    await user.click(trigger);
    expect(screen.getByTestId("filters-drawer-backdrop")).toBeInTheDocument();

    await user.click(screen.getByTestId("filters-drawer-backdrop"));

    expect(screen.queryByTestId("filters-drawer-backdrop")).not.toBeInTheDocument();
  });

  it("treats the mobile drawer as a dismissible dialog", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <FilterSidebar
        filters={{ category: "tops" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Filters/i }));

    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByRole("button", { name: "Close filters" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument();
  });

  it("keeps keyboard focus inside the drawer and closes on the live result action", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    const { rerender } = renderWithProviders(
      <FilterSidebar {...defaultProps} onFilterChange={onFilterChange} resultCount={23} />,
    );
    await user.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    const close = within(dialog).getByRole("button", { name: "Close filters" });
    const show = within(dialog).getByRole("button", { name: "Show 23 items" });
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(show).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "Age" }), "5-8");
    expect(onFilterChange).toHaveBeenCalledWith({ age: "5-8" });
    expect(dialog).toBeInTheDocument();

    rerender(<FilterSidebar {...defaultProps} filters={{ age: "5-8" }} resultCount={4} />);
    await user.click(within(dialog).getByRole("button", { name: "Show 4 items" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not claim a result total while filters are refreshing", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(
      <FilterSidebar {...defaultProps} resultCount={23} isUpdating />,
    );
    await user.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByRole("button", { name: "Updating items…" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Show 23 items" })).not.toBeInTheDocument();
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("clears all filters when 'Clear all' is clicked", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    renderWithProviders(
      <FilterSidebar
        filters={{ category: "tops" }}
        onFilterChange={onFilterChange}
        categories={mockCategories}
      />,
    );

    await user.click(screen.getByText("Clear all"));
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ category: undefined, availability: undefined, price: undefined }),
    );
  });

  it("renders the availability and price facets", () => {
    renderWithProviders(<FilterSidebar {...defaultProps} />);
    expect(screen.getByText("Availability")).toBeInTheDocument();
    expect(screen.getByText("In stock only")).toBeInTheDocument();
    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("Under KSh1,000")).toBeInTheDocument();
  });

  it("calls onFilterChange when 'In stock only' is toggled", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderWithProviders(<FilterSidebar {...defaultProps} onFilterChange={onFilterChange} />);

    await user.click(screen.getByRole("checkbox", { name: /In stock only/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ availability: "in_stock" });
  });

  it("calls onFilterChange when a price bracket is selected", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderWithProviders(<FilterSidebar {...defaultProps} onFilterChange={onFilterChange} />);

    await user.click(screen.getByRole("radio", { name: /Under KSh1,000/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ price: "u1000" });
  });
});
