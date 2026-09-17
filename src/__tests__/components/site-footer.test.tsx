import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "@/components/site-footer";

describe("SiteFooter", () => {
  it("links to kids clothing discovery destinations without assuming category stock", () => {
    const html = renderToString(<SiteFooter />);

    expect(html).toContain("Kids clothing for ages 2–12");
    expect(html).toContain('href="/products?audience=girls"');
    expect(html).toContain('href="/products?audience=boys"');
    expect(html).toContain('href="/products?age=2-4"');
    expect(html).toContain('href="/products?age=5-8"');
    expect(html).toContain('href="/products?age=9-12"');
    expect(html).toContain('href="/products?sort=newest"');
    expect(html).toContain('href="/products?sale=true"');
    expect(html).not.toContain("?category=");
    expect(html).not.toContain("Mom &amp; Maternity");
    expect(html).not.toContain("Baby Gear");
  });
});
