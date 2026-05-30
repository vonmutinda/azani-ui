import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductGallery } from "@/components/product-gallery";

const IMAGES = [
  { url: "https://example.com/a.jpg" },
  { url: "https://example.com/b.jpg" },
  { url: "https://example.com/c.jpg" },
];

describe("ProductGallery", () => {
  it("shows the main image with the product title as its alt text", () => {
    render(<ProductGallery thumbnail={IMAGES[0].url} images={IMAGES} title="Cosy Onesie" />);
    expect(screen.getByAltText("Cosy Onesie")).toBeInTheDocument();
  });

  it("renders a thumbnail per image and an N / M counter when there are multiple", () => {
    render(<ProductGallery thumbnail={null} images={IMAGES} title="Cosy Onesie" />);
    expect(
      screen.getByRole("button", { name: "Show image 1 of Cosy Onesie" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show image 3 of Cosy Onesie" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("changes the active image when a thumbnail is clicked", async () => {
    const user = userEvent.setup();
    render(<ProductGallery thumbnail={null} images={IMAGES} title="Cosy Onesie" />);

    await user.click(screen.getByRole("button", { name: "Show image 2 of Cosy Onesie" }));

    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show image 2 of Cosy Onesie" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("wraps to the first image when 'next' is used on the last image", async () => {
    const user = userEvent.setup();
    render(<ProductGallery thumbnail={null} images={IMAGES} title="Cosy Onesie" />);

    await user.click(screen.getByRole("button", { name: "Show image 3 of Cosy Onesie" }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show next image" }));
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("de-dupes the thumbnail against the images list", () => {
    // thumbnail === images[0] → 3 unique images, not 4
    render(<ProductGallery thumbnail={IMAGES[0].url} images={IMAGES} title="Cosy Onesie" />);
    expect(
      screen.queryByRole("button", { name: "Show image 4 of Cosy Onesie" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("hides the rail, arrows and counter for a single image", () => {
    render(<ProductGallery thumbnail={null} images={[IMAGES[0]]} title="Cosy Onesie" />);
    expect(screen.queryByRole("button", { name: /Show image/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show next image" })).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
    expect(screen.getByAltText("Cosy Onesie")).toBeInTheDocument();
  });

  it("shows a fallback when the active image fails to load", () => {
    render(<ProductGallery thumbnail={null} images={[IMAGES[0]]} title="Cosy Onesie" />);
    fireEvent.error(screen.getByAltText("Cosy Onesie"));
    expect(screen.getByText("Image coming soon")).toBeInTheDocument();
  });
});
