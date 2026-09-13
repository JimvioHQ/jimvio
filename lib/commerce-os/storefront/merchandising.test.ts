import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { productsOnSale } from "./sale-products.ts";
import { storefrontCartItemCount } from "./cart-count.ts";
import { splitHeadlineAccent } from "./headline.ts";
import { categoryNavTiles, sliceCollectionsForSection } from "./collection-slice.ts";
import {
  announcementMessages,
  mergeStorefrontHeaderNav,
  storefrontNavIsActive,
  trustStripItems,
} from "./header-nav.ts";
import {
  mobileNavOffsetVar,
  relatedStoreProducts,
  shouldRenderCategorySection,
  storefrontLetterMark,
} from "./related-products.ts";
import {
  storefrontDesktopNavClass,
  storefrontMobileNavClass,
  storefrontShowHeaderMenu,
} from "./chrome.ts";

describe("storefront merchandising helpers", () => {
  it("keeps only products with a valid compare-at discount", () => {
    const list = productsOnSale([
      { id: "a", price: 40, compare_at_price: 80 },
      { id: "b", price: 20, compare_at_price: 20 },
      { id: "c", price: 15, compare_at_price: null },
    ]);
    assert.deepEqual(list.map((p) => p.id), ["a"]);
  });

  it("counts store cart quantity without inventing items", () => {
    assert.equal(storefrontCartItemCount([]), 0);
    assert.equal(
      storefrontCartItemCount([{ quantity: 2 }, { quantity: "3" }, { quantity: 0 }]),
      5
    );
  });

  it("splits a merchant-provided headline accent", () => {
    const split = splitHeadlineAccent(
      "Quality Products for a Better You",
      "for a Better You"
    );
    assert.equal(split.lead, "Quality Products");
    assert.equal(split.accent, "for a Better You");
    assert.equal(splitHeadlineAccent("Hello", "").accent, null);
  });

  it("builds category tiles with an All shortcut plus published collections", () => {
    const tiles = categoryNavTiles([
      { id: "c1", title: "Fashion", handle: "fashion", image_url: null },
    ]);
    assert.equal(tiles[0]?.handle, "all");
    assert.equal(tiles[1]?.title, "Fashion");
  });

  it("orders collections by merchant-selected ids", () => {
    const out = sliceCollectionsForSection(
      [
        { id: "a", title: "A", handle: "a" },
        { id: "b", title: "B", handle: "b" },
        { id: "c", title: "C", handle: "c" },
      ],
      { collectionIds: ["c", "a"], limit: 8 }
    );
    assert.deepEqual(out.map((c) => c.id), ["c", "a"]);
  });

  it("hides empty collection sections and keeps related products in-store", () => {
    assert.equal(shouldRenderCategorySection([]), false);
    assert.equal(shouldRenderCategorySection([{ id: "1", handle: "hats" }]), true);
    assert.deepEqual(
      relatedStoreProducts([{ id: "a" }, { id: "b" }, { id: "c" }], "b", 8).map((p) => p.id),
      ["a", "c"]
    );
  });

  it("merges header nav from real collections, sales, and about only", () => {
    const bare = mergeStorefrontHeaderNav({
      saved: [
        { label: "Home", href: "/" },
        { label: "All products", href: "/collections/all" },
      ],
      collections: [],
      hasSaleProducts: false,
      hasAbout: false,
    });
    assert.deepEqual(bare.map((i) => i.label), ["Home", "All products"]);

    const rich = mergeStorefrontHeaderNav({
      saved: bare,
      collections: [{ title: "Hats", handle: "hats" }],
      hasSaleProducts: true,
      hasAbout: true,
    });
    assert.ok(rich.some((i) => i.label === "Hats" && i.href === "/collections/hats"));
    assert.ok(rich.some((i) => i.label === "Deals" && i.href.includes("sort=sale")));
    assert.ok(rich.some((i) => i.label === "About"));
  });

  it("does not invent announcement asides or trust claims", () => {
    assert.deepEqual(announcementMessages("", "Acme"), ["Welcome to Acme"]);
    assert.ok(!announcementMessages("Spring drop", "Acme").includes("Shop with confidence"));
    assert.deepEqual(trustStripItems(""), []);
    assert.deepEqual(trustStripItems("Easy returns · Store pickup"), [
      "Easy returns",
      "Store pickup",
    ]);
  });

  it("matches active nav paths without leaking across routes", () => {
    assert.equal(
      storefrontNavIsActive({
        pathname: "/s/acme",
        href: "/",
        handle: "acme",
      }),
      true
    );
    assert.equal(
      storefrontNavIsActive({
        pathname: "/s/acme/collections/all",
        href: "/collections/all",
        handle: "acme",
      }),
      true
    );
    assert.equal(
      storefrontNavIsActive({
        pathname: "/s/acme/collections/all",
        href: "/collections/all?sort=sale",
        handle: "acme",
        search: "sort=sale",
      }),
      true
    );
    assert.equal(
      storefrontNavIsActive({
        pathname: "/s/acme/collections/all",
        href: "/collections/all?sort=sale",
        handle: "acme",
      }),
      false
    );
    assert.equal(
      storefrontNavIsActive({
        pathname: "/s/acme/product/hat",
        href: "/collections/all",
        handle: "acme",
      }),
      false
    );
  });

  it("uses a letter-mark fallback and offsets sticky ATC for bottom nav", () => {
    assert.equal(storefrontLetterMark("P7 PROVIDER STORE"), "P");
    assert.equal(storefrontLetterMark("  "), "S");
    assert.equal(mobileNavOffsetVar("bottom"), "3.5rem");
    assert.equal(mobileNavOffsetVar("hidden"), "0px");
  });

  it("shows desktop nav only on desktop and mobile nav only on mobile", () => {
    assert.equal(storefrontDesktopNavClass(), "hidden lg:flex");
    assert.equal(storefrontDesktopNavClass("desktop"), "flex");
    assert.equal(storefrontDesktopNavClass("mobile"), "hidden");
    assert.match(storefrontMobileNavClass(), /lg:hidden/);
    assert.match(storefrontMobileNavClass("mobile"), /sticky/);
    assert.equal(storefrontMobileNavClass("desktop"), "hidden");
    assert.equal(storefrontMobileNavClass("mobile", "hidden"), "hidden");
    assert.equal(storefrontShowHeaderMenu(undefined, "bottom"), false);
    assert.equal(storefrontShowHeaderMenu(undefined, "drawer"), true);
    assert.equal(storefrontShowHeaderMenu("mobile", "bottom"), false);
    assert.equal(storefrontShowHeaderMenu("mobile", "drawer"), true);
    assert.equal(storefrontShowHeaderMenu("desktop", "drawer"), false);
  });
});
