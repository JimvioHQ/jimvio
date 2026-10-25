import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { toPublicCampaignListItem } from "./public-campaign-list.ts";

describe("public campaign list", () => {
  it("keeps brand_id for similar campaigns and drops operator identifiers", () => {
    const item = toPublicCampaignListItem({
      id: "camp-1",
      title: "Clip this",
      status: "active",
      brand_id: "brand-1",
      admin_activated_by: "operator-secret",
      admin_activation_reason: "internal note",
      vendor: {
        business_name: "North",
        owner: { full_name: "Ada", avatar_url: "https://cdn.example/a.png", id: "user-secret", email: "ada@example.com" },
      },
      media: [{ id: "m1", url: "https://cdn.example/m.png", uploaded_by: "user-secret" }],
    });
    assert.equal(item.brand_id, "brand-1");
    assert.equal(item.title, "Clip this");
    assert.equal("admin_activated_by" in item, false);
    assert.equal("admin_activation_reason" in item, false);
    const owner = (item.vendor as { owner: Record<string, unknown> }).owner;
    assert.equal(owner.full_name, "Ada");
    assert.equal("id" in owner, false);
    assert.equal("email" in owner, false);
    const encoded = JSON.stringify(item);
    assert.equal(encoded.includes("operator-secret"), false);
    assert.equal(encoded.includes("internal note"), false);
    assert.equal(encoded.includes("user-secret"), false);
    assert.equal(encoded.includes("ada@example.com"), false);
  });

  it("strips operator identifiers from public campaign reads and keeps owner lists intact", () => {
    const root = join(process.cwd(), "app/api/ugc/campaigns");
    const list = readFileSync(join(root, "route.ts"), "utf8");
    const detail = readFileSync(join(root, "[id]/route.ts"), "utf8");
    assert.match(list, /mine \? row : toPublicCampaignListItem/);
    assert.match(detail, /toPublicCampaignListItem\(data as Record<string, unknown>\)/);
    assert.equal(detail.includes("campaign: data"), false);
  });
});
