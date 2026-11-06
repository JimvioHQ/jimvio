import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { strToU8, zipSync } from "fflate";
import { epubMeta, epubText, extractText, sniffType } from "./file-inspect.ts";

const epub = (opf: string, chapters: Record<string, string>) =>
  Buffer.from(
    zipSync({
      mimetype: [strToU8("application/epub+zip"), { level: 0 }],
      "META-INF/container.xml": strToU8('<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'),
      "OEBPS/content.opf": strToU8(opf),
      ...Object.fromEntries(Object.entries(chapters).map(([k, v]) => [`OEBPS/${k}`, strToU8(v)])),
    }),
  );
const OPF = `<package xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>The Adventures of Sherlock Holmes</dc:title><dc:creator opf:role="aut">Arthur Conan Doyle</dc:creator><dc:rights>Public domain in the USA.</dc:rights><meta property="dcterms:modified">2026-11-01T00:00:00Z</meta><meta name="generator" content="Calibre 7.1"/></metadata>
<manifest><item id="c2" href="ch%202.xhtml" media-type="application/xhtml+xml"/><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/><item id="css" href="s.css" media-type="text/css"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>`;
const para = "<p>To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name.</p>";

describe("EPUB reading (product verification)", () => {
  const buf = epub(OPF, { "c1.xhtml": `<html><head><title>Ignored head title</title><style>p{}</style></head><body><h1>A Scandal in Bohemia</h1>${para}</body></html>`, "ch 2.xhtml": `<html><body><h1>The Red-Headed League</h1>${para}</body></html>` });
  it("is recognised as an EPUB e-book", () => assert.equal(sniffType(buf, "book.epub").kind, "ebook"));
  it("reads title, author, rights and generator from the OPF", () => {
    const m = epubMeta(buf)!;
    assert.equal(m.title, "The Adventures of Sherlock Holmes");
    assert.equal(m.author, "Arthur Conan Doyle");
    assert.equal(m.rights, "Public domain in the USA.");
    assert.equal(m.producer, "Calibre 7.1");
    assert.equal(m.modifiedAt, "2026-11-01T00:00:00Z");
  });
  it("reads chapter text in spine order, without <head> or styles, rights first", () => {
    const t = extractText(buf, sniffType(buf, "book.epub"))!;
    assert.equal(t, epubText(buf));
    assert.ok(t.startsWith("Public domain in the USA."));
    assert.ok(t.indexOf("A Scandal in Bohemia") < t.indexOf("The Red-Headed League"));
    assert.ok(!t.includes("Ignored head title") && !t.includes("p{}"));
  });
  it("a broken package yields no metadata or text rather than a guess", () => {
    const broken = Buffer.from(zipSync({ mimetype: [strToU8("application/epub+zip"), { level: 0 }], "x.txt": strToU8("hi") }));
    assert.equal(epubMeta(broken), null);
    assert.equal(epubText(broken), null);
  });
});
