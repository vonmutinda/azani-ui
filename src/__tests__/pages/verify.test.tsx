import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import VerifyEmailPage from "@/app/account/verify/page";
import { renderWithProviders } from "../test-utils";

const mockVerifyEmail = vi.fn();
const mockResendVerificationEmail = vi.fn();

vi.mock("@/lib/medusa-api", () => ({
  verifyEmail: (...args: unknown[]) => mockVerifyEmail(...args),
  resendVerificationEmail: (...args: unknown[]) => mockResendVerificationEmail(...args),
}));

const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");
  return {
    ...actual,
    useSearchParams: () => mockSearchParams,
  };
});

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("token");
    mockSearchParams.delete("email");
  });

  it("shows error when token or email missing", () => {
    renderWithProviders(<VerifyEmailPage />);
    expect(screen.getByText("Verification Failed")).toBeInTheDocument();
  });

  it("shows loading state when verifying", () => {
    mockSearchParams.set("token", "test_token");
    mockSearchParams.set("email", "test@example.com");
    mockVerifyEmail.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<VerifyEmailPage />);
    expect(screen.getByText("Verifying Your Email...")).toBeInTheDocument();
  });

  it("shows success after verification", async () => {
    mockSearchParams.set("token", "test_token");
    mockSearchParams.set("email", "test@example.com");
    mockVerifyEmail.mockResolvedValueOnce({ message: "ok", verified: true });

    renderWithProviders(<VerifyEmailPage />);
    await waitFor(() => {
      expect(screen.getByText("Email Verified!")).toBeInTheDocument();
    });
  });

  it("shows already verified state", async () => {
    mockSearchParams.set("token", "test_token");
    mockSearchParams.set("email", "test@example.com");
    mockVerifyEmail.mockResolvedValueOnce({ message: "ok", already_verified: true });

    renderWithProviders(<VerifyEmailPage />);
    await waitFor(() => {
      expect(screen.getByText("Already Verified")).toBeInTheDocument();
    });
  });

  it("shows error on verification failure", async () => {
    mockSearchParams.set("token", "bad_token");
    mockSearchParams.set("email", "test@example.com");
    mockVerifyEmail.mockRejectedValueOnce(new Error("Invalid token"));

    renderWithProviders(<VerifyEmailPage />);
    await waitFor(() => {
      expect(screen.getByText("Verification Failed")).toBeInTheDocument();
    });
  });
});
