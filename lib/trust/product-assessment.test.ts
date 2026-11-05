import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessProduct, publicDomainAuthor } from "./product-assessment.ts";
import { inspectPdf } from "./pdf-structure.ts";
import type { Finding, ProductDetails } from "./types.ts";

const cleanPdf = (over: Partial<NonNullable<ProductDetails["pdf"]>> = {}): NonNullable<ProductDetails["pdf"]> => ({
  security: { javascript: 0, launch: 0, openActionKind: null, additionalActions: 0, embeddedFiles: 0, uriActions: 9, externalHosts: ["infobooks.org", "infolibros.org"], submitForm: 0, richMedia: 0, xfa: false, encrypted: false, malformedStreams: 0 },
  pages: { total: 640, withText: 638, imageOnly: 1, blank: 1, failed: 0, processed: 640, duplicatePages: 0, coverage: 100, truncated: false },
  outlineChapters: 61, parseError: null, ...over,
});
/** The production regression case (Nov 5 2026). */
const austen = (over: Partial<ProductDetails> = {}): ProductDetails => ({
  kind: "product", fileName: "pride-and-prejudice-jane-austen.pdf", size: 3_458_639, format: "PDF document", mime: "application/pdf", productType: "book",
  productTypeBasis: "bookmarks", title: "Chapter 1", author: "Jane Austen", subject: "Pride and Prejudice, by Jane Austen. Edition verified and typeset by InfoBooks.",
  createdAt: "2026-09-18T00:00:00Z", modifiedAt: null, pages: 640, producer: "Typst 0.15.1", creator: "InfoBooks (infobooks.org)", textReadable: true, wordCount: 121_571,
  copyrightNotice: null, license: null, aiToolInMetadata: null, seenBefore: 2, marketplaceDuplicates: [], sellerPage: null,
  pdf: cleanPdf(), linkCheck: { status: "clean", matches: [] }, claims: { bad: 0, warn: 0 }, similarProducts: [], ...over,
});
const sig: Finding[] = [{ tone: "good", title: "File type matches its name (PDF document)", source: "File signature" }];
const get = (a: ReturnType<typeof assessProduct>, id: string) => a.checks.find((k) => k.id === id)!;

describe("digital product assessment", () => {
  it("Jane Austen regression: clean file, readable, not high risk, honest rights", () => {
    const a = assessProduct({ details: austen(), findings: sig, now: new Date("2026-11-05") });
    assert.equal(a.fileSafety, "CLEAN");
    assert.equal(get(a, "structure").label, "None Found");
    assert.equal(get(a, "antivirus").status, "UNAVAILABLE");
    assert.equal(a.content, "CONTENT_QUALITY_ACCEPTABLE");
    assert.equal(get(a, "extraction").label, "638 of 640 Pages Read");
    assert.equal(a.rights, "PUBLIC_DOMAIN_EVIDENCE_FOUND");
    assert.match(get(a, "publicdomain").explanation, /edition's own/);
    assert.equal(a.authorship, "AUTHORSHIP_METADATA_FOUND");
    assert.match(get(a, "software").explanation, /not evidence of AI/);
    assert.equal(get(a, "duplicate").explanation.startsWith("This exact file has been checked 2 times on Jimvio."), true);
    assert.ok(!/sell|shar/i.test(get(a, "duplicate").label));
    assert.notEqual(a.verdict, "POTENTIAL_RISK_DETECTED");
    assert.equal(a.verdict, "NEEDS_REVIEW");
    assert.ok(a.score != null && a.score >= 50);
  });
  it("unreadable text → rights NOT ASSESSED, never 'no notice found'", () => {
    const a = assessProduct({ details: austen({ textReadable: false, wordCount: null, author: null, pdf: cleanPdf({ pages: { ...cleanPdf().pages, withText: 0, imageOnly: 640, blank: 0 } }) }), findings: sig });
    assert.equal(a.rights, "RIGHTS_NOT_ASSESSED");
    assert.equal(get(a, "copyright").label, "Not Assessed");
    assert.equal(a.content, "CONTENT_NOT_ASSESSED");
    assert.equal(a.verdict, "VERIFICATION_INCOMPLETE");
    assert.equal(a.score, null);
  });
  it("parser failure is a scan problem, never malware", () => {
    const a = assessProduct({ details: austen({ pdf: cleanPdf({ parseError: "bad xref" }) }), findings: sig });
    assert.equal(a.fileSafety, "SCAN_FAILED");
    assert.notEqual(a.verdict, "POTENTIAL_RISK_DETECTED");
  });
  it("real JavaScript stays a serious finding even when other checks fail", () => {
    const a = assessProduct({ details: austen({ textReadable: false, pdf: cleanPdf({ security: { ...cleanPdf().security, javascript: 2 } }) }), findings: sig });
    assert.equal(a.verdict, "POTENTIAL_RISK_DETECTED");
    assert.equal(a.fileSafety, "SUSPICIOUS");
    assert.ok((a.score ?? 0) <= 49);
  });
  it("a licence found → Verified", () => {
    const a = assessProduct({ details: austen({ author: "Jane Doe", license: "commercial" }), findings: sig });
    assert.equal(a.verdict, "VERIFIED");
    assert.ok((a.score ?? 0) >= 80);
  });
  it("public-domain list respects the 100-year rule", () => {
    assert.ok(publicDomainAuthor("Jane Austen"));
    assert.equal(publicDomainAuthor("J. K. Rowling"), null);
  });
});

describe("pdf structure inspection", () => {
  it("finds real JavaScript actions but ignores '/JS' bytes inside compressed data", () => {
    const js = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog /OpenAction 2 0 R >> endobj\n2 0 obj << /S /JavaScript /JS (app.alert(1)) >> endobj\ntrailer << /Root 1 0 R >>");
    const r = inspectPdf(js);
    assert.equal(r.security.javascript, 1);
    assert.equal(r.security.openActionKind, "JavaScript");
    const noise = Buffer.concat([Buffer.from("%PDF-1.4\n1 0 obj << /Length 9 /Filter /FlateDecode >> stream\n"), Buffer.from("x/JS )aaa"), Buffer.from("\nendstream endobj\ntrailer << >>")]);
    assert.equal(inspectPdf(noise).security.javascript, 0);
  });
});
