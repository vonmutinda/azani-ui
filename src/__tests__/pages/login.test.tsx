import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/account/login/page";
import { renderWithProviders } from "../test-utils";

const mockPush = vi.fn();
const mockLoginCustomer = vi.fn();
const mockRegisterCustomer = vi.fn();
const mockMergeWishlistAfterAuth = vi.fn();
const mockRequestPasswordReset = vi.fn();
const mockSetAuthToken = vi.fn();
const mockClearAuthToken = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/medusa-api", () => ({
  loginCustomer: (...args: unknown[]) => mockLoginCustomer(...args),
  registerCustomer: (...args: unknown[]) => mockRegisterCustomer(...args),
  mergeWishlistAfterAuth: (...args: unknown[]) => mockMergeWishlistAfterAuth(...args),
  requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
}));

vi.mock("@/lib/http", () => ({
  setAuthToken: (...args: unknown[]) => mockSetAuthToken(...args),
  clearAuthToken: (...args: unknown[]) => mockClearAuthToken(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockMergeWishlistAfterAuth.mockResolvedValue({
    customer: { id: "cus_1", email: "test@example.com", has_account: true },
    wishlistIds: [],
  });
});

async function fillRegistrationForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("Create one"));
  fireEvent.change(screen.getByPlaceholderText("First name"), {
    target: { value: "John" },
  });
  fireEvent.change(screen.getByPlaceholderText("Last name"), {
    target: { value: "Doe" },
  });
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: "john@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Min. 8 characters"), {
    target: { value: "Secret123" },
  });
  fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), {
    target: { value: "Secret123" },
  });
}

describe("LoginPage", () => {
  it("renders sign in form by default", () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("signs in and routes to account after successful session rehydration", async () => {
    mockLoginCustomer.mockResolvedValueOnce({ token: "jwt_123" });

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "Secret123" },
    });
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockLoginCustomer).toHaveBeenCalledWith("test@example.com", "Secret123");
    });
    await waitFor(() => {
      expect(mockSetAuthToken).toHaveBeenCalledWith("jwt_123");
      expect(mockPush).toHaveBeenCalledWith("/account");
    });
  });

  it("shows a session error instead of routing when auth cannot be rehydrated", async () => {
    mockLoginCustomer.mockResolvedValueOnce({ token: "jwt_123" });
    mockMergeWishlistAfterAuth.mockResolvedValueOnce({
      customer: null,
      wishlistIds: [],
    });

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "Secret123" },
    });
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(
        screen.getByText("We couldn't keep you signed in. Please sign in again."),
      ).toBeInTheDocument();
    });
    expect(mockClearAuthToken).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows account continuation after registration when session is valid", async () => {
    mockRegisterCustomer.mockResolvedValueOnce({
      token: "jwt_123",
      customer: { id: "cus_1", email: "john@example.com" },
    });

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await fillRegistrationForm(user);
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Check Your Inbox" })).toBeInTheDocument();
    });

    const continueLink = screen.getByRole("link", { name: "Continue to Account" });
    expect(continueLink).toHaveAttribute("href", "/account");
  });

  it("falls back to sign in continuation when registration session is not durable", async () => {
    mockRegisterCustomer.mockResolvedValueOnce({
      token: "jwt_123",
      customer: { id: "cus_1", email: "john@example.com" },
    });
    mockMergeWishlistAfterAuth.mockResolvedValueOnce({
      customer: null,
      wishlistIds: ["prod_1"],
    });

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await fillRegistrationForm(user);
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Check Your Inbox" })).toBeInTheDocument();
    });

    const signInLink = screen.getByRole("link", { name: "Sign In to Continue" });
    expect(signInLink).toHaveAttribute("href", "/account/login");
    expect(mockClearAuthToken).toHaveBeenCalled();
  });

  it("validates email before submitting", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "Secret123" },
    });
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(mockLoginCustomer).not.toHaveBeenCalled();
  });
});
