import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { categoryFor } from "./category.ts";
import { engagementModel, evidenceScore, linkModel, mediaModel, productModel, reportCategory, type CheckRow } from "./result-model.ts";
import { reportHtml } from "./report-doc.ts";
import { readVideoMeta, iso6709 } from "./video-meta.ts";
import { pdfMeta, pdfText } from "./file-inspect.ts";
import type { CheckerResult, EngagementDetails, LinkDetails, MediaDetails, ProductDetails, ScanReport } from "./types.ts";

const checker = (id: CheckerResult["id"], over: Partial<CheckerResult> = {}): CheckerResult => ({
  id, status: "low_risk", summary: "", findings: [], metrics: [], sources: [], limits: [], nextSteps: [], ...over,
});

const link = (over: Partial<LinkDetails> = {}): LinkDetails => ({
  kind: "links", submittedUrl: "https://example.com/", finalUrl: "https://example.com/", domain: "example.com", registeredAt: "2015-01-02T00:00:00Z",
  ageDays: 4000, registrar: "Example Registrar", ip: "93.184.215.14", httpStatus: 200, contentType: "text/html", pageFetched: true, redirects: [],
  tls: { status: "valid", issuer: "DigiCert", validTo: null, daysLeft: 90 }, webRisk: { status: "clean", threats: [] },
  phishingList: { status: "clean", match: null }, officialPlatform: null, ...over,
});

const engagement = (over: Partial<EngagementDetails> = {}): EngagementDetails => ({
  kind: "engagement", platform: "tiktok", contentType: "video", url: "https://www.tiktok.com/@a/video/1", found: true, title: null, caption: "Sunset",
  authorName: "A", authorHandle: "@a", authorUrl: "https://www.tiktok.com/@a", thumbnailUrl: null, publishedAt: null, durationSec: null, views: null,
  likes: null, comments: null, engagementRate: null,
  account: { createdAt: null, followers: null, followersHidden: false, totalViews: null, totalLikes: null, posts: null, country: null, verified: null, visibility: "public" },
  visibility: null, verdict: null, commentsRead: 0, accessNote: "TikTok only shares numbers with the owner.", ...over,
});

const media = (over: Partial<MediaDetails> = {}): MediaDetails => ({
  kind: "media", mediaType: "image", fileName: "photo.jpg", size: 5_372_416, format: "JPEG image", mime: "image/jpeg", width: 3840, height: 2560,
  durationSec: null, frameRate: null, videoCodec: null, audioCodec: null, bitrate: null, colorSpace: "srgb", iccProfile: null, exifPresent: false,
  make: null, model: null, lens: null, fNumber: null, exposureTime: null, iso: null, focalLength: null, capturedAt: null, gps: null, software: null,
  editingSoftware: null, c2pa: { present: false, generator: null, aiAction: false }, declaredAi: [], aiTools: [], prompt: null, copyright: null,
  artist: null, duplicate: { count: 0, near: false, firstSeenAt: null }, ...over,
});

const product = (over: Partial<ProductDetails> = {}): ProductDetails => ({
  kind: "product", fileName: "guide.pdf", size: 3_800_000, format: "PDF document", mime: "application/pdf", productType: "document",
  productTypeBasis: "PDF without book markers", title: null, author: null, subject: null, createdAt: null, modifiedAt: null, pages: 12,
  producer: null, creator: null, textReadable: false, wordCount: null, copyrightNotice: null, license: null, aiToolInMetadata: null,
  seenBefore: 0, marketplaceDuplicates: [], sellerPage: null, ...over,
});

