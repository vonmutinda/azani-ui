import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteScrollRestoration } from "@/components/route-scroll-restoration";

const mockUsePathname = vi.fn(() => "/policies/shipping");

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("RouteScrollRestoration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockUsePathname.mockReset();
    mockUsePathname.mockReturnValue("/policies/shipping");
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  it("scrolls to the document top on initial route mount and pathname changes", async () => {
    const { rerender } = render(<RouteScrollRestoration />);

    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
    });

    vi.mocked(window.scrollTo).mockClear();
    mockUsePathname.mockReturnValue("/policies/returns");
    rerender(<RouteScrollRestoration />);

    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
    });
  });

  it("does not schedule a new scroll when the pathname is unchanged", async () => {
    const { rerender } = render(<RouteScrollRestoration />);

    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledTimes(1));

    vi.mocked(window.scrollTo).mockClear();
    rerender(<RouteScrollRestoration />);

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
