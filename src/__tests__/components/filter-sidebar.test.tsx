import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
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
    renderWithProviders(<FilterSidebar {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    const dialog = screen.getByRole("dialog", { name: /filters/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("All Categories")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close filters/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /filters/i })).not.toBeInTheDocument();
    });
  });

  it("marks the mobile filter trigger as a dialog trigger while open", async () => {
    const user = userEvent.setup();

    renderWithProviders(<FilterSidebar {...defaultProps} />);

    const trigger = screen.getByRole("button", { name: /filters/i });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("closes the mobile filter drawer when the desktop breakpoint matches", async () => {
    const user = userEvent.setup();
    const listeners = new Set<(event: MediaQueryListEvent | MediaQueryList) => void>();
    const media = {
      matches: false,
      media: "(min-width: 1024px)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(
        (_event: "change", listener: (event: MediaQueryListEvent | MediaQueryList) => void) => {
          listeners.add(listener);
        },
      ),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
    const matchMedia = vi.mocked(window.matchMedia);
    const originalMatchMedia = matchMedia.getMockImplementation();

    matchMedia.mockImplementation((query: string) => {
      if (query === "(min-width: 1024px)") return media;
      return originalMatchMedia?.(query) ?? media;
    });

    try {
      renderWithProviders(<FilterSidebar {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /filters/i }));
      expect(screen.getByRole("dialog", { name: /filters/i })).toBeInTheDocument();

      act(() => {
        Object.defineProperty(media, "matches", { value: true });
        listeners.forEach((listener) => listener(media));
      });

      expect(screen.queryByRole("dialog", { name: /filters/i })).not.toBeInTheDocument();
    } finally {
      if (originalMatchMedia) {
        matchMedia.mockImplementation(originalMatchMedia);
      }
    }
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

  it("labels category expand controls with category names", () => {
    renderWithProviders(<FilterSidebar {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Expand Bath & Diapering" })).toBeInTheDocument();
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