describe("one check, one result page", () => {
  it("routes by real file type first, then by link platform", () => {
    assert.equal(categoryFor({ fileKind: "image", social: true }), "media");
    assert.equal(categoryFor({ fileKind: "video", social: false }), "media");
    assert.equal(categoryFor({ fileKind: "pdf", social: false }), "product");
    assert.equal(categoryFor({ fileKind: "ebook", social: false }), "product");
    assert.equal(categoryFor({ fileKind: "unknown", social: false }), "unsupported");
    assert.equal(categoryFor({ fileKind: null, social: true }), "engagement");
    assert.equal(categoryFor({ fileKind: null, social: false }), "links");
    assert.equal(categoryFor({ fileKind: null, social: false, servedKind: "pdf" }), "product");
    assert.equal(categoryFor({ fileKind: null, social: false, servedKind: "image" }), "media");
  });
  it("opens the right page for reports saved before categories existed", () => {
    const base = { id: "x", createdAt: "", status: "complete", overall: { level: "low_risk", headline: "" }, durationMs: 1 } as const;
    const off = (id: CheckerResult["id"]) => checker(id, { status: "not_applicable" });
    const r = (url: string | null, file: boolean, checkers: CheckerResult[]): ScanReport => ({ ...base, input: { url, file: file ? { name: "a", size: 1, type: "x", sha256: "" } : null }, checkers });
    assert.equal(reportCategory(r("https://youtu.be/abc", false, [checker("links"), checker("engagement")])), "engagement");
    assert.equal(reportCategory(r("https://shop.example/", false, [checker("links"), off("media")])), "links");
    assert.equal(reportCategory(r(null, true, [off("links"), checker("media")])), "media");
    assert.equal(reportCategory(r(null, true, [off("links"), checker("product"), off("media")])), "product");
  });
});

describe("scores only from completed checks", () => {
  it("leaves out checks that didn't run and refuses to score too little evidence", () => {
    const row = (points: CheckRow["points"]): CheckRow => ({ key: "k", title: "", description: "", pill: { label: "", tone: "good" }, evidence: [], points });
    assert.equal(evidenceScore([row(1), row(null), row(null)]), null);
    assert.equal(evidenceScore([row(1), row(1), row(0), row(null)]), 67);
  });
});

describe("scam & malicious link page", () => {
  it("never invents hosting data and never scores a scan where nothing ran", () => {
    const m = linkModel(checker("links", { status: "inconclusive" }), link({ pageFetched: false, ip: null, httpStatus: null, tls: { status: "unavailable", issuer: null, validTo: null, daysLeft: null }, webRisk: { status: "unavailable", threats: [] }, phishingList: { status: "unavailable", match: null }, ageDays: null }), "https://x.test/", "2026-11-05T10:00:00Z");
    assert.equal(m.risk.value, null);
    assert.equal(m.state, "SCAN_FAILED");
    assert.equal(m.banner.title, "Security Scan Could Not Be Completed");
    assert.equal(m.info.find((r) => r.key === "host")!.value, null);
    assert.equal(m.info.find((r) => r.key === "location")!.value, null);
    assert.equal(m.checks.find((r) => r.key === "blocklist")!.pill.label, "Unavailable");
    assert.notEqual(m.checks.find((r) => r.key === "tls")!.pill.label, "Clean");
  });
  it("puts a confirmed listing at the top of the risk scale", () => {
    const m = linkModel(checker("links", { status: "known_threat", findings: [{ tone: "bad", title: "On a known phishing list", source: "Phishing.Database" }] }), link({ phishingList: { status: "match", match: "evil.test" } }), "https://evil.test/", "");
    assert.ok((m.risk.value ?? 0) >= 90);
    assert.equal(m.banner.title, "Potential Security Threat Detected");
    assert.equal(m.tiles.find((t) => t.key === "threats")!.value, "2");
  });
});

describe("engagement page adapts to the platform", () => {
  it("shows TikTok fields on TikTok and never estimates real or bot views", () => {
    const m = engagementModel(checker("engagement", { status: "unavailable" }), engagement());
    assert.equal(m.accountTitle, "TikTok Account Information");
    assert.equal(m.itemLabel, "TikTok Post");
    assert.ok(!JSON.stringify(m).includes("YouTube"));
    assert.equal(m.tiles.find((t) => t.key === "real")!.value, null);
    assert.equal(m.tiles.find((t) => t.key === "bot")!.value, null);
    assert.equal(m.tiles.find((t) => t.key === "views")!.value, null);
    assert.equal(m.audience[0].pill.label, "Unable to Verify");
  });
  it("labels Instagram reels and YouTube channels correctly", () => {
    const ig = engagementModel(checker("engagement"), engagement({ platform: "instagram", contentType: "reel", url: "https://www.instagram.com/reel/x/" }));
    assert.equal(ig.itemLabel, "Instagram Reel");
    assert.equal(ig.accountTitle, "Instagram Account Information");
    assert.equal(ig.tiles.find((t) => t.key === "posts")!.label, "Reels");
    const yt = engagementModel(checker("engagement"), engagement({ platform: "youtube", contentType: "video", title: "Song", views: 1000, likes: 50, comments: 2, engagementRate: 0.052, verdict: "real", account: { createdAt: "2021-03-28T00:00:00Z", followers: 34700, followersHidden: false, totalViews: 11298630, totalLikes: null, posts: 627, country: null, verified: null, visibility: "public" } }));
    assert.equal(yt.accountTitle, "Channel Information");
    assert.equal(yt.heading, "Song");
    assert.equal(yt.tiles.find((t) => t.key === "views")!.value, "1,000");
    assert.equal(yt.tiles.find((t) => t.key === "rate")!.value, "5.20%");
    assert.equal(yt.audience[0].pill.label, "Mostly Real");
  });
});

