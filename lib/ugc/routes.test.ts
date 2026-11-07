import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  isUgcBrandWorkspaceAlias,
  UGC_BRAND_WORKSPACE_ALIASES,
  UGC_BRAND_WORKSPACE_CANONICAL,
} from "./routes";

describe("ugc brand workspace routes", () => {
  it("canonical Brand Workspace is campaign-center", () => {
    assert.equal(UGC_BRAND_WORKSPACE_CANONICAL, "/ugc/campaign-center");
  });

  it("treats /ugc/brand-workspace as an alias, not a campaign id", () => {
    assert.equal(isUgcBrandWorkspaceAlias("/ugc/brand-workspace"), true);
    assert.equal(isUgcBrandWorkspaceAlias("/ugc/brand-workspace/"), true);
    assert.equal(isUgcBrandWorkspaceAlias("/ugc/campaign-center"), false);
    assert.equal(isUgcBrandWorkspaceAlias("/ugc/98b37323-b83a-4e98-b351-343153865f6c"), false);
  });

  it("next.config permanently redirects brand-workspace aliases", () => {
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    for (const alias of UGC_BRAND_WORKSPACE_ALIASES) {
      assert.match(config, new RegExp(`source:\\s*"${alias.replace(/\//g, "\\/")}"`));
    }
    assert.match(config, /destination:\s*"\/ugc\/campaign-center"/);
    assert.match(config, /source:\s*"\/ugc\/brand-workspace\/:path\*"/);
  });

  it("brand-workspace page exists so App Router does not treat it as [id]", () => {
    const page = readFileSync(
      join(process.cwd(), "app/ugc/brand-workspace/page.tsx"),
      "utf8",
    );
    assert.match(page, /permanentRedirect/);
    assert.match(page, /UGC_BRAND_WORKSPACE_CANONICAL/);
  });
});
