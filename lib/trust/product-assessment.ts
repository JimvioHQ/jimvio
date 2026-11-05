/**
 * The single authoritative verdict for Digital Product Verification. Pure:
 * the scanner computes it once and stores it with the report; the page
 * renders it, so banner, score and check rows cannot contradict each other.
 *
 * Separate dimensions are kept separate: a file can be technically clean
 * while its rights are unclear, a public-domain work can still ship in a
 * dangerous file, and a product can be authentic but incomplete. Nothing
 * that did not run counts as passed — or as failed.
 */
import type { Finding, ProductAssessment, ProductCheck, ProductCheckStatus, ProductDetails } from "./types";

export const PRODUCT_MODEL = "product-verification-v2 (Nov 2026)";

const DONE: ProductCheckStatus[] = ["PASS", "INFO", "REVIEW", "RISK"];

/** Authors whose works are old enough to be public domain almost everywhere (death year). Used as supporting evidence only. */
const PD_AUTHORS: [RegExp, string, number][] = [
  [/jane austen/i, "Jane Austen", 1817], [/charles dickens/i, "Charles Dickens", 1870], [/william shakespeare|^shakespeare$/i, "William Shakespeare", 1616],
  [/mark twain|samuel (l\.? )?clemens/i, "Mark Twain", 1910], [/charlotte bront[eë]/i, "Charlotte Brontë", 1855], [/emily bront[eë]/i, "Emily Brontë", 1848],
  [/leo tolstoy|lev tolstoy/i, "Leo Tolstoy", 1910], [/dostoevsky|dostoyevsky/i, "Fyodor Dostoevsky", 1881], [/herman melville/i, "Herman Melville", 1891],
  [/edgar allan poe/i, "Edgar Allan Poe", 1849], [/oscar wilde/i, "Oscar Wilde", 1900], [/victor hugo/i, "Victor Hugo", 1885], [/jules verne/i, "Jules Verne", 1905],
  [/lewis carroll/i, "Lewis Carroll", 1898], [/robert louis stevenson/i, "Robert Louis Stevenson", 1894], [/mary shelley/i, "Mary Shelley", 1851],
  [/bram stoker/i, "Bram Stoker", 1912], [/thomas hardy/i, "Thomas Hardy", 1928], [/george eliot/i, "George Eliot", 1880], [/homer$/i, "Homer", -700],
  [/alexandre dumas/i, "Alexandre Dumas", 1870], [/nathaniel hawthorne/i, "Nathaniel Hawthorne", 1864], [/miguel de cervantes/i, "Miguel de Cervantes", 1616],
  [/dante alighieri/i, "Dante Alighieri", 1321], [/franz kafka/i, "Franz Kafka", 1924], [/arthur conan doyle/i, "Arthur Conan Doyle", 1930],
  [/joseph conrad/i, "Joseph Conrad", 1924], [/henry james/i, "Henry James", 1916], [/anton chekhov/i, "Anton Chekhov", 1904], [/jack london/i, "Jack London", 1916],
  [/louisa may alcott/i, "Louisa May Alcott", 1888], [/daniel defoe/i, "Daniel Defoe", 1731], [/jonathan swift/i, "Jonathan Swift", 1745], [/plato$/i, "Plato", -348],
  [/sun tzu/i, "Sun Tzu", -496], [/marcus aurelius/i, "Marcus Aurelius", 180], [/niccol[oò] machiavelli/i, "Niccolò Machiavelli", 1527],
];

export function publicDomainAuthor(author: string | null, now = new Date()): { name: string; died: number } | null {
  if (!author) return null;
  for (const [re, name, died] of PD_AUTHORS) if (re.test(author.trim()) && now.getUTCFullYear() - died > 100) return { name, died };
  return null;
}

type Input = { details: ProductDetails; findings: Finding[]; failed?: boolean; now?: Date };

