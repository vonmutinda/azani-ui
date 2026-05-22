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

  it("opens and closes the mobile filter drawer", async () => {
    const user = userEvent.setup();

    renderWithProviders(<FilterSidebar {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /filters/i }));
    const dialog = screen.getByRole("dialog", { name: /filters/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("All Categories")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close filters/i }));
    expect(screen.queryByRole("dialog", { name: /filters/i })).not.toBeInTheDocument();
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
    expect(onFilterChange).toHaveBeenCalledWith({ category: ["bath-diapering"] });
  });

  it("adds a category without replacing existing selected categories", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    renderWithProviders(
      <FilterSidebar
        filters={{ category: ["bath-diapering"] }}
        onFilterChange={onFilterChange}
        categories={mockCategories}
      />,
    );

    await user.click(screen.getByText("Feeding"));

    expect(onFilterChange).toHaveBeenCalledWith({ category: ["bath-diapering", "feeding"] });
  });

  it("expands a top-level category and selects a child category", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    renderWithProviders(<FilterSidebar {...defaultProps} onFilterChange={onFilterChange} />);

    await user.click(screen.getByLabelText("Expand Bath & Diapering"));
    await user.click(screen.getByText("Diapers & Pull-Ups"));

    expect(onFilterChange).toHaveBeenCalledWith({ category: ["diapers-pull-ups"] });
  });

  it("opens active child categories and marks the active category", () => {
    renderWithProviders(
      <FilterSidebar
        filters={{ category: ["diapers-pull-ups"] }}
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

  it("removes only the deselected category", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    renderWithProviders(
      <FilterSidebar
        filters={{ category: ["bath-diapering", "feeding"] }}
        onFilterChange={onFilterChange}
        categories={mockCategories}
      />,
    );

    await user.click(screen.getByText("Bath & Diapering"));
    expect(onFilterChange).toHaveBeenCalledWith({ category: ["feeding"] });
  });

  it("shows filter count badge when filters active", () => {
    renderWithProviders(
      <FilterSidebar
        filters={{ category: ["bath-diapering"] }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
      />,
    );

    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'Clear all' button when filters are active", () => {
    renderWithProviders(
      <FilterSidebar
        filters={{ category: ["bath-diapering"] }}
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
        filters={{ category: ["bath-diapering"] }}
        onFilterChange={onFilterChange}
        categories={mockCategories}
      />,
    );

    await user.click(screen.getByText("Clear all"));
    expect(onFilterChange).toHaveBeenCalledWith({});
  });
});
