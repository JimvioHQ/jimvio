import type { ContentDraft, EngineState, Opportunity } from "./types";

const PROHIBITED = /paypal|pesapal|pawapay|afripay|\bstripe\b|guaranteed (income|earnings|returns)/i;
const HIGH_IMPACT = /^\/(about|press|careers|pricing|terms|privacy|legal)(\/|$)|^\/$/;

export function isHighImpactPath(path: string): boolean {
  return path === "/" || HIGH_IMPACT.test(path) || path.startsWith("/legal");
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function qualityIssues(body: string, minimumWords: number): string[] {
  const issues: string[] = [];
  if (wordCount(body) < minimumWords) issues.push(`Draft has ${wordCount(body)} words. The minimum for this draft is ${minimumWords}.`);
  if (PROHIBITED.test(body)) issues.push("Draft includes a retired payment brand or a guaranteed-earnings claim.");
  if (!/review/i.test(body)) issues.push("Draft must say that a person reviews it before publication.");
  return issues;
}

function articleBody(input: { title: string; path: string; facts: string[] }): string {
  const facts = input.facts.filter(Boolean);
  const lines = [
    `${input.title} is a draft for the existing Jimvio page ${input.path}.`,
    "The facts below come from the current public catalog. This draft does not add traffic numbers, revenue numbers, or rankings.",
    ...facts.map((fact) => `Measured catalog fact: ${fact}`),
    "Suggested sections are: who the page is for, which Jimvio tools already exist, how a visitor starts, and which related pages to link.",
    "Internal links should point only at routes that already exist. Do not invent a partner, a community, or a search-volume figure.",
    "Payment copy, if a later edit needs it, must stay limited to methods Jimvio actually offers and must not name retired providers.",
    "A person reviews this draft before it can change a public page. The growth engine stores the draft and does not publish it to the site.",
    "Rollback keeps the earlier version in this record. Rejecting the draft leaves the live page unchanged.",
  ];
  return lines.join(" ");
}

export function buildDraft(input: {
  opportunity: Opportunity;
  path: string;
  title: string;
  facts: string[];
  now: Date;
}): ContentDraft {
  const body = articleBody(input);
  const issues = qualityIssues(body, 80);
  return {
    id: `draft-${input.opportunity.id}`,
    opportunityId: input.opportunity.id,
    path: input.path,
    channel: "public_page_review",
    title: input.title,
    status: "needs_review",
    versions: [{ version: 1, body, createdAt: input.now.toISOString() }],
    currentVersion: 1,
    qualityIssues: issues,
    publication: "not_published",
    appliedToSite: false,
  };
}

export function currentBody(draft: ContentDraft): string {
  return draft.versions.find((version) => version.version === draft.currentVersion)?.body ?? "";
}

export function markDraftReviewed(draft: ContentDraft): ContentDraft {
  return { ...draft, status: "reviewed_not_published", publication: "not_published", appliedToSite: false };
}

export function rejectDraft(draft: ContentDraft): ContentDraft {
  return { ...draft, status: "rejected", publication: "not_published", appliedToSite: false };
}

export function rollbackDraft(draft: ContentDraft): ContentDraft {
  const previous = draft.versions.filter((version) => version.version < draft.currentVersion).at(-1);
  if (!previous) return draft;
  return {
    ...draft,
    currentVersion: previous.version,
    status: "needs_review",
    publication: "not_published",
    appliedToSite: false,
  };
}

export function publicationDecision(input: {
  draft: ContentDraft;
  state: EngineState;
  now: Date;
  approved: boolean;
}): { publication: ContentDraft["publication"]; appliedToSite: false; reason: string } {
  if (isHighImpactPath(input.draft.path) || input.draft.channel === "public_page_review") {
    return {
      publication: "not_published",
      appliedToSite: false,
      reason: "Public pages, offers, and legal copy stay in review. This engine does not change the live site.",
    };
  }
  if (!input.approved || !input.state.lowRiskChannels.includes(input.draft.channel)) {
    return { publication: "not_published", appliedToSite: false, reason: "Low-risk logging needs an approval and a configured channel." };
  }
  if (input.draft.qualityIssues.length > 0) {
    return { publication: "not_published", appliedToSite: false, reason: "Quality checks failed." };
  }
  return {
    publication: "logged_not_on_site",
    appliedToSite: false,
    reason: "The decision is stored in the growth log only.",
  };
}

export function translationDraft(draft: ContentDraft, locale: string): { status: "blocked_no_provider"; locale: string; sourceVersion: number } {
  return { status: "blocked_no_provider", locale, sourceVersion: draft.currentVersion };
}
