import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("logo asset", () => {
  it("keeps the visible mark aligned near the SVG left edge", () => {
    const logo = readFileSync(path.join(process.cwd(), "public/logo.svg"), "utf8");

    const markTransform = logo.match(/id="azani-mark"\s+transform="translate\(([-\d.]+) 15\)"/);
    const wordmarkTransform = logo.match(
      /id="azani-wordmark"[\s\S]*?transform="translate\(([-\d.]+) 0\)"/,
    );

    expect(markTransform?.[1]).toBe("4");
    expect(wordmarkTransform?.[1]).toBe("-24");
  });

  it("keeps logo image consumers on the SVG aspect ratio", () => {
    const header = readFileSync(path.join(process.cwd(), "src/components/site-header.tsx"), "utf8");
    const footer = readFileSync(path.join(process.cwd(), "src/components/site-footer.tsx"), "utf8");

    expect(header).toContain('src="/logo.svg"');
    expect(header).toContain("width={320}");
    expect(header).toContain("height={100}");

    expect(footer).toContain('src="/logo.svg"');
    expect(footer).toContain("width={320}");
    expect(footer).toContain("height={100}");
  });
});
