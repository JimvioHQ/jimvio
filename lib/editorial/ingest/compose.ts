import type { MediaCategory } from "@/lib/editorial/types";
import { isMediaCategory } from "@/lib/editorial/validate";
import {
  escapeHtml,
  sharesLongPhrase,
  titleTokens,
  wordCount,
} from "@/lib/editorial/ingest/feed";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SENSITIVE =
  /\b(alleg\w*|accus\w*|lawsuit|court|killed|died|death|deaths|war|election|vote|voting|outbreak|scandal|fraud|crash|missile|bomb\w*|assault|abuse|suicide|bankrupt\w*|recall|sanction\w*|shooting|homicide)\b/i;

const ALLEGATION = /\b(alleg\w*|accus\w*|lawsuit|according to|claimed|claims|reportedly)\b/i;
const OPINION = /\b(should|must|believe|opinion|urge[sd]?)\b/i;

export function isSensitiveText(value: string): boolean {
  return SENSITIVE.test(value);
}

export function formatUtc(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} UTC`;
}

export type BriefMember = {
  sourceName: string;
  title: string;
  url: string;
  summary: string;
  publishedAt: string | null;
  creator: string | null;
};

export type OriginalBrief = {
  title: string;
  excerpt: string;
  bodyHtml: string;
  category: MediaCategory;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  sourceName: string;
  sourceUrl: string;
  evidence: string;
  sensitive: boolean;
  originalityOk: boolean;
  sufficient: boolean;
  issues: string[];
};

function digitsOutsideCorpus(generated: string, corpus: string): string[] {
  const text = generated.replace(/<[^>]+>/g, " ");
  const allowed = new Set(corpus.match(/\d+/g) ?? []);
  const used = text.match(/\d+/g) ?? [];
  return used.filter((value) => !allowed.has(value));
}

function quotedPassages(value: string): string[] {
  const found: string[] = [];
  const pattern = /["“]([^"”]{1,240})["”]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) found.push(match[1]);
  return found;
}

export function buildOriginalBrief(input: {
  category: string;
  members: BriefMember[];
}): OriginalBrief {
  const members = input.members.filter((member) => member.title && member.url && member.sourceName);
  const primary = members[0];
  const category = isMediaCategory(input.category) ? input.category : "news";
  const empty: OriginalBrief = {
    title: "",
    excerpt: "",
    bodyHtml: "",
    category,
    tags: "",
    seoTitle: "",
    seoDescription: "",
    sourceName: primary?.sourceName ?? "",
    sourceUrl: primary?.url ?? "",
    evidence: "",
    sensitive: false,
    originalityOk: false,
    sufficient: false,
    issues: ["insufficient"],
  };
  if (!primary) return empty;
  const corpusParts = members.flatMap((member) => [member.title, member.summary, member.publishedAt ?? "", member.creator ?? "", member.sourceName, member.url]);
  const corpus = corpusParts.join(" ");
  const combined = members.map((member) => `${member.title} ${member.summary}`).join(" ");
  const sufficient = members.some((member) => wordCount(member.summary) >= 20 || wordCount(member.title) >= 8);
  const sensitive = isSensitiveText(combined);
  const words = titleTokens(primary.title).slice(0, 5);
  const topic = words.join(" ");
  const headline = `${primary.sourceName} public notice${topic ? ` on ${topic}` : ""}`.replace(/\s+/g, " ").trim().slice(0, 140);
  const when = formatUtc(primary.publishedAt);
  const names = [...new Set(members.map((member) => member.sourceName))];
  const figures = [...new Set((combined.match(/\b\d{1,6}\b/g) ?? []).filter((figure) => figure.length < 6))].slice(0, 3);
  const issues: string[] = [];
  if (!sufficient) issues.push("insufficient");
  if (sensitive) issues.push("sensitive");
  if (members.length < 2) issues.push("single_source");
  if (!when) issues.push("undated");
  if (ALLEGATION.test(combined)) issues.push("allegation_or_claim");
  if (OPINION.test(combined)) issues.push("evaluative_wording");

  const uncertainty = [
    members.length < 2
      ? "This briefing uses one public source. It was not compared with a second independent report."
      : `Jimvio Media grouped related public items from ${names.join(" and ")}. Similar titles are not confirmation of every detail.`,
    ALLEGATION.test(combined)
      ? "The source text includes allegation or claim language. Those points are not reported here as established fact."
      : "",
    OPINION.test(combined)
      ? "Some source wording is evaluative. It is not repeated here as fact."
      : "",
    !when ? "The feed did not include a usable timestamp." : "",
  ].filter(Boolean).join(" ");

  const creator = primary.creator && primary.creator.length <= 80 ? primary.creator : "";
  const figureItems = figures.map((figure) => `<li>The source text includes the figure ${escapeHtml(figure)}.</li>`).join("");
  const links = members
    .map((member) => `<li><a href="${escapeHtml(member.url)}">${escapeHtml(member.sourceName)} original</a></li>`)
    .join("");
  const body = [
    `<p>${escapeHtml(primary.sourceName)} published a public item${when ? ` with feed timestamp ${escapeHtml(when)}` : ""}.</p>`,
    "<p>Jimvio Media wrote this briefing from the permitted record. The wording below is not the source text.</p>",
    "<h2>What is in the record</h2>",
    `<p>The topic words drawn from the original title are ${escapeHtml(topic || "not specific enough to list") }.</p>`,
    "<ul>",
    `<li>Named publisher: ${escapeHtml(primary.sourceName)}.</li>`,
    when ? `<li>Feed timestamp: ${escapeHtml(when)}.</li>` : "<li>Feed timestamp: not provided.</li>",
    creator ? `<li>The feed author field lists ${escapeHtml(creator)}. That name is source metadata, not a Jimvio byline.</li>` : "",
    figureItems,
    "</ul>",
    "<h2>How sure this is</h2>",
    `<p>${escapeHtml(uncertainty)}</p>`,
    "<h2>Sources</h2>",
    `<ul>${links}</ul>`,
  ].join("");
  const excerpt = `Jimvio Media summarized a public item from ${primary.sourceName}. The original is linked. Details from the available record are attributed and are not treated as confirmed beyond those sources.`.slice(0, 500);
  const sourceTexts = members.flatMap((member) => [member.title, member.summary]);
  const generated = `${headline} ${excerpt} ${body}`.replace(/<a\b[^>]*>/gi, " ").replace(/https?:\/\/\S+/gi, " ");
  const copied = sharesLongPhrase(generated, sourceTexts);
  const inventedNumbers = digitsOutsideCorpus(generated, `${corpus} ${when ?? ""}`);
  const inventedQuotes = quotedPassages(generated).filter((quote) => !corpus.includes(quote));
  const sameHeadline = fingerprintEqual(headline, primary.title);
  const originalityOk = !copied && inventedNumbers.length === 0 && inventedQuotes.length === 0 && !sameHeadline && headline.length >= 4;
  if (!originalityOk) issues.push("originality");
  const evidence = [
    `Issues: ${issues.join(", ") || "none"}.`,
    `Figures: ${figures.join(", ") || "none"}.`,
    `Sources: ${members.map((member) => member.url).join(" ")}`,
    `Uncertainty: ${uncertainty}`,
  ].join(" ").slice(0, 2000);
  const tags = titleTokens(primary.title).filter((tag) => /^[a-z0-9][a-z0-9-]{0,31}$/.test(tag)).slice(0, 6).join(", ");
  return {
    title: headline,
    excerpt,
    bodyHtml: originalityOk ? body : "",
    category,
    tags,
    seoTitle: headline.slice(0, 70),
    seoDescription: excerpt.slice(0, 160),
    sourceName: primary.sourceName.slice(0, 120),
    sourceUrl: primary.url,
    evidence,
    sensitive,
    originalityOk,
    sufficient,
    issues,
  };
}

function fingerprintEqual(left: string, right: string): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return normalize(left) === normalize(right);
}
