import { afterEach, beforeAll, describe, it, expect, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { toast as heroToast } from "@heroui/react";
import { ToastProvider, useToast } from "@/components/toast";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  });
});

afterEach(async () => {
  await act(async () => {
    heroToast.clear();
  });
});

function ToastTrigger({
  message,
  type,
}: {
  message: string;
  type?: "success" | "error" | "info" | "cart";
}) {
  const { showToast } = useToast();
  return <button onClick={() => showToast(message, type)}>Show Toast</button>;
}

function renderWithToast(message: string, type?: "success" | "error" | "info" | "cart") {
  return render(
    <ToastProvider>
      <ToastTrigger message={message} type={type} />
    </ToastProvider>,
  );
}

describe("ToastProvider", () => {
  it("renders children", () => {
    render(
      <ToastProvider>
        <div>Test Content</div>
      </ToastProvider>,
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("shows a toast when showToast is called", async () => {
    const user = userEvent.setup();
    renderWithToast("Item added!");

    await user.click(screen.getByText("Show Toast"));
    expect(screen.getByText("Item added!")).toBeInTheDocument();
  });

  it("shows toast with correct type icon", async () => {
    const user = userEvent.setup();
    renderWithToast("Error occurred", "error");

    await user.click(screen.getByText("Show Toast"));
    expect(screen.getByText("Error occurred")).toBeInTheDocument();
  });

  it("dismisses toast when X button is clicked", async () => {
    const user = userEvent.setup();
    renderWithToast("Dismissable toast");

    await user.click(screen.getByText("Show Toast"));
    expect(screen.getByText("Dismissable toast")).toBeInTheDocument();

    const toast = screen.getByRole("alertdialog", { name: "Dismissable toast" });
    const dismissBtn = within(toast).getByRole("button", { name: /dismiss|close/i });
    await user.click(dismissBtn);

    await waitFor(
      () => {
        expect(screen.queryByText("Dismissable toast")).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("shows multiple toasts simultaneously", async () => {
    const user = userEvent.setup();

    function MultiTrigger() {
      const { showToast } = useToast();
      return (
        <>
          <button onClick={() => showToast("First toast")}>First</button>
          <button onClick={() => showToast("Second toast", "error")}>Second</button>
        </>
      );
    }

    render(
      <ToastProvider>
        <MultiTrigger />
      </ToastProvider>,
    );

    await user.click(screen.getByText("First"));
    await user.click(screen.getByText("Second"));

    expect(screen.getByText("First toast")).toBeInTheDocument();
    expect(screen.getByText("Second toast")).toBeInTheDocument();
  });
});

describe("useToast", () => {
  it("throws when used outside ToastProvider", () => {
    function BadComponent() {
      useToast();
      return null;
    }

    expect(() => render(<BadComponent />)).toThrow("useToast must be used within ToastProvider");
  });
});
