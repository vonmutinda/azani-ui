import { describe, it, expect } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { ToastProvider, useToast } from "@/components/toast";

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
    expect(screen.getByRole("region", { name: /notification/i })).toHaveClass("azani-toast-region");
  });

  it("shows a cart toast without changing the showToast API", async () => {
    const user = userEvent.setup();
    renderWithToast("Added to cart", "cart");

    await user.click(screen.getByText("Show Toast"));
    expect(screen.getByText("Added to cart")).toBeInTheDocument();
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
