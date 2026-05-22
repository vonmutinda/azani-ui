import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AZANI_DEFAULT_LOGO, AZANI_LOGO_VARIANTS } from "@/lib/brand-assets";

const variantIds = ["blue", "cream", "gold", "rose", "sage", "terracotta"] as const;

function publicFile(publicPath: string) {
  return path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}

describe("Azani brand assets", () => {
  it("groups each logo variant under stable public brand paths", () => {
    expect(Object.keys(AZANI_LOGO_VARIANTS).sort()).toEqual([...variantIds].sort());

    for (const variantId of variantIds) {
      const variant = AZANI_LOGO_VARIANTS[variantId];

      expect(variant.id).toBe(variantId);
      expect(variant.logo.width).toBe(1108);
      expect(variant.logo.height).toBe(384);
      expect(variant.logo.inline2x).toBe(
        `/brand/azani/logo/inline/azani-logo-pram-inline-${variantId}@2x.png`,
      );
      expect(variant.logo.inline4x).toBe(
        `/brand/azani/logo/inline/azani-logo-pram-inline-${variantId}@4x.png`,
      );
      expect(variant.mark.svg).toBe(`/brand/azani/mark/azani-mark-pram-${variantId}.svg`);

      for (const assetPath of [variant.logo.inline2x, variant.logo.inline4x, variant.mark.svg]) {
        const file = publicFile(assetPath);
        expect(existsSync(file), `${assetPath} should exist`).toBe(true);
        expect(statSync(file).size, `${assetPath} should not be empty`).toBeGreaterThan(1000);
      }
    }
  });

  it("uses the rose logo as the shared storefront default", () => {
    expect(AZANI_DEFAULT_LOGO).toBe(AZANI_LOGO_VARIANTS.rose);
  });

  it("keeps logo image consumers on the shared brand asset registry", () => {
    const header = readFileSync(path.join(process.cwd(), "src/components/site-header.tsx"), "utf8");
    const footer = readFileSync(path.join(process.cwd(), "src/components/site-footer.tsx"), "utf8");

    expect(header).toContain('import { AZANI_DEFAULT_LOGO } from "@/lib/brand-assets";');
    expect(header).toContain("src={AZANI_DEFAULT_LOGO.logo.inline2x}");
    expect(header).toContain("width={AZANI_DEFAULT_LOGO.logo.width}");
    expect(header).toContain("height={AZANI_DEFAULT_LOGO.logo.height}");

    expect(footer).toContain('import { AZANI_DEFAULT_LOGO } from "@/lib/brand-assets";');
    expect(footer).toContain("src={AZANI_DEFAULT_LOGO.logo.inline2x}");
    expect(footer).toContain("width={AZANI_DEFAULT_LOGO.logo.width}");
    expect(footer).toContain("height={AZANI_DEFAULT_LOGO.logo.height}");
  });
});
