import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { LEGAL_DOCUMENTS } from "@/lib/legal/catalog";
import { PAGE_SEO } from "@/lib/seo";
import { growthCatalogPages } from "./catalog";
import { PUBLIC_SITEMAP_ROUTES } from "./public-surface";
import { auditSeo } from "./seo";

function publishedCopy(relativePath: string): { title: string; description: string } {
  const source = readFileSync(join(process.cwd(), relativePath), "utf8");
  const title = source.match(/title:\s*"([^"]+)"/)?.[1];
  const description = source.match(/description:\s*(?:\n\s*)?"([^"]+)"/)?.[1];
  assert.ok(title, relativePath);
  assert.ok(description, relativePath);
  return { title: title ?? "", description: description ?? "" };
}

describe("growth metadata catalog", () => {
  it("covers every static sitemap path without treating a redirect source as a sitemap URL", () => {
    const pages = growthCatalogPages();
    const paths = pages.map((page) => page.path);
    assert.equal(new Set(paths).size, paths.length);
    for (const route of PUBLIC_SITEMAP_ROUTES) {
      assert.equal(paths.includes(route.path), true, route.path);
    }

    const findings = auditSeo({
      pages,
      sitemapPaths: PUBLIC_SITEMAP_ROUTES.map((route) => route.path),
      knownPaths: paths,
      organizationSchema: true,
      websiteSchema: true,
    });
    assert.equal(findings.some((item) => item.code === "sitemap-without-metadata"), false);
    assert.equal(
      findings.some((item) => item.code === "metadata-not-in-sitemap" && item.path === "/contact"),
      true,
    );
    assert.equal(findings.some((item) => item.path === "/help/contact" && item.code === "sitemap-without-metadata"), false);

    const contact = pages.find((page) => page.path === "/help/contact");
    assert.equal(contact?.title, PAGE_SEO.contact.title);
    assert.equal(contact?.description, PAGE_SEO.contact.description);
    assert.equal(contact?.canonical, "/help/contact");
    assert.equal(pages.find((page) => page.path === "/contact")?.canonical, "/contact");

    for (const [route, file] of [
      ["/community-guidelines", "app/(public)/community-guidelines/page.tsx"],
      ["/prohibited-products", "app/(public)/prohibited-products/page.tsx"],
      ["/refunds-payouts", "app/(public)/refunds-payouts/page.tsx"],
    ] as const) {
      const copy = publishedCopy(file);
      const page = pages.find((item) => item.path === route);
      assert.equal(page?.title, copy.title);
      assert.equal(page?.description, copy.description);
      assert.equal(page?.canonical, route);
    }

    for (const doc of LEGAL_DOCUMENTS) {
      if (!doc.href.startsWith("/legal/")) continue;
      const page = pages.find((item) => item.path === doc.href);
      assert.equal(page?.title, doc.title, doc.href);
      assert.equal(page?.description, doc.description, doc.href);
    }

    const supplemental = pages.filter((page) => !Object.values(PAGE_SEO).some((item) => item.path === page.path));
    for (const page of supplemental) {
      const description = page.description?.trim() ?? "";
      assert.equal(description.length >= 50 && description.length <= 160, true, `${page.path} description length ${description.length}`);
    }
  });
});
