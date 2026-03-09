import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordPage from "@/app/account/reset-password/page";
import { renderWithProviders } from "../test-utils";

const mockResetPassword = vi.fn();

vi.mock("@/lib/medusa-api", () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
}));

const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");
  return {
    ...actual,
    useSearchParams: () => mockSearchParams,
  };
});

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("token");
    mockSearchParams.delete("email");
  });

  it("shows invalid link message when token or email missing", () => {
    renderWithProviders(<ResetPasswordPage />);
    expect(screen.getByText("Invalid Reset Link")).toBeInTheDocument();
  });

  it("renders the password form when token and email are present", () => {
    mockSearchParams.set("token", "test_token");
    mockSearchParams.set("email", "test@example.com");

    renderWithProviders(<ResetPasswordPage />);
    expect(screen.getByText("Set New Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
  });

  it("shows validation error for short password", async () => {
    const user = userEvent.setup();
    mockSearchParams.set("token", "test_token");
    mockSearchParams.set("email", "test@example.com");

    renderWithProviders(<ResetPasswordPage />);

    await user.type(screen.getByPlaceholderText("New password"), "short");
    await user.type(screen.getByPlaceholderText("Confirm password"), "short");
    await user.click(screen.getByText("Reset Password"));

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it("shows validation error for mismatched passwords", async () => {
    const user = userEvent.setup();
    mockSearchParams.set("token", "test_token");
    mockSearchParams.set("email", "test@example.com");

    renderWithProviders(<ResetPasswordPage />);

    await user.type(screen.getByPlaceholderText("New password"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "different123");
    await user.click(screen.getByText("Reset Password"));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    });
  });

  it("calls resetPassword on valid submission", async () => {
    const user = userEvent.setup();
    mockSearchParams.set("token", "test_token");
    mockSearchParams.set("email", "test@example.com");
    mockResetPassword.mockResolvedValueOnce({});

    renderWithProviders(<ResetPasswordPage />);

    await user.type(screen.getByPlaceholderText("New password"), "validPass1!");
    await user.type(screen.getByPlaceholderText("Confirm password"), "validPass1!");
    await user.click(screen.getByText("Reset Password"));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith(
        "test_token",
        "test@example.com",
        "validPass1!",
      );
    });
  });

  it("shows success state after successful reset", async () => {
    const user = userEvent.setup();
    mockSearchParams.set("token", "test_token");
    mockSearchParams.set("email", "test@example.com");
    mockResetPassword.mockResolvedValueOnce({});

    renderWithProviders(<ResetPasswordPage />);

    await user.type(screen.getByPlaceholderText("New password"), "validPass1!");
    await user.type(screen.getByPlaceholderText("Confirm password"), "validPass1!");
    await user.click(screen.getByText("Reset Password"));

    await waitFor(() => {
      expect(screen.getByText("Password Reset!")).toBeInTheDocument();
    });
  });
});
