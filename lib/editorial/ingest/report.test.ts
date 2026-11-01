import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { splitHeroCaption } from "@/lib/editorial/caption";
import { sanitizeArticleHtml } from "@/lib/editorial/sanitize";
import { extractArticlePage } from "@/lib/editorial/ingest/page";
import { fetchImage } from "@/lib/editorial/ingest/fetch";
import { evaluateOfficialAsset, officialImageAllowed, selectOfficialImage } from "@/lib/editorial/ingest/images";
import { assessEditorialDraft, uniqueProfileHref, writeGroundedReport, type ReportDraft } from "@/lib/editorial/ingest/report";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");
const PAGE = "https://www.nasa.gov/news-release/crew-exit/";
const PHOTO = "https://www.nasa.gov/wp-content/uploads/2026/10/crew.jpg";

const FACTS = [
  "Four volunteers are scheduled to leave a simulated Mars habitat on Saturday after 378 days.",
  "Coverage of that departure begins at 3 p.m. EDT at Johnson Space Center.",
  "The second analog mission began on Oct. 19, 2025, inside a 1,700-square-foot habitat.",
  "Ross Elder, Matthew Montgomery, Ellen Ellis, and James Spicer have lived and worked there since the mission started.",
  "The study is called the Crew Health and Performance Exploration Analog.",
  "NASA will show the volunteers leaving the habitat.",
  "Reporters can watch from outside the hangar that holds the facility.",
  "A center director and an astronaut are scheduled to speak.",
  "The announcement is a media advisory about the crew exit.",
  "It describes the viewing location and the people who will make remarks.",
  "The habitat exit is the event reporters were invited to attend.",
  "The advisory names the hangar as the place where the departure can be seen.",
].join(" ");

function pageHtml() {
  return `<!doctype html><html><head>
    <meta property="og:image" content="${PHOTO}">
    <title>Ignored title</title>
    </head><body>
    <nav><p>Explore Search News and Events across the public website today.</p></nav>
    <article>
      <h1>NASA Invites Media to Crew Completion of Yearlong Mars Simulation</h1>
      <h2>Share</h2>
      <p><a href="https://gcc02.safelinks.protection.outlook.com/wrapped?url=https%3A%2F%2Fwww.youtube.com%2Freelnasa">YouTube</a></p>
      <figure><img src="${PHOTO}" alt="Crew portrait"><figcaption>Ross Elder, Matthew Montgomery, Ellen Ellis, and James Spicer pose before their habitat exit. Credit: NASA</figcaption></figure>
      <img src="https://www.nasa.gov/wp-content/themes/nasa/assets/images/nasa-logo.png" alt="">
      <p>${FACTS}</p>
      <p><a href="${PAGE}">NASA</a> published the advisory. <a href="javascript:alert(1)">Ignore</a></p>
    </article></body></html>`;
}

// Synthetic supporting text is confined to tests; production dossiers use fetched evidence only.
function withResearchContext(page: NonNullable<ReturnType<typeof extractArticlePage>>) {
  const additionalEvidence = Array.from(
    { length: 320 },
    (_, index) => `Verified supporting record ${index} documents habitat operations, mission planning, crew scheduling, research protocols, safety procedures, and public event logistics.`,
  ).join(" ");
  return {
    ...page,
    paragraphs: [...page.paragraphs, additionalEvidence],
    wordCount: page.wordCount + additionalEvidence.split(" ").length,
  };
}

function draft(overrides: Partial<ReportDraft> = {}): ReportDraft {
  return {
    headline: "Yearlong Mars habitat crew prepares to step outside",
    excerpt: "Four volunteers are due to walk out of a simulated Mars habitat after 378 days, and Johnson Space Center will show the departure.",
    sections: [
      {
        heading: "The departure",
        paragraphs: [
          "Ross Elder is one of four volunteers due to leave the simulated habitat after 378 days.",
          "Johnson Space Center will show that departure at 3 p.m. EDT.",
        ],
      },
      {
        heading: "The mission",
        paragraphs: [
          "The analog study started Oct. 19, 2025. Its habitat measures 1,700 square feet.",
          "Reporters can watch outside the hangar while a center director and an astronaut speak.",
        ],
      },
    ],
    links: [{ phrase: "Johnson Space Center", href: PAGE }],
    ...overrides,
  };
}

