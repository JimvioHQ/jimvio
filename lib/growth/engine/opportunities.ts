import type { Evidence, MeasuredSignals, Opportunity, SeoFinding } from "./types";

const FUNNEL = ["growth.welcome_intent_selected", "growth.welcome_completed", "growth.checklist_completed"] as const;

function id(parts: string[]): string {
  return parts.join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 96);
}

function score(confidence: Opportunity["confidence"], measured: boolean, effort: Opportunity["effort"]): number {
  const confidenceScore = confidence === "high" ? 3 : confidence === "medium" ? 2 : 1;
  const effortScore = effort === "low" ? 2 : effort === "medium" ? 1 : 0;
  return confidenceScore * 10 + (measured ? 5 : 0) + effortScore;
}

function opportunity(input: Omit<Opportunity, "priorityScore" | "priorityBasis" | "effortBasis">): Opportunity {
  const measured = input.evidence.some((item) => item.kind === "measured");
  return {
    ...input,
    effortBasis: "estimate",
    priorityScore: score(input.confidence, measured, input.effort),
    priorityBasis: "estimate",
  };
}

export function buildOpportunities(input: {
  findings: SeoFinding[];
  signals: MeasuredSignals;
  services: Array<{ id: string; title: string; href: string }>;
}): Opportunity[] {
  const items: Opportunity[] = [];

  for (const finding of input.findings) {
    if (finding.code === "external-links-not-crawled") continue;
    if (finding.severity === "info" && finding.code === "title-length") continue;
    items.push(opportunity({
      id: id(["seo", finding.id]),
      title: `Fix ${finding.code} on ${finding.path}`,
      kind: "seo",
      evidence: [{ kind: finding.basis, statement: finding.statement, source: "seo-audit" }],
      effort: "low",
      expectedBenefit: "May help this URL get a clearer search snippet. The traffic effect is not measured.",
      benefitBasis: "hypothesis",
      confidence: finding.severity === "warning" ? "medium" : "low",
      risks: ["A copy change on a public page still needs review.", "This audit does not know current rankings."],
      nextAction: "Review the finding and edit the page only after approval.",
      recommendedRiskClass: "draft",
    }));
  }

  for (const service of input.services) {
    const dedicated = service.href === `/${service.id}` || service.href.endsWith(`/${service.id}`);
    if (dedicated) continue;
    items.push(opportunity({
      id: id(["gap", service.id]),
      title: `${service.title} uses ${service.href}`,
      kind: "content_gap",
      evidence: [
        { kind: "measured", statement: `${service.title} is linked to ${service.href}.`, source: "public-ecosystem" },
        {
          kind: "hypothesis",
          statement: "A dedicated landing page might match searches for this service. No query volume was measured.",
          source: "search-intent-hypothesis",
        },
      ],
      effort: "medium",
      expectedBenefit: "A dedicated page could give this service its own title and internal links. Demand is not measured.",
      benefitBasis: "hypothesis",
      confidence: "low",
      risks: ["Do not publish a thin page.", "Search Console is required before treating a query as demand."],
      nextAction: input.signals.searchConsoleConnected
        ? "Credential names are present, but this run did not read a Search Console report. Do not treat a hypothesis as demand."
        : "Connect Search Console before treating any query as demand. A draft can be prepared for review.",
      recommendedRiskClass: "draft",
    }));
  }

  const funnel = input.signals.funnel;
  if (funnel) {
    for (let index = 0; index < FUNNEL.length - 1; index += 1) {
      const earlier = FUNNEL[index];
      const later = FUNNEL[index + 1];
      const from = funnel[earlier];
      const to = funnel[later];
      if (typeof from !== "number" || typeof to !== "number" || from <= to) continue;
      items.push(opportunity({
        id: id(["activation", earlier, later]),
        title: `Onboarding drop from ${earlier} to ${later}`,
        kind: "activation",
        evidence: [{
          kind: "measured",
          statement: `${from} ${earlier} events and ${to} ${later} events are in the supplied funnel.`,
          source: "growth-events",
        }],
        effort: "medium",
        expectedBenefit: `${from - to} fewer people reached the later step in this sample. The cause is not identified.`,
        benefitBasis: "measured",
        confidence: "medium",
        risks: ["A zero from the KPI helper can also mean a failed query.", "Do not email the cohort without consent and approval."],
        nextAction: "Inspect the onboarding step. Queue a follow-up only for a consented user.",
        recommendedRiskClass: "queue",
      }));
    }
  }

  if (typeof input.signals.affiliateClicks7d === "number") {
    items.push(opportunity({
      id: "channel-affiliate-clicks-7d",
      title: "Affiliate click channel",
      kind: "channel",
      evidence: [{
        kind: "measured",
        statement: `${input.signals.affiliateClicks7d} affiliate clicks were counted for the last 7 days.`,
        source: "affiliate_clicks",
      }],
      effort: "low",
      expectedBenefit: "Clicks are not the same as activated users. Conversion from this count was not supplied.",
      benefitBasis: "hypothesis",
      confidence: "medium",
      risks: ["Do not buy traffic from this count alone."],
      nextAction: "Compare these clicks with qualified signups before changing the affiliate page.",
      recommendedRiskClass: "observe",
    }));
  } else {
    items.push(opportunity({
      id: "channel-affiliate-unmeasured",
      title: "Affiliate channel is not measured in this run",
      kind: "channel",
      evidence: [{ kind: "measured", statement: "No affiliate click count was supplied.", source: "growth-cycle" }],
      effort: "low",
      expectedBenefit: "Unknown until the click count is read.",
      benefitBasis: "hypothesis",
      confidence: "low",
      risks: ["Do not rank this channel above a measured one."],
      nextAction: "Read affiliate_clicks before recommending the channel.",
      recommendedRiskClass: "observe",
    }));
  }

  items.push(opportunity({
    id: "partnership-no-harvest",
    title: "Partnership outreach stays manual",
    kind: "partnership",
    evidence: [{
      kind: "measured",
      statement: "This run has no imported partner, community, or contact dataset.",
      source: "growth-cycle",
    }],
    effort: "high",
    expectedBenefit: "Unknown. No response rate was measured.",
    benefitBasis: "hypothesis",
    confidence: "low",
    risks: ["Unsolicited outreach and contact harvesting are not allowed."],
    nextAction: "Review partnership mail that people send to Jimvio. Do not scrape directories or create accounts.",
    recommendedRiskClass: "observe",
  }));

  const report = input.signals.searchConsoleReport;
  if (report?.status === "read") {
    const sample = report.queries.slice(0, 5).join(", ");
    items.push(opportunity({
      id: "search-console-read",
      title: "Search Console returned site queries",
      kind: "seo",
      evidence: [{
        kind: "measured",
        statement: sample
          ? `Search Console returned ${report.rowCount} queries. Top queries: ${sample}.`
          : `Search Console returned ${report.rowCount} queries.`,
        source: "search-console",
      }],
      effort: "medium",
      expectedBenefit: "These queries are measured demand for existing pages. A draft still needs review and does not change the live site.",
      benefitBasis: "measured",
      confidence: "high",
      risks: ["Do not publish a thin page from a query alone."],
      nextAction: "Review the queries before drafting a page. This record does not change the live site.",
      recommendedRiskClass: "observe",
    }));
  } else if (report?.status === "failed") {
    items.push(opportunity({
      id: "search-console-read-failed",
      title: "Search Console read failed",
      kind: "seo",
      evidence: [{
        kind: "measured",
        statement: `Search Console read failed (${report.code ?? "http_error"}). No query demand was recorded.`,
        source: "search-console",
      }],
      effort: "medium",
      expectedBenefit: "A later successful read can replace this failure. The gain is not measured yet.",
      benefitBasis: "hypothesis",
      confidence: "high",
      risks: ["Do not treat a failed read as search demand."],
      nextAction: "Check the site URL, the service-account JSON, and that the account has access to the property.",
      recommendedRiskClass: "observe",
    }));
  } else if (!input.signals.searchConsoleConnected) {
    items.push(opportunity({
      id: "search-console-not-connected",
      title: "Search query demand is not connected",
      kind: "seo",
      evidence: [{
        kind: "measured",
        statement: "Search Console credentials are not both configured, so no query report was read.",
        source: "environment",
      }],
      effort: "medium",
      expectedBenefit: "Connecting the official API would replace hypothesized topics with site queries. The gain is not measured yet.",
      benefitBasis: "hypothesis",
      confidence: "high",
      risks: ["The API is free of charge but quota-limited. Do not scrape search results instead."],
      nextAction: "Set GOOGLE_SEARCH_CONSOLE_SITE_URL and GOOGLE_SEARCH_CONSOLE_CREDENTIALS. The engine then runs a read-only searchAnalytics query.",
      recommendedRiskClass: "observe",
    }));
  } else {
    items.push(opportunity({
      id: "search-console-unverified",
      title: "Search Console names are set and no query report was read",
      kind: "seo",
      evidence: [{
        kind: "measured",
        statement: "Both Search Console environment names are set. This cycle did not receive a query report, so query demand is still unknown.",
        source: "environment",
      }],
      effort: "medium",
      expectedBenefit: "A later read-only query report could replace hypothesized topics. The gain is not measured yet.",
      benefitBasis: "hypothesis",
      confidence: "high",
      risks: ["Do not describe credential names as measured search demand."],
      nextAction: "Run a cycle after the service-account key is valid. A names-only setup does not count as demand.",
      recommendedRiskClass: "observe",
    }));
  }

  return items
    .sort((a, b) => b.priorityScore - a.priorityScore || a.title.localeCompare(b.title))
    .slice(0, 40);
}

export function measuredEvidence(opportunity: Opportunity): Evidence[] {
  return opportunity.evidence.filter((item) => item.kind === "measured");
}
