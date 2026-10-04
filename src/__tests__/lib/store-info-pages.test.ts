import { describe, expect, it } from "vitest";
import { allStoreInfoPages, policyPages } from "@/lib/store-info-pages";

describe("store information content", () => {
  it("registers all expected policy routes", () => {
    expect(Object.values(policyPages).map((page) => page.href)).toEqual([
      "/policies/shipping",
      "/policies/returns",
      "/policies/privacy",
      "/policies/terms",
    ]);
  });

  it("keeps policy copy original to Azani", () => {
    const registryText = JSON.stringify(allStoreInfoPages).toLowerCase();

    expect(registryText).toContain("azani");
    expect(registryText).not.toContain("zaira");
    expect(registryText).not.toContain("zairababies");
  });

  it("describes clothing support without retired departments", () => {
    const registryText = JSON.stringify(allStoreInfoPages).toLowerCase();

    expect(registryText).toContain("clothing");
    expect(registryText).toContain("size");
    expect(registryText).not.toContain("baby products");
    expect(registryText).not.toContain("feeding, diapering, nursery");
    expect(registryText).not.toContain("maternity essentials");
  });
});