const jpeg = new Uint8Array(24);
jpeg.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x90, 0x02, 0x80]);

describe("editorial research", () => {
  it("extracts the article and drops navigation, logos, and unsafe links", () => {
    const page = extractArticlePage(pageHtml(), PAGE);
    assert.ok(page);
    assert.match(page?.title ?? "", /Yearlong Mars Simulation/);
    assert.equal(page?.paragraphs.some((paragraph) => /Explore Search/i.test(paragraph)), false);
    assert.equal(page?.links.some((link) => link.href.startsWith("javascript:")), false);
    assert.equal(page?.headings.includes("Share"), false);
    assert.equal(page?.links.some((link) => link.href === "https://www.youtube.com/reelnasa"), true);
    assert.equal(page?.links.some((link) => /safelinks/i.test(link.href)), false);
    assert.equal(page?.links.some((link) => link.href === PAGE), true);
    assert.equal(page?.images.some((image) => image.url === PHOTO), true);
    assert.equal(page?.images.some((image) => /logo/i.test(image.url)), false);
    assert.ok((page?.wordCount ?? 0) >= 80);
    assert.match(page?.captions[0] ?? "", /Credit: NASA/);
  });

  it("rejects a page that is only a headline and a short description", async () => {
    const page = extractArticlePage("<article><h1>Short notice</h1><p>Only a few words here.</p></article>", PAGE);
    assert.equal(page?.wordCount ?? 0, 0);
    const written = await writeGroundedReport({
      sourceName: "NASA News Releases",
      sourceTitle: "Short notice",
      sourceUrl: PAGE,
      page: {
        url: PAGE,
        title: "Short notice",
        paragraphs: ["Only a few words here."],
        headings: [],
        links: [],
        images: [],
        captions: [],
        wordCount: 5,
      },
      complete: async () => "{\"headline\":\"unused\"}",
    });
    assert.equal(written.ok, false);
    if (!written.ok) assert.equal(written.reason, "thin_source");
  });

  it("accepts a grounded article and keeps provenance out of the public prose", async () => {
    const page = extractArticlePage(pageHtml(), PAGE);
    assert.ok(page);
    let requestInput = "";
    const written = await writeGroundedReport({
      sourceName: "NASA News Releases",
      sourceTitle: page?.title ?? "",
      sourceUrl: PAGE,
      page: withResearchContext(page!),
      profiles: [{ name: "Ross Elder", username: "ross_elder" }],
      complete: async (request) => {
        requestInput = request.input;
        return JSON.stringify(draft());
      },
    });
    assert.equal(requestInput, "");
    assert.equal(written.ok, false);
    if (!written.ok) assert.equal(written.issues.includes("insufficient_independent_sources"), true);
  });

  it("rejects invented numbers, copied headlines, and unsafe links", () => {
    const page = extractArticlePage(pageHtml(), PAGE);
    assert.ok(page);
    const research = withResearchContext(page!);
    const corpus = [research.title, ...research.paragraphs, ...research.captions];
    const invented = assessEditorialDraft(draft({
      sections: [{ heading: "The departure", paragraphs: ["The crew count reached 999 people before the exit."] }],
    }), { sourceName: "NASA News Releases", sourceTitle: page!.title, sourceUrl: PAGE, corpusParts: corpus, allowedHrefs: [PAGE] });
    assert.equal(invented.ok, false);
    if (!invented.ok) assert.equal(invented.issues.includes("unsupported_number"), true);

    const prefixed = assessEditorialDraft(draft({ headline: "NASA News Releases public notice on habitat crew exit" }), {
      sourceName: "NASA News Releases",
      sourceTitle: page!.title,
      sourceUrl: PAGE,
      corpusParts: corpus,
      allowedHrefs: [PAGE],
    });
    assert.equal(prefixed.ok, false);
    if (!prefixed.ok) assert.equal(prefixed.issues.includes("publisher_prefix"), true);

    const unsafe = assessEditorialDraft(draft({ links: [{ phrase: "Ross Elder", href: "javascript:alert(1)" }] }), {
      sourceName: "NASA News Releases",
      sourceTitle: page!.title,
      sourceUrl: PAGE,
      corpusParts: corpus,
      allowedHrefs: [PAGE],
    });
    assert.equal(unsafe.ok, false);
    if (!unsafe.ok) assert.equal(unsafe.issues.includes("unsafe_link"), true);

    const shared = {
      sourceName: "NASA News Releases",
      sourceTitle: page!.title,
      sourceUrl: PAGE,
      corpusParts: corpus,
      allowedHrefs: [PAGE],
    };
    const nameless = assessEditorialDraft(draft({
      sections: [
        { heading: "The departure", paragraphs: ["Four volunteers are due to leave the simulated habitat after 378 days."] },
        { heading: "The mission", paragraphs: ["The analog study started Oct. 19, 2025. Its habitat measures 1,700 square feet."] },
      ],
    }), shared);
    assert.equal(nameless.ok, false);
    if (!nameless.ok) assert.equal(nameless.issues.includes("missing_names"), true);

    const inventedName = assessEditorialDraft(draft({
      sections: [
        { heading: "The departure", paragraphs: ["Ross Elder will discuss Artemis after 378 days at Johnson Space Center."] },
        { heading: "The mission", paragraphs: ["Matthew Montgomery joined the analog study on Oct. 19, 2025 inside the 1,700 square foot habitat."] },
      ],
    }), shared);
    assert.equal(inventedName.ok, false);
    if (!inventedName.ok) assert.equal(inventedName.issues.includes("unsupported_name"), true);

    const possessive = assessEditorialDraft(draft({
      sections: [
        { heading: "The departure", paragraphs: ["Ross Elder joined NASA's analog study and will leave after 378 days."] },
        { heading: "The mission", paragraphs: ["Matthew Montgomery has been inside the 1,700 square foot habitat since Oct. 19, 2025."] },
      ],
    }), shared);
    if (!possessive.ok) assert.equal(possessive.issues.includes("unsupported_name"), false);
  });

  it("includes corroborating publisher pages in the research dossier and provenance", async () => {
    const page = extractArticlePage(pageHtml(), PAGE);
    assert.ok(page);
    const secondUrl = "https://www.theguardian.com/world/2026/nov/01/example-report";
    let requestInput = "";
    const written = await writeGroundedReport({
      sourceName: "NASA News Releases",
      sourceTitle: page?.title ?? "",
      sourceUrl: PAGE,
      page: withResearchContext(page!),
      corroboratingPages: [{
        sourceName: "The Guardian World",
        sourceTitle: page?.title ?? "",
        sourceUrl: secondUrl,
        page: { ...withResearchContext(page!), url: secondUrl },
      }],
      complete: async (request) => {
        requestInput = request.input;
        return JSON.stringify(draft());
      },
    });
    const dossier = JSON.parse(requestInput.slice(requestInput.indexOf("{"))) as { sources?: { publisher: string; sourceUrl: string }[] };
    assert.equal(dossier.sources?.length, 2);
    assert.equal(dossier.sources?.[1]?.publisher, "The Guardian World");
    assert.equal(dossier.sources?.[1]?.sourceUrl, secondUrl);
    assert.equal(written.ok, false);
    if (!written.ok) assert.equal(written.issues.includes("insufficient_depth"), true);
  });

  it("links a real profile only when the name is unique", () => {
    assert.equal(uniqueProfileHref("Ross Elder", [
      { name: "Ross Elder", username: "ross_elder" },
      { name: "Ada Lovelace", username: "ada" },
    ]), "/u/ross_elder");
    assert.equal(uniqueProfileHref("Ross Elder", [
      { name: "Ross Elder", username: "ross_elder" },
      { name: "Ross Elder", username: "other_ross" },
    ]), null);
    assert.equal(uniqueProfileHref("Ross Elder", [{ name: "Ross Elder", username: "not a user" }]), null);
    const page = extractArticlePage(pageHtml(), PAGE);
    const research = withResearchContext(page!);
    const corpus = [research.title, ...research.paragraphs, ...research.captions];
    const invented = assessEditorialDraft(draft({ links: [{ phrase: "Ross Elder", href: "/u/made-up" }] }), {
      sourceName: "NASA News Releases",
      sourceTitle: page?.title ?? "",
      sourceUrl: PAGE,
      corpusParts: corpus,
      allowedHrefs: [PAGE],
      profiles: [],
    });
    assert.equal(invented.ok, true);
    if (invented.ok) assert.equal(invented.brief.bodyHtml.includes("/u/made-up"), false);
  });

  it("checks official image bytes, captions, and fallbacks", async () => {
    const page = extractArticlePage(pageHtml(), PAGE);
    assert.ok(page);
    assert.equal(officialImageAllowed(PAGE, "https://www.nasa.gov/favicon.ico"), false);
    assert.equal(officialImageAllowed(PAGE, "https://images.example/photo.jpg"), false);
    const small = new Uint8Array(24);
    small.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x64, 0x00, 0x64]);
    assert.equal(evaluateOfficialAsset({ pageUrl: PAGE, imageUrl: PHOTO, bytes: small, alt: "", caption: "" }).status, "rejected");
    assert.equal(evaluateOfficialAsset({ pageUrl: PAGE, imageUrl: PHOTO, bytes: Uint8Array.from([0x3c, 0x68, 0x74, 0x6d, 0x6c]), alt: "", caption: "" }).status, "rejected");
    const calls: string[] = [];
    const selected = await selectOfficialImage(page!, async (url) => {
      calls.push(String(url));
      return new Response(jpeg, { status: 200, headers: { "content-type": "image/jpeg" } });
    });
    assert.equal(selected.status, "verified");
    assert.equal(selected.url, PHOTO);
    const companyCredit = evaluateOfficialAsset({
      pageUrl: PAGE,
      imageUrl: PHOTO,
      bytes: jpeg,
      alt: "A technician inspects a spacecraft sunshade in a clean room.",
      caption: "BAE Systems Space & Mission Systems",
    });
    assert.equal(companyCredit.status, "rejected");
    assert.match(companyCredit.note, /credit/i);
    const webp = new Uint8Array(32);
    webp.set([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x58, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x7f, 0x02, 0x00, 0x67, 0x01, 0x00,
    ]);
    const webpAsset = evaluateOfficialAsset({
      pageUrl: PAGE,
      imageUrl: PHOTO,
      bytes: webp,
      alt: "",
      caption: "Crew members pose for a photo before the habitat exit. Credit: NASA",
    });
    assert.equal(webpAsset.status, "verified");
    assert.equal(webpAsset.width, 640);
    assert.equal(webpAsset.height, 360);
    assert.equal(selected.license, "US government work");
    assert.match(selected.caption, /pose before their habitat exit/);
    assert.equal(/jimvio photograph/i.test(selected.alt), false);
    assert.match(selected.note, /Not a Jimvio photograph/);
    assert.equal(calls.some((url) => /favicon|logo/i.test(url)), false);
    const large = new Uint8Array(2_200_000);
    large.set(jpeg);
    const loaded = await fetchImage(PHOTO, async () => new Response(large, { status: 200, headers: { "content-type": "image/jpeg" } }));
    assert.equal(loaded?.byteLength, large.byteLength);
    const split = splitHeroCaption(`<figure><figcaption>${selected.caption}</figcaption></figure><p>Story</p>`, "Yearlong Mars habitat crew prepares to step outside");
    assert.match(split.caption ?? "", /Credit: NASA|pose before/);
    assert.equal(split.bodyHtml.includes("<figcaption>"), false);
    assert.equal(splitHeroCaption("<p>Source: NASA News Releases</p>").caption, null);
  });

  it("keeps the public template polished with safe source attribution", () => {
    const view = readFileSync(join(root, "components/editorial/article-view.tsx"), "utf8");
    const css = readFileSync(join(root, "components/editorial/editorial.module.css"), "utf8");
    const cards = readFileSync(join(root, "components/editorial/presentation.tsx"), "utf8");
    assert.doesNotMatch(view, /Source:/);
    assert.match(readFileSync(join(root, "lib/editorial/public-store.ts"), "utf8"), /internalLinksOnly: true/);
    assert.match(view, /splitHeroCaption/);
    assert.match(view, /sm:text-\[3rem\]/);
    assert.match(view, /max-w-\[72ch\]/);
    assert.match(css, /\.body a[\s\S]*#fd5000/);
    assert.match(css, /\.body a:focus-visible/);
    assert.match(css, /line-height: 1\.75/);
    assert.equal(cards.includes("linear-gradient(160deg,#172033"), false);
    assert.match(readFileSync(join(root, "app/media/sitemap.ts"), "utf8"), /export const revalidate = 60/);
  });
});
