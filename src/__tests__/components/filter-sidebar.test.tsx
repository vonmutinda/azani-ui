import { describe, it, expect, vi } from "vitest";
import { screen, within } from "@testing-library/react";
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

  it("expands a top-level category and selects a child category", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    renderWithProviders(<FilterSidebar {...defaultProps} onFilterChange={onFilterChange} />);

    await user.click(screen.getByLabelText("Expand Bath & Diapering"));
    await user.click(screen.getByText("Diapers & Pull-Ups"));

    expect(onFilterChange).toHaveBeenCalledWith({ category: "diapers-pull-ups" });
  });

  it("opens active child categories and marks the active category", () => {
    renderWithProviders(
      <FilterSidebar
        filters={{ category: "diapers-pull-ups" }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    expect(screen.getByText("Diapers & Pull-Ups")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Diapers & Pull-Ups" })).toHaveAttribute(
      "aria-current",
      "true",
    );
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
    expect(onFilterChange).toHaveBeenCalledWith({});
  });

  it("opens and closes the mobile filter drawer", async () => {
    const user = userEvent.setup();

    renderWithProviders(<FilterSidebar {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Open filters" }));

    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("All Categories")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Close filters" }));

    expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument();
  });
});
