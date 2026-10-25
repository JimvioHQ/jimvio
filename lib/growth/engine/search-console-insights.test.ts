import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runGrowthCycle } from "./cycle";
import { buildOpportunities } from "./opportunities";
import { evaluateAction } from "./policy";
import { createInitialState } from "./state";
import { buildSearchConsoleInsights, mapQueryToPath, mapSearchConsolePage } from "./search-console-insights";

const now = new Date("2026-10-25T12:00:00.000Z");
const knownPaths = ["/", "/marketplace", "/affiliates", "/about"];
const catalog = [
  { path: "/", title: "Jimvio — Global Creator Commerce Platform" },
  { path: "/marketplace", title: "Marketplace" },
  { path: "/affiliates", title: "Affiliate program" },
  { path: "/about", title: "About Jimvio" },
];

describe("search console insights", () => {
  it("maps only exact public Jimvio pages and unique catalog terms", () => {
    assert.equal(mapSearchConsolePage("https://www.jimvio.com/marketplace?q=secret", knownPaths), "/marketplace");
    assert.equal(mapSearchConsolePage("https://jimvio.com/affiliates/", knownPaths), "/affiliates");
    assert.equal(mapSearchConsolePage("https://example.com/marketplace", knownPaths), null);
    assert.equal(mapSearchConsolePage("http://www.jimvio.com/marketplace", knownPaths), null);
    assert.equal(mapSearchConsolePage("https://www.jimvio.com/admin", knownPaths), null);
    assert.equal(mapSearchConsolePage("https://www.jimvio.com/checkout", ["/checkout"]), null);
    assert.equal(mapQueryToPath("marketplace", catalog, knownPaths), "/marketplace");
    assert.equal(mapQueryToPath("Affiliate program", catalog, knownPaths), "/affiliates");
    assert.equal(mapQueryToPath("jimvio", catalog, knownPaths), null);
    assert.equal(mapQueryToPath("creator commerce", catalog, knownPaths), null);
  });

  it("recommends low-click and weak pages without inventing a path", () => {
    const insights = buildSearchConsoleInsights({
      queries: [
        { query: "marketplace", clicks: 2, impressions: 80, position: 11.2 },
        { query: "creator tools", clicks: 1, impressions: 40, position: 14 },
        { query: "affiliate program", clicks: 30, impressions: 100, position: 2.2 },
        { query: "BEGIN PRIVATE KEY", clicks: 0, impressions: 90, position: 1 },
        { query: "tiny", clicks: 0, impressions: 3, position: 20 },
      ],
      pages: [
        { page: "https://www.jimvio.com/about", clicks: 4, impressions: 90, position: 12 },
        { page: "https://evil.example/about", clicks: 0, impressions: 90, position: 20 },
        { page: "https://www.jimvio.com/affiliates", clicks: 40, impressions: 100, position: 2 },
      ],
      catalog,
      knownPaths,
    });
    const marketplace = insights.find((item) => item.id === "sc-low-clicks-marketplace");
    assert.equal(marketplace?.path, "/marketplace");
    assert.equal(marketplace?.query, "marketplace");
    assert.match(marketplace?.recommendation ?? "", /draft only/);
    const unmapped = insights.find((item) => item.id === "sc-low-clicks-unmapped");
    assert.equal(unmapped?.path, null);
    assert.match(unmapped?.statement ?? "", /creator tools/);
    assert.equal(unmapped?.statement.includes("BEGIN PRIVATE KEY"), false);
    assert.equal(insights.some((item) => item.path === "/about"), true);
    assert.equal(insights.some((item) => item.statement.includes("evil.example")), false);
    assert.equal(insights.some((item) => item.id === "sc-relevant-queries"), true);
    assert.equal(insights.some((item) => item.query === "tiny"), false);

    const opportunities = buildOpportunities({
      findings: [],
      signals: {
        searchConsoleConnected: true,
        searchConsoleReport: {
          status: "read",
          rowCount: 3,
          queries: ["marketplace", "creator tools", "affiliate program"],
          queryRows: [
            { query: "marketplace", clicks: 2, impressions: 80, position: 11.2 },
            { query: "creator tools", clicks: 1, impressions: 40, position: 14 },
            { query: "affiliate program", clicks: 30, impressions: 100, position: 2.2 },
          ],
          pageRows: [{ page: "https://www.jimvio.com/about", clicks: 4, impressions: 90, position: 12 }],
          pageRead: "read",
        },
      },
      services: [],
      pages: catalog,
      knownPaths,
    });
    const draftable = opportunities.filter((item) => item.recommendedRiskClass === "draft" && item.id.startsWith("sc-"));
    assert.deepEqual(draftable.map((item) => item.title).sort(), [
      "Review the search snippet on /about",
      "Review the search snippet on /marketplace",
    ]);
    for (const item of opportunities) {
      assert.equal(["observe", "draft", "queue"].includes(item.recommendedRiskClass), true);
    }
    assert.equal(opportunities.some((item) => item.id === "search-console-read"), true);
    assert.equal(opportunities.some((item) => item.recommendedRiskClass === "production_change"), false);
  });

  it("stores a review draft and leaves spend, rewards, messages, and the live page blocked", async () => {
    const state = { ...createInitialState(now), status: "running" as const, pausedReason: "Running." };
    const result = await runGrowthCycle({
      state,
      signals: {
        searchConsoleConnected: true,
        searchConsoleReport: {
          status: "read",
          rowCount: 1,
          queries: ["marketplace"],
          queryRows: [{ query: "marketplace", clicks: 2, impressions: 80, position: 11 }],
          pageRows: [],
          pageRead: "read",
        },
      },
      pages: [{ path: "/marketplace", title: "Marketplace", description: "Physical and digital products from suppliers on Jimvio, with filters and checkout." }],
      sitemapPaths: ["/marketplace"],
      knownPaths,
      services: [],
      now,
      runId: "search-insight-cycle",
    });
    const draft = result.state.drafts.find((item) => item.path === "/marketplace");
    assert.ok(draft);
    assert.equal(draft?.appliedToSite, false);
    assert.equal(draft?.publication, "not_published");
    assert.match(draft?.versions[0]?.body ?? "", /does not publish it/);
    assert.equal(result.state.campaigns.every((item) => item.submitted === false), true);
    assert.equal(result.state.referrals.every((item) => item.issued === false), true);
    assert.equal(result.state.followups.every((item) => item.sent === false), true);
    assert.match(result.summary.summary, /Search Console returned 1 queries and 0 pages \(read\)/);
    assert.equal(result.summary.summary.includes("marketplace"), false);
    const readNote = result.state.opportunities.find((item) => item.id === "search-console-read");
    assert.match(readNote?.evidence[0]?.statement ?? "", /1 queries and 0 pages \(read\)/);
    assert.equal(readNote?.evidence.some((item) => item.statement.includes("marketplace")), false);
    for (const risk of ["paid_spend", "reward_issue", "bulk_message", "production_change"] as const) {
      assert.equal(evaluateAction(result.state, risk, "search-insight", now).allowed, false);
    }

    const again = await runGrowthCycle({
      state: result.state,
      signals: {
        searchConsoleConnected: true,
        searchConsoleReport: {
          status: "read",
          rowCount: 1,
          queries: ["marketplace"],
          queryRows: [{ query: "marketplace", clicks: 2, impressions: 80, position: 11 }],
          pageRows: [],
          pageRead: "read",
        },
      },
      pages: [{ path: "/marketplace", title: "Marketplace", description: "Physical and digital products from suppliers on Jimvio, with filters and checkout." }],
      sitemapPaths: ["/marketplace"],
      knownPaths,
      services: [],
      now,
      runId: "search-insight-cycle-again",
    });
    assert.equal(again.state.drafts.filter((item) => item.path === "/marketplace").length, 1);
    assert.equal(again.state.drafts.every((item) => item.appliedToSite === false), true);
  });

  it("records a failed Search Console read without drafting a page", () => {
    const items = buildOpportunities({
      findings: [],
      signals: {
        searchConsoleConnected: true,
        searchConsoleReport: { status: "failed", rowCount: 0, queries: [], code: "forbidden" },
      },
      services: [],
      pages: catalog,
      knownPaths,
    });
    const failed = items.find((item) => item.id === "search-console-read-failed");
    assert.equal(failed?.recommendedRiskClass, "observe");
    assert.match(failed?.evidence[0]?.statement ?? "", /forbidden/);
    assert.equal(failed?.evidence[0]?.statement.includes("private_key"), false);
    assert.equal(items.some((item) => item.id.startsWith("sc-")), false);
  });
});