describe("digital product page", () => {
  it("doesn't invent an author or date and doesn't score unreadable files", () => {
    const m = productModel(checker("product"), product());
    assert.equal(m.author, null);
    assert.equal(m.info.find((r) => r.key === "author")!.value, "Not stated");
    assert.equal(m.date, null);
    assert.equal(m.score.value, null);
    assert.equal(m.checks.find((r) => r.key === "ai")!.pill.label, "Not Assessed");
    assert.ok(!m.tiles.some((t) => /rating|download/i.test(t.label)));
  });
  it("names an AI writing tool only when the file says so, and recognises books", () => {
    const m = productModel(checker("product"), product({ productType: "book", title: "The Playbook", author: "John Carter", createdAt: "2024-03-15T00:00:00Z", textReadable: true, wordCount: 30000, aiToolInMetadata: "ChatGPT", license: "all_rights_reserved" }));
    assert.equal(m.typeLabel, "Text-Based Book (PDF)");
    assert.equal(m.checks.find((r) => r.key === "software")!.pill.label, "AI Tool Named");
    assert.equal(m.date, "Mar 15, 2024");
    assert.equal(m.info.find((r) => r.key === "tool")!.label, "Creator Application");
  });
});

describe("media page", () => {
  it("calls AI only from AI evidence and doesn't penalise AI creation", () => {
    const m = mediaModel(checker("media"), media({ aiTools: ["Midjourney"], declaredAi: ["IPTC says the image was made by a trained AI model"] }));
    assert.equal(m.banner.title, "AI-Generated Image (Declared)");
    assert.ok((m.score.value ?? 0) >= 45);
    assert.equal(m.tiles.find((t) => t.key === "tool")!.value, "Midjourney");
  });
  it("doesn't score camera metadata alone and doesn't call a bare file AI", () => {
    const cam = mediaModel(checker("media"), media({ exifPresent: true, make: "NIKON CORPORATION", model: "NIKON D850", fNumber: 8, exposureTime: 0.004, iso: 100 }));
    assert.equal(cam.score.value, null);
    assert.equal(cam.banner.result.label, "Camera Indicated");
    assert.equal(cam.technical.find((r) => r.key === "shutter")!.value, "1/250 s");
    const bare = mediaModel(checker("media"), media());
    assert.equal(bare.banner.result.label, "Origin Unknown");
    assert.equal(bare.checks.find((r) => r.key === "ai")!.pill.label, "No AI Markers Found");
  });
  it("uses video fields for video and no camera-lens fields", () => {
    const v = mediaModel(checker("media"), media({ mediaType: "video", fileName: "clip.mp4", format: "MP4 video", mime: "video/mp4", width: 1920, height: 1080, durationSec: 156, frameRate: 30, videoCodec: "H.264 (AVC)", audioCodec: "AAC", bitrate: 18_500_000 }));
    assert.equal(v.technicalTitle, "Technical Metadata (Container)");
    assert.ok(!v.technical.some((r) => /lens|aperture|shutter|iso/i.test(r.label)));
    assert.equal(v.technical.find((r) => r.key === "res")!.value, "1920 × 1080 (Full HD)");
    assert.equal(v.technical.find((r) => r.key === "duration")!.value, "2:36 (156 seconds)");
  });
});

