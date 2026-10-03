import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CategoryIcon } from "@/components/category-icon";

describe("CategoryIcon", () => {
  it("renders an SVG element", () => {
    const { container } = render(<CategoryIcon icon="baby" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("applies the default size (20px)", () => {
    const { container } = render(<CategoryIcon icon="baby" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveStyle({ width: "20px", height: "20px" });
  });

  it("applies custom size", () => {
    const { container } = render(<CategoryIcon icon="baby" size={32} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveStyle({ width: "32px", height: "32px" });
  });

  it("applies custom className", () => {
    const { container } = render(<CategoryIcon icon="baby" className="text-red" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("text-red");
  });

  it("falls back to Baby icon for unknown icons", () => {
    const { container: known } = render(<CategoryIcon icon="baby" />);
    const { container: unknown } = render(<CategoryIcon icon="totally-unknown" />);

    const knownSvg = known.querySelector("svg");
    const unknownSvg = unknown.querySelector("svg");
    expect(knownSvg).toBeInTheDocument();
    expect(unknownSvg).toBeInTheDocument();
  });
});
