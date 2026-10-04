import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandLogo } from "@/components/brand-logo";

describe("logo asset", () => {
  it("uses a PNG with an alpha channel for the selected cutout", () => {
    const logo = readFileSync(path.join(process.cwd(), "public/images/brand/full-logo-cutout.png"));
    expect(logo.subarray(1, 4).toString()).toBe("PNG");
    expect(logo[25]).toBe(6);
  });

  it("keeps logo image consumers aligned with the cutout dimensions", () => {
    const logo = readFileSync(path.join(process.cwd(), "public/images/brand/full-logo-cutout.png"));
    for (const placement of ["header", "footer"] as const) {
      const markup = renderToStaticMarkup(createElement(BrandLogo, { placement }));
      expect(markup).toContain("full-logo-cutout.png");
      expect(markup).toContain(`width="${logo.readUInt32BE(16)}"`);
      expect(markup).toContain(`height="${logo.readUInt32BE(20)}"`);
    }
  });
});
