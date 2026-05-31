import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterSidebar } from "@/components/filter-sidebar";
import { renderWithProviders } from "../test-utils";
import { mockCategories } from "../fixtures";

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
    expect(screen.getByText("Bath & Diapering")).toBeInTheDocument();
    expect(screen.getByText("Feeding")).toBeInTheDocument();
    expect(screen.getByText("Clothing")).toBeInTheDocument();
  });

  it("calls onFilterChange when a category is selected", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    renderWithProviders(<FilterSidebar {...defaultProps} onFilterChange={onFilterChange} />);

    await user.click(screen.getByText("Bath & Diapering"));
    expect(onFilterChange).toHaveBeenCalledWith({ category: "bath-diapering" });
  });

  it("calls onFilterChange with undefined when active category is deselected", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    renderWithProviders(
      <FilterSidebar
        filters={{ category: "bath-diapering" }}
        onFilterChange={onFilterChange}
        categories={mockCategories}
      />,
    );

    await user.click(screen.getByText("Bath & Diapering"));
    expect(onFilterChange).toHaveBeenCalledWith({ category: undefined });
  });

  it("renders category rows as pressed buttons without category checkboxes", () => {
    renderWithProviders(
      <FilterSidebar
        filters={{ category: "bath-diapering" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    expect(screen.queryByRole("checkbox", { name: /Bath & Diapering/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bath & Diapering" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Feeding" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("adds a second category to the selection without replacing the first", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    renderWithProviders(
      <FilterSidebar
        filters={{ category: "bath-diapering" }}
        onFilterChange={onFilterChange}
        categories={mockCategories}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Feeding" }));
    expect(onFilterChange).toHaveBeenCalledWith({ category: "bath-diapering,feeding" });
  });

  it("opens active child categories and marks the active child button", () => {
    renderWithProviders(
      <FilterSidebar
        filters={{ category: "diapers-pull-ups" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    expect(screen.getByText("Diapers & Pull-Ups")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Diapers & Pull-Ups" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows filter count badge when filters active", () => {
    renderWithProviders(
      <FilterSidebar
        filters={{ category: "bath-diapering" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
  });

  it("counts each selected category in the filter badge", () => {
    renderWithProviders(
      <FilterSidebar
        filters={{ category: "bath-diapering,feeding" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'Clear all' button when filters are active", () => {
    renderWithProviders(
      <FilterSidebar
        filters={{ category: "bath-diapering" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    expect(screen.getByText("Clear all")).toBeInTheDocument();
  });

  it("renders the mobile drawer without a close button and closes from the backdrop", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <FilterSidebar
        filters={{ category: "bath-diapering" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Filters/i }));

    expect(screen.queryByRole("button", { name: "Close filters" })).not.toBeInTheDocument();
    expect(screen.getByTestId("filters-drawer-backdrop")).toBeInTheDocument();

    await user.click(screen.getByTestId("filters-drawer-backdrop"));

    expect(screen.queryByTestId("filters-drawer-backdrop")).not.toBeInTheDocument();
  });

  it("treats the mobile drawer as a dismissible dialog", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <FilterSidebar
        filters={{ category: "bath-diapering" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Filters/i }));

    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument();
  });

  it("clears all filters when 'Clear all' is clicked", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    renderWithProviders(
      <FilterSidebar
        filters={{ category: "bath-diapering" }}
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
