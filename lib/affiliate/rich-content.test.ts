import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  affiliateContentNeedsDisclosure,
  affiliatePlainText,
  deriveAffiliateBenefits,
  extractSafeDescriptionImages,
  prepareAffiliateRichHtml,
} from "./rich-content";

const CJ_SAMPLE = `<p><b>Product information</b><br/>Lining material: imitation leather<br/>Color: Black<br/>Heel height: mid heel (3-5CM)<br/><br/><br/><br/>Packing list: Boots*1pairs&nbsp;</p><p><b>Product Image: </b><img src="https://cf.cjdropshipping.com/quick/product/one.jpg"><img src="https://cf.cjdropshipping.com/quick/product/two.jpg"><img src="https://cf.cjdropshipping.com/quick/product/one.jpg"></p>`;

describe("affiliate rich content", () => {
  it("renders plain text as paragraphs", () => {
    const html = prepareAffiliateRichHtml("Soft leather boots.\n\nReady to wear.");
    assert.match(html, /<p>Soft leather boots\.<\/p>/);
    assert.match(html, /Ready to wear/);
    assert.equal(affiliatePlainText("Soft leather boots."), "Soft leather boots.");
    assert.equal(affiliateContentNeedsDisclosure("Short copy"), false);
  });

  it("keeps paragraphs and bold text", () => {
    const html = prepareAffiliateRichHtml("<p><b>Overview:</b><br>Soft leather upper.</p>");
    assert.match(html, /<b>Overview:<\/b>/);
    assert.match(html, /Soft leather upper/);
    assert.doesNotMatch(html, /&lt;b&gt;/);
    const plain = affiliatePlainText("<p><b>Overview:</b><br>Soft leather upper.</p>");
    assert.match(plain, /Overview:/);
    assert.match(plain, /Soft leather upper/);
  });

  it("drops embedded gallery images and repeated image tags", () => {
    const html = prepareAffiliateRichHtml(CJ_SAMPLE);
    assert.doesNotMatch(html, /<img/i);
    assert.doesNotMatch(html, /cjdropshipping\.com/);
    assert.doesNotMatch(html, /Product Image/i);
    assert.match(html, /imitation leather/);
    assert.deepEqual(extractSafeDescriptionImages(CJ_SAMPLE), [
      "https://cf.cjdropshipping.com/quick/product/one.jpg",
      "https://cf.cjdropshipping.com/quick/product/two.jpg",
    ]);
  });

  it("decodes escaped HTML and entities once", () => {
    const escaped = "&lt;p&gt;&lt;b&gt;Overview:&lt;/b&gt; Hello&amp;nbsp;world&lt;br&gt;&lt;br&gt;&lt;br&gt;&lt;br&gt;Next&lt;/p&gt;";
    const html = prepareAffiliateRichHtml(escaped);
    const plain = affiliatePlainText(escaped);
    assert.match(html, /<b>Overview:<\/b>/);
    assert.doesNotMatch(html, /&lt;p&gt;/);
    assert.doesNotMatch(html, /(?:<br>\s*){3,}/i);
    assert.match(plain, /Hello\s+world/);
    assert.match(plain, /Next/);
    const doubled = prepareAffiliateRichHtml("&amp;lt;p&amp;gt;Hidden&amp;lt;/p&amp;gt;");
    assert.doesNotMatch(doubled, /<p>Hidden<\/p>/);
  });

  it("keeps readable text from malformed markup", () => {
    const html = prepareAffiliateRichHtml("<<<b>Ready</b><iframe src=\"https://evil.test\"></iframe>");
    assert.match(html, /Ready/);
    assert.doesNotMatch(html, /iframe/i);
    assert.doesNotMatch(html, /evil\.test/);
  });

  it("returns nothing for an empty description", () => {
    assert.equal(prepareAffiliateRichHtml("  "), "");
    assert.equal(prepareAffiliateRichHtml(null), "");
    assert.deepEqual(deriveAffiliateBenefits("", []), []);
    assert.equal(affiliateContentNeedsDisclosure(""), false);
  });

  it("strips scripts, handlers, and unsafe urls", () => {
    const html = prepareAffiliateRichHtml(
      `<p onclick="alert(1)" onmouseover='alert(2)'>Safe text</p><script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(1)"><a href="javascript:alert(1)">click</a>`,
    );
    assert.match(html, /Safe text/);
    assert.match(html, /click/);
    assert.doesNotMatch(html, /script|onclick|onmouseover|onerror|javascript:|alert\(/i);
    assert.equal(extractSafeDescriptionImages(`<img src="javascript:alert(1)">`).length, 0);
    assert.equal(extractSafeDescriptionImages(`<img src="https://cdn.example.com/photo.svg">`).length, 0);
  });

  it("derives benefit lines without raw markup and expands only long copy", () => {
    const benefits = deriveAffiliateBenefits(CJ_SAMPLE, []);
    assert.ok(benefits.length >= 2);
    assert.ok(benefits.every((line) => !/[<>]/.test(line) && !/cjdropshipping/i.test(line)));
    assert.match(benefits.join("\n"), /imitation leather/);
    const long = `${affiliatePlainText(CJ_SAMPLE)}\n${"Spec line with enough detail to disclose. ".repeat(12)}`;
    assert.equal(affiliateContentNeedsDisclosure(long), true);
    assert.equal(affiliateContentNeedsDisclosure("Color: Black"), false);
  });
});