describe("file readers", () => {
  it("reads PDF info strings, including UTF-16, and ISO 6709 GPS", () => {
    const pdf = Buffer.from("%PDF-1.7\n<< /Title (Project Proposal Template) /Author <FEFF004A0061006E0065> /CreationDate (D:20230610120000Z) >>\n<< /Type /Page >>");
    const meta = pdfMeta(pdf);
    assert.equal(meta.title, "Project Proposal Template");
    assert.equal(meta.author, "Jane");
    assert.equal(meta.createdAt, "2023-06-10T12:00:00.000Z");
    assert.deepEqual(iso6709("+46.8182+008.2275+1234/"), { lat: 46.8182, lon: 8.2275 });
    assert.equal(readVideoMeta(Buffer.from("not a video")), null);
  });
  it("follows indirect PDF info values and reads hex text (PDFKit style)", () => {
    const { deflateSync } = require("node:zlib") as typeof import("node:zlib");
    const content = deflateSync(Buffer.from("BT /F1 12 Tf [<4953424e2031> 60 <204368617074657220> 0] TJ ET"));
    const pdf = Buffer.concat([
      Buffer.from("%PDF-1.3\n12 0 obj\n(D:20240315000000Z)\nendobj\n13 0 obj\n(The Productivity Playbook)\nendobj\n14 0 obj\n(John Carter)\nendobj\n"),
      Buffer.from(`5 0 obj\n<< /Length ${content.length} /Filter /FlateDecode >>\nstream\n`), content, Buffer.from("\nendstream\nendobj\n"),
      Buffer.from("8 0 obj\n<< /Producer (PDFKit) /CreationDate 12 0 R /Title 13 0 R /Author 14 0 R >>\nendobj\n"),
    ]);
    const meta = pdfMeta(pdf);
    assert.equal(meta.title, "The Productivity Playbook");
    assert.equal(meta.author, "John Carter");
    assert.equal(meta.createdAt, "2024-03-15T00:00:00.000Z");
    assert.equal(pdfText(pdf)?.startsWith("ISBN 1 Chapter"), true);
  });
  it("escapes report content", () => {
    const html = reportHtml({ scanId: "abc", category: "X", item: "<script>", checkedAt: "", banner: { tone: "good", title: "T", text: "t", result: { label: "L", tone: "good" } }, score: null, sections: [], limits: [] });
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });
});

describe("tileCount (engagement tiles stay one row on desktop)", async () => {
  const { tileCount } = await import("./result-model.ts");
  it("keeps exact counts below 100 million and compacts above, keeping the exact figure", () => {
    assert.deepEqual(tileCount(9_019), { value: "9,019", exact: null });
    assert.deepEqual(tileCount(99_999_999), { value: "99,999,999", exact: null });
    assert.deepEqual(tileCount(250_000_000), { value: "250M", exact: "Exact: 250,000,000." });
    assert.deepEqual(tileCount(1_834_122_026), { value: "1.83B", exact: "Exact: 1,834,122,026." });
    assert.deepEqual(tileCount(2_000_000_000), { value: "2B", exact: "Exact: 2,000,000,000." });
    assert.deepEqual(tileCount(null), { value: null, exact: null });
  });
});

describe("rejected links (no scan ran)", () => {
  it("say why the link was rejected and never claim every check completed", () => {
    const c = { id: "links" as const, status: "inconclusive" as const, summary: "Links with a username or password inside can't be checked.", findings: [], metrics: [], sources: [], limits: [], nextSteps: ["Paste the full link, starting with https://"] };
    const m = linkModel(c, null, "https://user:pass@example.com/", new Date().toISOString());
    assert.equal(m.banner.title, "This Link Can't Be Checked");
    assert.equal(m.banner.text, c.summary);
    assert.equal(m.risk.value, null);
    assert.equal(m.sections.found.length, 0);
    assert.equal(m.sections.couldNotVerify.length, 1);
    assert.match(m.sections.couldNotVerify[0].text, /Nothing was checked/);
    assert.deepEqual(m.sections.actions, ["Paste the full link, starting with https://"]);
    assert.ok(!JSON.stringify(m).includes("technical problem"));
  });
});

describe("downloaded report keeps exact counts behind compact tiles", async () => {
  const { rowsFromTiles } = await import("./report-doc.ts");
  it("adds the exact figure from the tile hint, and leaves ordinary tiles alone", () => {
    assert.deepEqual(rowsFromTiles([
      { key: "views", label: "Total Views", value: "1.83B", hint: "Exact: 1,834,122,026." },
      { key: "likes", label: "Likes", value: "9,019", hint: "Reported by the platform." },
      { key: "x", label: "Comments", value: null },
    ]), [
      { label: "Total Views", value: "1.83B (1,834,122,026)" },
      { label: "Likes", value: "9,019" },
      { label: "Comments", value: "Not Available" },
    ]);
  });
});
