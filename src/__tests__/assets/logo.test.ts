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
});
