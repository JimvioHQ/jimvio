import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canConfirmFreshStoreSignup } from "../auth/merchant-store-signup.ts";
import {
  defaultStorePageHtml,
  isPlaceholderStorePageHtml,
  resolveStorePageHtml,
} from "../commerce-os/storefront/page-content.ts";
import { storefrontDetailAvailabilityLabel, storefrontCardStockLine } from "../commerce-os/storefront/availability.ts";
import { resolveStockStatus } from "../marketplace/stock-status.ts";
import { safeTrackingHref } from "../commerce-os/fulfillment/tracking-link.ts";
import { withRequiredPolicyLinks } from "../commerce-os/storefront/policy-links.ts";
import { resolveStorefrontIcons } from "../commerce-os/storefront-metadata.ts";
import { constructMetadata } from "../seo.ts";

describe("store customer registration gate", () => {
  it("confirms only a fresh merchant-store signup that has no session", () => {
    assert.equal(
      canConfirmFreshStoreSignup({
        merchantContext: true,
        hasSession: false,
        duplicateUnconfirmed: false,
        hasUserId: true,
      }),
      true,
    );
  });

  it("does not confirm platform signups, duplicates, or sessions that already exist", () => {
    assert.equal(
      canConfirmFreshStoreSignup({
        merchantContext: false,
        hasSession: false,
        duplicateUnconfirmed: false,
        hasUserId: true,
      }),
      false,
    );
    assert.equal(
      canConfirmFreshStoreSignup({
        merchantContext: true,
        hasSession: true,
        duplicateUnconfirmed: false,
        hasUserId: true,
      }),
      false,
    );
    assert.equal(
      canConfirmFreshStoreSignup({
        merchantContext: true,
        hasSession: false,
        duplicateUnconfirmed: true,
        hasUserId: true,
      }),
      false,
    );
  });

  it("keeps the platform check-your-email path in signUp", () => {
    const src = readFileSync(join(process.cwd(), "lib/auth/actions.ts"), "utf8");
    assert.match(src, /Check your email to confirm your account/);
    assert.match(src, /canConfirmFreshStoreSignup/);
    assert.match(src, /email_confirm: true/);
    assert.equal(src.includes("service_role"), false);
  });
});

describe("store page defaults", () => {
  it("replaces coming-soon seeds and keeps merchant copy", () => {
    const seeded = resolveStorePageHtml({
      handle: "refund-policy",
      storeName: "North Store",
      savedHtml: "<p>Refund details coming soon.</p>",
    });
    assert.equal(seeded.usingDefault, true);
    assert.equal(seeded.html.includes("coming soon"), false);
    assert.match(seeded.html, /North Store/);
    assert.equal(/instant refund/i.test(seeded.html), false);

    const custom = resolveStorePageHtml({
      handle: "refund-policy",
      storeName: "North Store",
      savedHtml: "<p>Returns accepted within the window we publish at checkout.</p>",
    });
    assert.equal(custom.usingDefault, false);
    assert.match(custom.html, /Returns accepted/);
  });

  it("does not invent contact details", () => {
    const html = defaultStorePageHtml("contact", "North Store");
    assert.match(html, /have not been added yet/);
    assert.equal(html.includes("@"), false);
    const withEmail = defaultStorePageHtml("contact", "North Store", {
      email: "help@north.example",
    });
    assert.match(withEmail, /help@north\.example/);
  });

  it("recognizes the original about and contact seeds", () => {
    assert.equal(isPlaceholderStorePageHtml("<p>Welcome to North Store.</p>"), true);
    assert.equal(isPlaceholderStorePageHtml("<p>Contact us for support.</p>"), true);
    assert.equal(isPlaceholderStorePageHtml("<p>Our workshop opened in 2014.</p>"), false);
  });
});

describe("storefront inventory presentation", () => {
  it("hides raw counts on cards and keeps marketplace labels", () => {
    assert.equal(storefrontCardStockLine(), null);
    const detail = storefrontDetailAvailabilityLabel({
      inventory_quantity: 3294541,
      track_inventory: true,
    });
    assert.equal(detail, "In stock");
    assert.equal(detail.includes("3294541"), false);
    assert.equal(
      storefrontDetailAvailabilityLabel({
        inventory_quantity: 0,
        track_inventory: true,
      }),
      "Out of stock",
    );
    const marketplace = resolveStockStatus({
      inventory_quantity: 12,
      track_inventory: true,
    });
    assert.match(marketplace.label, /12/);
  });
});

describe("store favicon priority", () => {
  it("uses favicon, then logo, then a neutral icon", () => {
    assert.equal(
      (resolveStorefrontIcons({
        favicon_url: "https://cdn.example.com/favicon.png",
        logo_url: "https://cdn.example.com/logo.png",
      }) as { shortcut?: string }).shortcut,
      "https://cdn.example.com/favicon.png",
    );
    assert.equal(
      (resolveStorefrontIcons({
        favicon_url: null,
        logo_url: "https://cdn.example.com/logo.png",
      }) as { shortcut?: string }).shortcut,
      "https://cdn.example.com/logo.png",
    );
    const bare = resolveStorefrontIcons({ favicon_url: "  ", logo_url: null }) as {
      shortcut?: string;
    };
    assert.equal(bare.shortcut, "/storefront-empty-favicon.svg");
    const platform = constructMetadata();
    const platformShortcut = (platform.icons as { shortcut?: string }).shortcut;
    assert.match(String(platformShortcut), /^\/favicon\.ico/);
    assert.notEqual(platformShortcut, bare.shortcut);
  });

  it("routes merchant favicon.ico through the store icon resolver", () => {
    const src = readFileSync(join(process.cwd(), "proxy.ts"), "utf8");
    assert.match(src, /\/api\/storefront-favicon\/\$\{subdomainHandle\}/);
    assert.equal(src.includes('url.pathname = "/storefront-empty-favicon.svg"'), false);
  });
});

describe("store tracking links", () => {
  it("allows http(s) links only", () => {
    assert.equal(safeTrackingHref("https://carrier.example/track/1"), "https://carrier.example/track/1");
    assert.equal(safeTrackingHref("javascript:alert(1)"), null);
    assert.equal(safeTrackingHref(""), null);
  });
});

describe("store footer policy links", () => {
  it("adds missing policy links without dropping merchant links", () => {
    const links = withRequiredPolicyLinks(
      [{ label: "Lookbook", href: "/lookbook" }],
      [
        { label: "Refunds", href: "/refund-policy" },
        { label: "About", href: "/about" },
      ],
    );
    assert.deepEqual(
      links.map((link) => link.href),
      ["/lookbook", "/refund-policy", "/about"],
    );
  });
});
