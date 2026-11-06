import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import { formatMoneyAsUSD } from "@/lib/currency/platform";
import { resolveStockStatus } from "./stock-status";
import { buildCanonicalProductUrl } from "@/components/marketplace/product-share-dialog";
import { formatCustomerShippingCost } from "@/lib/cj/shipping-display";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("PDP layout", () => {
  const physical = read("components/marketplace/product-detail-physical.tsx");
  const shared = read("components/marketplace/product-detail-shared.tsx");

  it("keeps a single desktop purchase module", () => {
    assert.equal(physical.includes("StickyPurchaseCard"), false);
    assert.equal(physical.includes("Why Choose"), false);
    assert.equal(physical.includes("ProductActionModule"), true);
    assert.equal(physical.includes("SellToStoreButton"), true);
    assert.equal(physical.includes("MobileStickyBuyBar"), true);
  });

  it("keeps shipping and buyer protection after the sidebar is removed", () => {
    assert.equal(physical.includes("Shipping Information"), true);
    assert.equal(physical.includes("Jimvio Buyer Protection"), true);
    assert.equal(physical.includes("Learn more"), true);
    assert.equal(physical.includes("Free shipping on orders over $50"), false);
    assert.equal(physical.includes("SKU <span"), false);
    assert.equal(physical.includes("DROPSHIP"), false);
    assert.equal(shared.includes("DROPSHIP"), false);
    // Seller lives in Seller Info tab only — not under purchase price
    assert.equal(physical.includes("CompactSellerRow"), false);
    assert.equal(physical.includes("DesktopSellerCompact"), false);
    assert.equal(physical.includes('label: "Fulfilled Orders"'), false);
    assert.equal(physical.includes("VendorSectionCard"), true);
    assert.equal(physical.includes("PdpTrustStrip"), true);
    assert.equal(physical.includes("CompactBuyerProtectionCard"), true);
    assert.equal(physical.includes("order-6"), false);
    // No large left-column seller card under the gallery
    assert.equal(physical.includes("order-3"), false);
  });

  it("keeps marketplace cards free of dropship badges and reveals both commerce actions", () => {
    const physicalCard = read("components/marketplace/product-card-physical.tsx");
    const clientCard = read("components/marketplace/product-card-client.tsx");
    const actions = read("components/marketplace/product-card-commerce-actions.tsx");
    assert.equal(physicalCard.includes("Dropship"), false);
    assert.equal(clientCard.includes("Dropship"), false);
    assert.equal(physicalCard.includes("ProductCardCommerceActions"), true);
    assert.equal(clientCard.includes("ProductCardCommerceActions"), true);
    assert.equal(actions.includes("Add to Cart"), true);
    assert.equal(actions.includes("Sell to Store"), true);
    assert.equal(actions.includes("Buy now"), false);
    assert.equal(actions.includes("group-hover"), true);
    assert.equal(actions.includes("flex-col"), true);
    assert.equal(actions.includes("h-8"), true);
    assert.equal(actions.includes("onPointerDown"), true);
    assert.equal(actions.includes("setOpenProductCardActionsId"), true);
    const gallery = read("components/marketplace/image-gallery.tsx");
    assert.equal(gallery.includes("onMouseMove={(e) => { onMove(e)"), false);
    assert.equal(gallery.includes("cursor: showZoom"), false);
    assert.equal(/^(?!\/\/).*Hover to zoom/m.test(gallery), false);
  });

  it("renders the variant table with SKU, USD price, and real stock", () => {
    assert.match(physical, /Variant/);
    assert.match(physical, /SKU/);
    assert.match(physical, /formatMoney\(v\.price/);
    assert.match(physical, /"USD"\)/);
    assert.match(physical, /resolveStockStatus\(/);
    assert.equal(physical.includes("RWF"), false);
    assert.equal(physical.includes("Not available"), true);
  });

  it("does not hide available quantity on marketplace stock labels", () => {
    const client = read("components/marketplace/product-card-client.tsx");
    const physicalCard = read("components/marketplace/product-card-physical.tsx");
    assert.equal(physical.includes("shouldHideStockQuantity"), false);
    assert.equal(shared.includes("shouldHideStockQuantity"), false);
    assert.equal(client.includes("shouldHideStockQuantity"), false);
    assert.equal(physicalCard.includes("shouldHideStockQuantity"), false);
  });
});

describe("related product cards", () => {
  const shared = read("components/marketplace/product-detail-shared.tsx");
  const related = shared.slice(shared.indexOf("export function RelatedProducts"));

  it("drops the dropship badge and uses an orange view action", () => {
    assert.equal(related.includes("Dropship"), false);
    assert.equal(related.includes("DROPSHIP"), false);
    assert.equal(related.includes("View product"), true);
    assert.equal(related.includes("bg-[var(--color-accent)]"), true);
    assert.equal(related.includes('formatMoney(Number(rp.price), rp.currency, "USD")'), true);
    assert.equal(related.includes("StockStatusBadge"), true);
  });
});

describe("product share dialog", () => {
  const share = read("components/marketplace/product-share-dialog.tsx");
  const bar = read("components/marketplace/product-detail-shared.tsx");

  it("offers exactly two share choices and the real affiliate flow", () => {
    assert.equal(share.includes("Share product"), true);
    assert.equal(share.includes("Share & earn"), true);
    assert.equal(share.includes("/api/affiliates/links"), true);
    assert.equal(share.includes("estimateAffiliateCommissionUsd"), true);
    assert.equal(share.includes("Link copied"), true);
    assert.equal(share.includes("/login?next="), true);
    assert.equal(share.includes("/activate/affiliate"), true);
    assert.equal(bar.includes("ProductShareDialog"), true);
  });

  it("builds the canonical marketplace product URL", () => {
    assert.equal(
      buildCanonicalProductUrl("https://www.jimvio.com", "pearl-necklace"),
      "https://www.jimvio.com/marketplace/pearl-necklace",
    );
  });
});

describe("customer stock and shipping money", () => {
  it("shows a quantity only when stock is low", () => {
    const plenty = resolveStockStatus({ inventory_quantity: 1073, track_inventory: true });
    assert.equal(plenty.label, "In stock");
    assert.equal(plenty.showQuantity, false);
    const low = resolveStockStatus({
      inventory_quantity: 4,
      track_inventory: true,
      low_stock_threshold: 5,
    });
    assert.equal(low.label, "Only 4 left");
    const empty = resolveStockStatus({ inventory_quantity: 0, track_inventory: true });
    assert.equal(empty.label, "Out of stock");
  });

  it("formats shipping fees in USD without rewriting the source currency code into the label", () => {
    assert.equal(formatCustomerShippingCost(18700, "RWF", false).includes("RWF"), false);
    assert.match(formatCustomerShippingCost(18700, "RWF", false), /^\$/);
    assert.equal(formatMoneyAsUSD(14.96, "USD"), formatCustomerShippingCost(14.96, "USD", false));
    assert.equal(formatCustomerShippingCost(12, "USD", true), "Free");
    assert.equal(formatCustomerShippingCost(null, "USD", false), "Calculated at checkout");
  });
});
