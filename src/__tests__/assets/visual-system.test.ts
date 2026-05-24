import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sourceFile(repoPath: string) {
  return readFileSync(path.join(process.cwd(), repoPath), "utf8");
}

describe("visual system polish", () => {
  it("keeps category icon colors on Azani design tokens", () => {
    const source = sourceFile("src/components/category-icon.tsx");

    expect(source).toContain("text-primary");
    expect(source).toContain("text-secondary");
    expect(source).toContain("text-trust");
    expect(source).not.toMatch(/text-(orange|sky|violet|emerald|pink|amber|rose|slate|red)-/);
  });

  it("uses the heading font for h1 through h4", () => {
    const source = sourceFile("src/app/globals.css");

    expect(source).toMatch(/h1,\s*h2,\s*h3,\s*h4\s*\{[\s\S]*var\(--font-dm-sans\)/);
  });

  it("keeps auth card surfaces aligned to the shared radius", () => {
    const authSources = [
      "src/app/account/login/page.tsx",
      "src/app/account/reset-password/page.tsx",
      "src/app/account/verify/page.tsx",
      "src/app/account/google-callback/page.tsx",
    ].map(sourceFile);

    for (const source of authSources) {
      expect(source).toContain("rounded-[var(--radius)]");
      expect(source).not.toContain("rounded-2xl");
    }
  });
});
