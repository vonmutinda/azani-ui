import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import GoogleCallbackPage from "@/app/account/google-callback/page";
import { renderWithProviders } from "../test-utils";

const mocks = vi.hoisted(() => ({
  validate: vi.fn(),
  link: vi.fn(),
  create: vi.fn(),
  refresh: vi.fn(),
  customer: vi.fn(),
  wishlist: vi.fn(),
  update: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  params: new URLSearchParams("code=test-code&state=test-state"),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.params,
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
}));
vi.mock("@/lib/medusa-api", () => ({
  validateGoogleCallback: mocks.validate,
  linkGoogleToExistingCustomer: mocks.link,
  createCustomerFromOAuth: mocks.create,
  refreshAuthToken: mocks.refresh,
  getCustomer: mocks.customer,
  mergeWishlistAfterAuth: mocks.wishlist,
  updateCustomer: mocks.update,
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.params = new URLSearchParams("code=test-code&state=test-state");
  // Synthetic JWT only lets the OLD callback reach its unsafe branch during RED.
  mocks.validate.mockResolvedValue(
    `a.${btoa(JSON.stringify({ actor_id: "cus_owner", auth_identity_id: "auth_google", user_metadata: { email: "owner@example.com" } }))}.b`,
  );
  mocks.link.mockResolvedValue({ customer_id: "cus_owner", linked: true });
  mocks.refresh.mockResolvedValue("confirmed-token");
  mocks.customer.mockResolvedValue({ id: "cus_owner", email: "owner@example.com" });
  mocks.wishlist.mockResolvedValue({ customer: { id: "cus_owner" }, wishlistIds: [] });
});

describe("Google callback", () => {
  it.each(["code=test-code", "code=test-code&state=", "state=test-state"])(
    "rejects missing OAuth callback parameters (%s) before contacting the server",
    async (params) => {
      mocks.params = new URLSearchParams(params);
      localStorage.setItem("medusa_auth_token", "old-token");
      renderWithProviders(<GoogleCallbackPage />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "We couldn't complete Google sign-in. Please start again.",
      );
      expect(localStorage.getItem("medusa_auth_token")).toBeNull();
      expect(mocks.validate).not.toHaveBeenCalled();
      expect(mocks.link).not.toHaveBeenCalled();
      expect(mocks.refresh).not.toHaveBeenCalled();
      expect(mocks.replace).not.toHaveBeenCalled();
    },
  );

  it.each(["invalid-state", "stale-state"])(
    "fails closed when the server rejects OAuth state (%s)",
    async (state) => {
      mocks.params = new URLSearchParams({ code: "test-code", state });
      mocks.validate.mockRejectedValue(Object.assign(new Error("State rejected"), { status: 401 }));
      localStorage.setItem("medusa_auth_token", "old-token");
      renderWithProviders(<GoogleCallbackPage />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "We couldn't complete Google sign-in. Please start again.",
      );
      expect(mocks.validate).toHaveBeenCalledExactlyOnceWith({ code: "test-code", state });
      expect(mocks.link).not.toHaveBeenCalled();
      expect(mocks.refresh).not.toHaveBeenCalled();
      expect(mocks.customer).not.toHaveBeenCalled();
      expect(mocks.replace).not.toHaveBeenCalled();
      expect(localStorage.getItem("medusa_auth_token")).toBeNull();
    },
  );

  it("confirms a valid callback's customer and session before routing", async () => {
    renderWithProviders(<GoogleCallbackPage />);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledExactlyOnceWith("/account"));
    expect(mocks.validate).toHaveBeenCalledExactlyOnceWith({
      code: "test-code",
      state: "test-state",
    });
    expect(mocks.customer).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("medusa_auth_token")).toBe("confirmed-token");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("requires a confirmed customer before routing to the account", async () => {
    mocks.customer.mockResolvedValue(null);
    mocks.wishlist.mockResolvedValue({ customer: null, wishlistIds: [] });
    renderWithProviders(<GoogleCallbackPage />);
    expect(
      await screen.findByRole("heading", { name: "Sign-in unsuccessful" }),
    ).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(localStorage.getItem("medusa_auth_token")).toBeNull();
  });

  it("asks for the existing password without accepting identity details from the browser", async () => {
    mocks.link.mockRejectedValueOnce(
      Object.assign(new Error("Sign in to connect Google."), {
        type: "google_link_required",
        status: 409,
      }),
    );
    renderWithProviders(<GoogleCallbackPage />);
    expect(await screen.findByLabelText("Existing Azani password")).toBeInTheDocument();
    expect(localStorage.getItem("medusa_auth_token")).toBeNull();
    fireEvent.change(screen.getByLabelText("Existing Azani password"), {
      target: { value: "synthetic-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Connect Google" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/account"));
    expect(mocks.link.mock.calls[1][1]).toBe("synthetic-password");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("shows server failures instead of trying to link or reporting success", async () => {
    mocks.link.mockRejectedValue(new Error("Service unavailable. Please try again."));
    renderWithProviders(<GoogleCallbackPage />);
    expect(
      await screen.findByText("We couldn't complete Google sign-in. Please start again."),
    ).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("rejects a different customer returned after token refresh", async () => {
    mocks.customer.mockResolvedValue({ id: "cus_other" });
    renderWithProviders(<GoogleCallbackPage />);
    expect(
      await screen.findByRole("heading", { name: "Sign-in unsuccessful" }),
    ).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it("does not report success when authentication disappears during wishlist merging", async () => {
    mocks.wishlist.mockResolvedValue({ customer: null, wishlistIds: [] });
    renderWithProviders(<GoogleCallbackPage />);
    expect(
      await screen.findByRole("heading", { name: "Sign-in unsuccessful" }),
    ).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("clears authentication when consent was cancelled", async () => {
    mocks.params = new URLSearchParams("error=access_denied&state=test-state");
    localStorage.setItem("medusa_auth_token", "old-token");
    renderWithProviders(<GoogleCallbackPage />);
    expect(
      await screen.findByRole("heading", { name: "Sign-in unsuccessful" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("medusa_auth_token")).toBeNull();
    await waitFor(() =>
      expect(mocks.validate).toHaveBeenCalledWith({ error: "access_denied", state: "test-state" }),
    );
  });
});
