import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StarRating } from "@/components/star-rating";

describe("StarRating", () => {
  it("renders 5 stars", () => {
    const { container } = render(<StarRating rating={3} />);
    const stars = container.querySelectorAll("svg");
    expect(stars).toHaveLength(5);
  });

  it("fills stars according to rating", () => {
    const { container } = render(<StarRating rating={4} />);
    const filledStars = container.querySelectorAll(".star-filled");
    const emptyStars = container.querySelectorAll(".star-empty");
    expect(filledStars).toHaveLength(4);
    expect(emptyStars).toHaveLength(1);
  });

  it("rounds half ratings", () => {
    const { container } = render(<StarRating rating={3.6} />);
    const filledStars = container.querySelectorAll(".star-filled");
    expect(filledStars).toHaveLength(4);
  });

  it("shows total when provided", () => {
    render(<StarRating rating={4} total={128} />);
    expect(screen.getByText("(128)")).toBeInTheDocument();
  });

  it("does not show total when not provided", () => {
    const { container } = render(<StarRating rating={3} />);
    expect(container.textContent).not.toContain("(");
  });

  it("applies custom size", () => {
    const { container } = render(<StarRating rating={5} size={20} />);
    const star = container.querySelector("svg");
    expect(star).toHaveStyle({ width: "20px", height: "20px" });
  });
});