export function assessProduct({ details: d, findings: f, failed = false, now = new Date() }: Input): ProductAssessment {
  const checks: ProductCheck[] = [];
  const add = (c: Omit<ProductCheck, "evidence" | "critical"> & { evidence?: string[]; critical?: boolean }) => checks.push({ evidence: [], critical: false, ...c });
  const isPdf = /pdf/i.test(d.mime ?? d.format ?? "");
  const p = d.pdf ?? null;
  const fileF = f.filter((x) => /File signature|File inspection|Archive scan/.test(x.source));
  const ev = (fs: Finding[]) => fs.map((x) => (x.detail ? `${x.title} — ${x.detail}` : x.title));

  // ── FILE SECURITY ───────────────────────────────────────────────────────
  if (d.fileName) {
    const mismatch = fileF.filter((x) => x.tone === "bad" && /Name says|Double file extension|This is a program/.test(x.title));
    const matched = fileF.find((x) => x.tone === "good" && /matches its name/.test(x.title));
    add({
      id: "integrity", group: "security", name: "File Integrity", critical: true, source: "File signature",
      status: mismatch.length ? "RISK" : matched ? "PASS" : d.format && !/Unknown/.test(d.format) ? "PASS" : "NOT_CHECKED",
      label: mismatch.length ? "Mismatch" : matched || (d.format && !/Unknown/.test(d.format)) ? "Valid" : "Not Recognized",
      explanation: mismatch.length ? "The file's real type does not match how it is presented." : d.format && !/Unknown/.test(d.format) ? `The file's own bytes identify it as a ${d.format}, matching its name.` : "The file format is not recognized, so its structure could not be inspected.",
      evidence: ev(mismatch),
    });

    if (isPdf) {
      if (!p || p.parseError) {
        add({ id: "structure", group: "security", name: "Suspicious PDF Actions", critical: true, source: "PDF structure inspection", status: "FAILED", label: "Inspection Failed", explanation: `The PDF structure could not be parsed${p?.parseError ? ` (${p.parseError})` : ""}. This is a processing problem, not evidence of malware.` });
      } else {
        const s = p.security;
        const risky = [
          s.javascript ? `${s.javascript} JavaScript action${s.javascript > 1 ? "s" : ""}` : "",
          s.launch ? `${s.launch} Launch action${s.launch > 1 ? "s" : ""} (can start programs)` : "",
          s.submitForm ? "Form submission / data import action" : "",
          s.openActionKind && /JavaScript|Launch/.test(s.openActionKind) ? `Runs “${s.openActionKind}” when opened` : "",
        ].filter(Boolean);
        const review = [
          s.openActionKind === "Open web link" ? "Opens a web link when the file is opened" : "",
          s.additionalActions ? `${s.additionalActions} automatic trigger action${s.additionalActions > 1 ? "s" : ""}` : "",
          s.richMedia ? "Embedded rich media (Flash/movie/sound)" : "",
          s.xfa ? "XFA dynamic form" : "",
          s.malformedStreams > 3 ? `${s.malformedStreams} damaged or undecodable data streams` : "",
        ].filter(Boolean);
        add({
          id: "structure", group: "security", name: "Suspicious PDF Actions", critical: true, source: "PDF structure inspection (all objects, incl. compressed object streams)",
          status: risky.length ? "RISK" : review.length ? "REVIEW" : "PASS",
          label: risky.length ? "Active Content Found" : review.length ? "Review" : "None Found",
          explanation: risky.length ? "The PDF contains actions that can run code or start programs. Ordinary ebooks and guides do not need them." : review.length ? "The PDF has automatic behaviour worth reviewing; none of it runs code." : "No JavaScript, launch, auto-run or form-submission actions anywhere in the document's objects.",
          evidence: [...risky, ...review, s.openActionKind && !risky.length && !review.length ? `Open action: ${s.openActionKind} (harmless)` : ""].filter(Boolean),
        });
        add({
          id: "embedded", group: "security", name: "Embedded Files", source: "PDF structure inspection",
          status: s.embeddedFiles ? "REVIEW" : "PASS", label: s.embeddedFiles ? `${s.embeddedFiles} Attached` : "None",
          explanation: s.embeddedFiles ? "The PDF carries attached files. Jimvio does not open them; check them separately before use." : "No files are attached inside the PDF.",
        });
      }
      const lc = d.linkCheck ?? { status: "none", matches: [] };
      const hosts = p?.security.externalHosts ?? [];
      add({
        id: "links", group: "security", name: "Dangerous Links", source: "PDF link annotations · Phishing.Database",
        status: lc.status === "match" ? "RISK" : !hosts.length ? (p ? "PASS" : "NOT_CHECKED") : lc.status === "clean" ? "PASS" : "UNAVAILABLE",
        label: lc.status === "match" ? "Phishing Link" : !hosts.length ? (p ? "No Links" : "Not Checked") : lc.status === "clean" ? `${hosts.length} Domain${hosts.length > 1 ? "s" : ""}, None Listed` : "List Unavailable",
        explanation: lc.status === "match" ? "A link in the document points to a domain on a phishing list." : !hosts.length ? "The document contains no web links." : lc.status === "clean" ? `Links point to ${hosts.slice(0, 4).join(", ")}${hosts.length > 4 ? "…" : ""}. None are on the phishing list.` : "The document has links, but the phishing list could not be loaded to check them.",
        evidence: [...lc.matches.map((m) => `Listed: ${m}`), ...hosts.slice(0, 10)],
      });
    } else {
      const bad = fileF.filter((x) => x.tone === "bad" && !/Name says|Double file extension/.test(x.title));
      const warn = fileF.filter((x) => x.tone === "warn");
      const inspectable = /zip|office|epub|word|excel|powerpoint|text|ole/i.test(`${d.mime} ${d.format}`);
      add({
        id: "structure", group: "security", name: "Active Content (Macros, Programs)", critical: true, source: "Archive / document structure inspection",
        status: bad.length ? "RISK" : warn.length ? "REVIEW" : inspectable ? "PASS" : "NOT_CHECKED",
        label: bad.length ? "Found" : warn.length ? "Review" : inspectable ? "None Found" : "Not Supported",
        explanation: bad.length ? "The file contains programs, scripts or macros." : inspectable ? "No programs, scripts or macros inside the file." : "Jimvio has no structural inspector for this format yet.",
        evidence: ev([...bad, ...warn]),
      });
    }
    add({
      id: "antivirus", group: "security", name: "Malware Detection (Antivirus)", source: "Antivirus engine",
      status: "UNAVAILABLE", label: "Not Configured",
      explanation: "No antivirus engine is connected, so known-malware signatures were not checked. The structural inspection above is a separate check and does not replace a full antivirus scan.",
    });
  }

  // ── AUTHENTICITY ────────────────────────────────────────────────────────
  if (d.fileName) {
    add({
      id: "duplicate", group: "authenticity", name: "Exact Duplicate Detection", source: "Jimvio fingerprint history · Jimvio marketplace (SHA-256)",
      status: d.marketplaceDuplicates.length ? "REVIEW" : "INFO",
      label: d.marketplaceDuplicates.length ? "Listed on Jimvio" : d.seenBefore > 0 ? `Checked ${d.seenBefore}×` : "First Check",
      explanation: d.marketplaceDuplicates.length
        ? `The same file is attached to a Jimvio listing (${d.marketplaceDuplicates.slice(0, 3).join(", ")}). Confirm the seller is the rightful owner.`
        : d.seenBefore > 0
          ? `This exact file has been checked ${d.seenBefore} time${d.seenBefore === 1 ? "" : "s"} on Jimvio. Earlier checks don't show who owns, sells or shares it.`
          : "This exact file has not been checked or listed on Jimvio before. Compared with Jimvio only, not the whole internet.",
    });
  }
  add({
    id: "similar", group: "authenticity", name: "Similar Product Matching", source: "Jimvio marketplace",
    status: "INFO", label: d.similarProducts?.length ? `${d.similarProducts.length} Similar` : "None on Jimvio",
    explanation: d.similarProducts?.length ? "Jimvio lists products with similar names. A similar name is not proof of copying." : "No similarly named digital products on Jimvio.",
    evidence: d.similarProducts ?? [],
  });

  // ── AUTHORSHIP ──────────────────────────────────────────────────────────
  add({
    id: "author", group: "authorship", name: "Author Metadata", source: "Document metadata",
    status: d.author ? "INFO" : "NOT_CHECKED", label: d.author ? "Metadata Found" : "None",
    explanation: d.author ? `The file's metadata names “${d.author}”. Metadata can be edited by anyone, so this is not independently verified authorship.` : "The file names no author. That is common and doesn't mean anything is wrong.",
  });
  const tool = d.producer ?? d.creator;
  add({
    id: "software", group: "authorship", name: "Creator Software", source: "Document metadata (Producer / Creator)",
    status: d.aiToolInMetadata ? "REVIEW" : tool ? "INFO" : "NOT_CHECKED",
    label: d.aiToolInMetadata ? "AI Tool Named" : tool ? "Identified" : "Not Stated",
    explanation: d.aiToolInMetadata
      ? `The metadata names an AI writing tool (${d.aiToolInMetadata}). That shows the tool was used, not how much of the content it wrote.`
      : tool
        ? `Made with ${[d.producer, d.creator && d.creator !== d.producer ? d.creator : null].filter(Boolean).join(" · ")}. Authoring or typesetting software is not evidence of AI writing.`
        : "The file does not say which software created it.",
  });
  add({
    id: "ai", group: "authorship", name: "AI vs Human Writing", source: "—", status: "NOT_CHECKED", label: "Not Assessed",
    explanation: "No method can reliably tell AI-written text from human writing, so Jimvio makes no guess and shows no percentage.",
  });

  // ── RIGHTS ──────────────────────────────────────────────────────────────
  const readable = d.textReadable;
  const pd = publicDomainAuthor(d.author, now);
  add({
    id: "copyright", group: "rights", name: "Copyright Information", source: "Document text",
    status: !readable ? "NOT_CHECKED" : "INFO",
    label: !readable ? "Not Assessed" : d.copyrightNotice ? "Notice Found" : "No Notice",
    explanation: !readable ? "The text could not be read, so copyright wording could not be inspected." : d.copyrightNotice ? `“${d.copyrightNotice}”` : "No copyright notice appears in the text that was read.",
  });
  add({
    id: "license", group: "rights", name: "License Statement", source: "Document text",
    status: !readable ? "NOT_CHECKED" : d.license === "resell_rights" ? "REVIEW" : "INFO",
    label: !readable ? "Not Assessed" : d.license ? LICENSE_TEXT[d.license] : "None Stated",
    explanation: !readable ? "The text could not be read, so licence wording could not be inspected." : d.license === "resell_rights" ? "Claims resell / PLR rights. These claims are often false; ask for the original licence." : d.license ? "The document states its own usage terms." : "The document states no licence terms.",
  });
  add({
    id: "publicdomain", group: "rights", name: "Public-Domain Evidence", source: "Author metadata · public-domain reference list",
    status: pd ? "INFO" : "NOT_CHECKED", label: pd ? "Work Likely Public Domain" : "No Evidence",
    explanation: pd
      ? `${pd.name} died in ${pd.died < 0 ? `${-pd.died} BC` : pd.died}, so the original work is in the public domain in most countries. This edition's own typesetting, cover, notes or translation can still carry separate rights, and the author name comes from metadata.`
      : "No evidence that the work is in the public domain.",
  });
  add({
    id: "authorization", group: "rights", name: "Distribution Authorization", source: "Jimvio digital review · seller documents",
    status: d.jimvio?.approved ? "PASS" : "NOT_CHECKED", label: d.jimvio?.approved ? "Approved by Jimvio" : "Not Provided",
    explanation: d.jimvio?.approved ? "Jimvio reviewed and approved this file for sale." : "No proof was provided that the seller may distribute this edition.",
  });

  // ── CONTENT ─────────────────────────────────────────────────────────────
  const pg = p?.pages ?? null;
  if (pg && pg.total) {
    const pct = Math.round((pg.withText / pg.total) * 100);
    add({
      id: "extraction", group: "content", name: "Text Extraction & Page Coverage", critical: true, source: "PDF text extraction (per page)",
      status: pct >= 90 ? "PASS" : pg.withText > 0 ? "REVIEW" : pg.imageOnly > 0 ? "NOT_CHECKED" : "FAILED",
      label: `${pg.withText} of ${pg.total} Pages Read`,
      explanation: pct >= 90
        ? `Text was read from ${pg.withText} of ${pg.total} pages${pg.blank ? `; ${pg.blank} blank` : ""}${pg.imageOnly ? `; ${pg.imageOnly} image-only` : ""}.`
        : pg.withText > 0
          ? `Only ${pg.withText} of ${pg.total} pages have readable text${pg.imageOnly ? ` (${pg.imageOnly} are images that need OCR, which is not configured)` : ""}. The rest was not analysed.`
          : pg.imageOnly > 0
            ? "The pages are images (a scan). OCR is not configured, so the text was not read."
            : "No text could be decoded from this PDF.",
      evidence: [pg.truncated ? `Processing limit reached after ${pg.processed} pages.` : "", pg.failed ? `${pg.failed} page(s) could not be processed.` : ""].filter(Boolean),
    });
  } else if (d.fileName) {
    add({
      id: "extraction", group: "content", name: "Text Extraction", critical: true, source: "Text extraction",
      status: readable ? "PASS" : "NOT_CHECKED", label: readable ? `${(d.wordCount ?? 0).toLocaleString("en-US")} Words Read` : "Not Read",
      explanation: readable ? "The text was read for analysis." : "Jimvio could not read text from this file format.",
    });
  }
  if (readable) {
    const ch = Math.max(p?.outlineChapters ?? 0, d.textChapters ?? 0);
    add({
      id: "structure_content", group: "content", name: "Structure & Completeness", source: "Bookmarks · document text",
      status: (pg?.duplicatePages ?? 0) > 2 ? "REVIEW" : "INFO",
      label: ch >= 2 ? `${ch} Chapters` : "Single Document",
      explanation: [
        ch >= 2 ? `${ch} chapters detected${p?.outlineChapters ? " (from bookmarks)" : ""}.` : "No chapter structure detected.",
        d.wordCount ? `${d.wordCount.toLocaleString("en-US")} words.` : "",
        (pg?.duplicatePages ?? 0) > 0 ? `${pg!.duplicatePages} page(s) repeat earlier pages.` : "",
      ].filter(Boolean).join(" "),
    });
    const cl = d.claims ?? { bad: 0, warn: 0 };
    add({
      id: "claims", group: "content", name: "Misleading Claims", source: "Claim check (document text)",
      status: cl.bad ? "RISK" : cl.warn ? "REVIEW" : "PASS", label: cl.bad ? "Harmful Claims" : cl.warn ? "Claims Flagged" : "None Found",
      explanation: cl.bad ? "The text makes harmful or deceptive promises." : cl.warn ? "The text makes claims worth checking." : "No get-rich-quick, guaranteed-result or similar deceptive claims in the text.",
      evidence: ev(f.filter((x) => x.source === "Claim check")),
    });
  }

  // ── SELLER ──────────────────────────────────────────────────────────────
  if (d.sellerPage) {
    const sp = d.sellerPage;
    const ok = [sp.hasContact, sp.hasRefund, sp.hasPrivacy].filter(Boolean).length;
    const young = sp.domainAgeDays != null && sp.domainAgeDays < 60;
    add({
      id: "seller", group: "seller", name: "Seller Page", source: "Product page · RDAP",
      status: !sp.hasContact || young ? "REVIEW" : "PASS", label: !sp.hasContact || young ? "Review" : ok === 3 ? "Complete" : "Partial",
      explanation: [sp.hasContact ? "Contact details shown." : "No way to contact the seller.", sp.hasRefund ? "Refund policy mentioned." : "No refund policy.", sp.hasPrivacy ? "Privacy policy linked." : "No privacy policy.", young ? `Shop domain is only ${sp.domainAgeDays} days old.` : ""].filter(Boolean).join(" "),
    });
  }
  if (d.jimvio) {
    add({ id: "jimvio_seller", group: "seller", name: "Jimvio Seller Verification", source: "Jimvio marketplace", status: d.jimvio.verifiedSeller ? "PASS" : "INFO", label: d.jimvio.verifiedSeller ? "Verified Store" : "Not Verified", explanation: d.jimvio.verifiedSeller ? "Sold by a store that passed Jimvio verification." : "The store has not completed Jimvio verification." });
  }

  // ── VERDICT ─────────────────────────────────────────────────────────────
  const done = checks.filter((k) => DONE.includes(k.status));
  const scored = checks.filter((k) => k.id !== "ai");
  const coverage = scored.length ? Math.round((scored.filter((k) => DONE.includes(k.status)).length / scored.length) * 100) : 0;
  const risks = checks.filter((k) => k.status === "RISK");
  const reviews = checks.filter((k) => k.status === "REVIEW");
  const criticalMissing = checks.filter((k) => k.critical && !DONE.includes(k.status));
  const securityRisk = risks.some((k) => k.group === "security");
  const fileSafety: ProductAssessment["fileSafety"] = !d.fileName
    ? "NOT_CHECKED"
    : securityRisk
      ? "SUSPICIOUS"
      : checks.some((k) => k.group === "security" && k.status === "FAILED")
        ? "SCAN_FAILED"
        : checks.some((k) => k.id === "structure" && k.status === "NOT_CHECKED")
          ? "INCONCLUSIVE"
          : checks.some((k) => k.group === "security" && k.status === "REVIEW")
            ? "SUSPICIOUS"
            : "CLEAN";
  const rights: ProductAssessment["rights"] = !readable && !pd && !d.jimvio?.approved
    ? "RIGHTS_NOT_ASSESSED"
    : d.jimvio?.approved
      ? "PUBLISHER_AUTHORIZATION_FOUND"
      : d.license && d.license !== "resell_rights"
        ? "LICENSE_FOUND"
        : pd
          ? "PUBLIC_DOMAIN_EVIDENCE_FOUND"
          : d.copyrightNotice
            ? "COPYRIGHT_NOTICE_FOUND"
            : d.marketplaceDuplicates.length
              ? "POSSIBLE_UNAUTHORIZED_DISTRIBUTION"
              : "RIGHTS_UNCLEAR";
  const ext = checks.find((k) => k.id === "extraction");
  const content: ProductAssessment["content"] = !ext || ext.status === "NOT_CHECKED"
    ? "CONTENT_NOT_ASSESSED"
    : ext.status === "FAILED"
      ? "CONTENT_EXTRACTION_FAILED"
      : checks.some((k) => k.group === "content" && (k.status === "RISK" || (k.status === "REVIEW" && k.id !== "extraction")))
        ? "CONTENT_QUALITY_ISSUES_FOUND"
        : ext.status === "REVIEW"
          ? "CONTENT_INCOMPLETE"
          : checks.some((k) => k.id === "claims")
            ? "CONTENT_QUALITY_ACCEPTABLE"
            : "CONTENT_READABLE";
  const authorship: ProductAssessment["authorship"] = d.author ? "AUTHORSHIP_METADATA_FOUND" : d.producer || d.creator ? "AUTHORSHIP_UNVERIFIED" : "INSUFFICIENT_EVIDENCE";

  const verdict: ProductAssessment["verdict"] = risks.length
    ? "POTENTIAL_RISK_DETECTED"
    : failed || (d.fileName && done.length <= 2)
      ? "SCAN_FAILED"
      : criticalMissing.length
        ? "VERIFICATION_INCOMPLETE"
        : reviews.length
          ? "NEEDS_REVIEW"
          : rights === "LICENSE_FOUND" || rights === "PUBLISHER_AUTHORIZATION_FOUND"
            ? "VERIFIED"
            : rights === "PUBLIC_DOMAIN_EVIDENCE_FOUND" || rights === "COPYRIGHT_NOTICE_FOUND"
              ? "NEEDS_REVIEW"
              : "UNABLE_TO_VERIFY";

  // Score: completed checks only; never a number from too little evidence.
  const pts = (s: ProductCheckStatus): number | null => (s === "PASS" || s === "INFO" ? 1 : s === "REVIEW" ? 0.6 : s === "RISK" ? 0 : null);
  const counted = scored.map((k) => pts(k.status)).filter((v): v is number => v != null);
  let score: number | null = counted.length ? Math.round((counted.reduce((a, b) => a + b, 0) / counted.length) * 100) : null;
  const scoreState: ProductAssessment["scoreState"] = verdict === "SCAN_FAILED" || coverage < 40 ? "NOT_SCORED" : criticalMissing.length ? "INCOMPLETE" : "SCORED";
  if (scoreState !== "SCORED" && !risks.length) score = null;
  if (score != null) {
    // Keep the number inside the verdict's band so they never contradict.
    const band: Record<ProductAssessment["verdict"], [number, number]> = {
      VERIFIED: [80, 100], NEEDS_REVIEW: [50, 84], UNABLE_TO_VERIFY: [40, 74], POTENTIAL_RISK_DETECTED: [0, 49], VERIFICATION_INCOMPLETE: [0, 100], SCAN_FAILED: [0, 100],
    };
    const [lo, hi] = band[verdict];
    score = Math.min(hi, Math.max(lo, score));
  }
  const textOk = ext?.status === "PASS";
  const confidence: ProductAssessment["confidence"] = coverage >= 75 && textOk ? "HIGH" : coverage >= 55 ? "MEDIUM" : "LOW";

  const found = [
    ...risks.map((k) => `${k.name}: ${k.explanation}`),
    ...reviews.map((k) => `${k.name}: ${k.explanation}`),
    ...checks.filter((k) => k.status === "PASS" && k.group === "security").map((k) => `${k.name}: ${k.explanation}`),
    ...checks.filter((k) => ["extraction", "publicdomain", "duplicate", "author", "software"].includes(k.id) && (k.status === "PASS" || k.status === "INFO")).map((k) => `${k.name}: ${k.explanation}`),
  ].slice(0, 5);
  const couldNotVerify = checks.filter((k) => !DONE.includes(k.status) && k.id !== "ai").map((k) => `${k.name}: ${k.explanation}`).slice(0, 7);
  const actions =
    verdict === "POTENTIAL_RISK_DETECTED"
      ? [securityRisk ? "Don't open the file on a device with important data until it has been scanned by antivirus." : "Review the flagged findings before buying or sharing.", "Ask the seller for proof they own or licensed the content.", "Pay only through a platform with buyer protection."]
      : verdict === "SCAN_FAILED"
        ? ["Try the check again in a few minutes."]
        : [
            ...(rights !== "LICENSE_FOUND" && rights !== "PUBLISHER_AUTHORIZATION_FOUND" ? [pd ? "If you plan to resell this edition, confirm the publisher's terms — the original work is free, the edition may not be." : "Ask the seller for written proof of the right to distribute this file."] : []),
            "Scan the file with your antivirus before opening it, since no antivirus engine was used here.",
            ...(content === "CONTENT_INCOMPLETE" ? ["Open the file and check the pages Jimvio could not read."] : []),
          ];

  return { model: PRODUCT_MODEL, verdict, fileSafety, authorship, rights, content, scoreState, score, coverage, confidence, checks, found, couldNotVerify, actions };
}

const LICENSE_TEXT: Record<NonNullable<ProductDetails["license"]>, string> = {
  commercial: "Commercial Use", creative_commons: "Creative Commons", all_rights_reserved: "All Rights Reserved", resell_rights: "Resell Rights Claimed", personal_use: "Personal Use Only",
};
