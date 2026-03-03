import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/account/login/page";
import { renderWithProviders } from "../test-utils";

const mockLoginCustomer = vi.fn();
const mockRegisterCustomer = vi.fn();

vi.mock("@/lib/medusa-api", () => ({
  loginCustomer: (...args: unknown[]) => mockLoginCustomer(...args),
  registerCustomer: (...args: unknown[]) => mockRegisterCustomer(...args),
}));

vi.mock("@/lib/http", () => ({
  setAuthToken: vi.fn(),
}));

describe("LoginPage", () => {
  it("renders sign in form by default", () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("does not show name fields in sign in mode", () => {
    renderWithProviders(<LoginPage />);
    expect(screen.queryByPlaceholderText("First name")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Last name")).not.toBeInTheDocument();
  });

  it("switches to registration form", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.click(screen.getByText("Create one"));

    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("First name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Last name")).toBeInTheDocument();
  });

  it("switches back to sign in from registration", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.click(screen.getByText("Create one"));
    await user.click(screen.getByText("Sign in"));

    expect(screen.queryByPlaceholderText("First name")).not.toBeInTheDocument();
  });

  it("calls loginCustomer on form submit", async () => {
    mockLoginCustomer.mockResolvedValueOnce({ token: "jwt_123" });

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockLoginCustomer).toHaveBeenCalledWith("test@example.com", "password123");
    });
  });

  it("calls registerCustomer on registration submit", async () => {
    mockRegisterCustomer.mockResolvedValueOnce({
      token: "jwt_123",
      customer: { id: "cus_1" },
    });

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.click(screen.getByText("Create one"));
    await user.type(screen.getByPlaceholderText("First name"), "John");
    await user.type(screen.getByPlaceholderText("Last name"), "Doe");
    await user.type(screen.getByPlaceholderText("Email"), "john@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(mockRegisterCustomer).toHaveBeenCalledWith({
        email: "john@example.com",
        password: "secret123",
        first_name: "John",
        last_name: "Doe",
      });
    });
  });

  it("shows 'Please wait...' when submitting", async () => {
    mockLoginCustomer.mockReturnValue(new Promise(() => {})); // never resolves

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "pw");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByText("Please wait...")).toBeInTheDocument();
    });
  });

  it("shows error message on login failure", async () => {
    mockLoginCustomer.mockRejectedValueOnce(new Error("Invalid credentials"));

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });
});
