import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";
import { googleAdsReadUrl, metaAdsReadUrl, normalizeGoogleCustomerId, normalizeMetaAccountId, readGoogleAdsCustomer, readMetaAdAccount, spendGate } from "./ads-connectivity";
import { probeIntegrations } from "./integrations";
import { connectivityRecipientAllowed, readResendDomains, sendResendConnectivityTest } from "./resend-probe";
import { rewardIssuanceDecision } from "./reward-gate";
import { parseServiceAccount, readSearchConsoleQueries, readSearchConsoleSurface, validSearchConsoleSite } from "./search-console";

const now = new Date("2026-10-25T12:00:00.000Z");

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function serviceAccount(): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  return JSON.stringify({
    type: "service_account",
    client_email: "growth@example.iam.gserviceaccount.com",
    private_key: pem,
  });
}

describe("growth provider reads", () => {
  it("does not call the network when credentials are absent", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      throw new Error("network should not be called");
    };
    const probed = await probeIntegrations({ env: {}, fetchImpl, now });
    assert.equal(calls, 0);
    assert.equal(probed.checks.searchConsole.state, "missing");
    assert.equal(probed.checks.resend.state, "missing");
    assert.equal(probed.checks.googleAds.state, "missing");
    assert.equal(probed.checks.metaAds.state, "missing");
    assert.equal(probed.searchConsoleReport, undefined);
    assert.equal(JSON.stringify(probed).includes("BEGIN"), false);
  });

  it("validates Search Console credentials and reads queries without storing the token", async () => {
    assert.equal(validSearchConsoleSite("http://www.jimvio.com"), false);
    assert.equal(validSearchConsoleSite("https://www.jimvio.com/"), true);
    assert.equal(parseServiceAccount("{"), null);
    const urls: string[] = [];
    let tokenCalls = 0;
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      urls.push(`${init?.method ?? "GET"} ${url}`);
      if (url.includes("oauth2.googleapis.com")) {
        tokenCalls += 1;
        if (tokenCalls === 1) return jsonResponse(503, { error: "unavailable" });
        const body = String(init?.body ?? "");
        assert.equal(body.includes("grant_type="), true);
        assert.equal(body.includes("private_key"), false);
        return jsonResponse(200, { access_token: "ya29.unit-test" });
      }
      assert.equal(url.startsWith("https://searchconsole.googleapis.com/webmasters/v3/sites/"), true);
      assert.equal(init?.method, "POST");
      return jsonResponse(200, { rows: [{ keys: ["jimvio marketplace"], clicks: 3, impressions: 10, ctr: 0.3, position: 4.2 }] });
    };
    const result = await readSearchConsoleQueries({
      env: {
        GOOGLE_SEARCH_CONSOLE_SITE_URL: "https://www.jimvio.com/",
        GOOGLE_SEARCH_CONSOLE_CREDENTIALS: serviceAccount(),
      },
      fetchImpl,
      now,
      backoffMs: 0,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.rowCount, 1);
    assert.equal(result.queries[0]?.query, "jimvio marketplace");
    assert.equal(urls.some((url) => url.startsWith("POST https://oauth2.googleapis.com/token")), true);
    assert.equal(JSON.stringify(result).includes("ya29"), false);

    let refused = 0;
    const invalid = await readSearchConsoleQueries({
      env: { GOOGLE_SEARCH_CONSOLE_SITE_URL: "https://www.jimvio.com/", GOOGLE_SEARCH_CONSOLE_CREDENTIALS: "not-json" },
      fetchImpl: async () => {
        refused += 1;
        return jsonResponse(200, {});
      },
      now,
    });
    assert.equal(invalid.ok, false);
    if (invalid.ok) return;
    assert.equal(invalid.code, "invalid_credentials");
    assert.equal(refused, 0);
  });

  it("reads query and page rows with one token and does not submit a sitemap", async () => {
    const bodies: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com")) return jsonResponse(200, { access_token: "ya29.surface" });
      const body = String(init?.body ?? "");
      bodies.push(body);
      assert.equal(url.includes("/sitemaps"), false);
      const dimensions = JSON.parse(body).dimensions as string[];
      if (dimensions[0] === "query") {
        return jsonResponse(200, { rows: [{ keys: ["marketplace"], clicks: 2, impressions: 40, ctr: 0.05, position: 9 }] });
      }
      return jsonResponse(200, {
        rows: [{ keys: ["https://www.jimvio.com/marketplace?x=1"], clicks: 2, impressions: 40, ctr: 0.05, position: 9 }],
      });
    };
    const result = await readSearchConsoleSurface({
      env: {
        GOOGLE_SEARCH_CONSOLE_SITE_URL: "sc-domain:jimvio.com",
        GOOGLE_SEARCH_CONSOLE_CREDENTIALS: serviceAccount(),
      },
      fetchImpl,
      now,
      attempts: 1,
      backoffMs: 0,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.pageRead, "read");
    assert.equal(result.queries[0]?.query, "marketplace");
    assert.equal(result.pages[0]?.page, "https://www.jimvio.com/marketplace");
    assert.equal(JSON.stringify(result).includes("ya29"), false);
    assert.equal(bodies.length, 2);
    assert.equal(JSON.parse(bodies[0] ?? "{}").dimensions[0], "query");
    assert.equal(JSON.parse(bodies[0] ?? "{}").rowLimit, 25);
    assert.equal(JSON.parse(bodies[1] ?? "{}").dimensions[0], "page");
    const probed = await probeIntegrations({
      env: {
        GOOGLE_SEARCH_CONSOLE_SITE_URL: "sc-domain:jimvio.com",
        GOOGLE_SEARCH_CONSOLE_CREDENTIALS: serviceAccount(),
      },
      fetchImpl,
      now,
    });
    assert.equal(probed.checks.searchConsole.state, "verified");
    assert.equal(probed.checks.searchConsole.detail, "Search Console returned 1 queries and 1 pages (read).");
    assert.equal(probed.checks.searchConsole.detail.includes("marketplace"), false);
    assert.equal(probed.checks.searchConsole.detail.includes("jimvio.com"), false);
    assert.equal(probed.searchConsoleReport?.queryRows?.[0]?.impressions, 40);
    assert.equal(probed.searchConsoleReport?.pageRows?.[0]?.page, "https://www.jimvio.com/marketplace");
    assert.equal(JSON.stringify(probed).includes("ya29"), false);
    assert.equal(JSON.stringify(probed).includes("BEGIN"), false);
  });

  it("reads ads accounts with GET only and never submits spend", async () => {
    assert.equal(normalizeGoogleCustomerId("123-456-7890"), "1234567890");
    assert.equal(normalizeGoogleCustomerId("123"), null);
    assert.equal(normalizeMetaAccountId("act_123456789"), "act_123456789");
    assert.equal(googleAdsReadUrl("1234567890"), "https://googleads.googleapis.com/v21/customers/1234567890");
    assert.equal(metaAdsReadUrl("act_123456789")?.includes("campaigns"), false);
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push(`${init?.method ?? "GET"} ${String(input)}`);
      if (String(input).includes("googleads.googleapis.com")) {
        return jsonResponse(200, { status: "ENABLED", currencyCode: "USD" });
      }
      return jsonResponse(200, { id: "act_123456789", account_status: 1, currency: "USD", spend_cap: "0" });
    };
    const env = {
      GOOGLE_ADS_CUSTOMER_ID: "123-456-7890",
      GOOGLE_ADS_DEVELOPER_TOKEN: "developer",
      GOOGLE_ADS_ACCESS_TOKEN: "access",
      META_ADS_ACCOUNT_ID: "123456789",
      META_ADS_ACCESS_TOKEN: "meta",
      GROWTH_ADS_SPEND_CAP_USD: "25",
      GROWTH_ADS_SPEND_AUTHORIZED: "1",
    };
    const google = await readGoogleAdsCustomer({ env, fetchImpl, backoffMs: 0 });
    const meta = await readMetaAdAccount({ env, fetchImpl, backoffMs: 0 });
    assert.equal(google.ok, true);
    assert.equal(meta.ok, true);
    assert.equal(calls.every((call) => call.startsWith("GET ")), true);
    assert.equal(calls.some((call) => call.includes(":mutate") || call.includes("/campaigns")), false);
    const gate = spendGate(env);
    assert.equal(gate.capUsd, 25);
    assert.equal(gate.authorized, true);
    assert.equal(gate.submissionImplemented, false);
    assert.match(gate.reason, /no charge is made/);

    let called = 0;
    const invalid = await readGoogleAdsCustomer({
      env: { ...env, GOOGLE_ADS_CUSTOMER_ID: "nope" },
      fetchImpl: async () => {
        called += 1;
        return jsonResponse(200, {});
      },
    });
    assert.equal(invalid.ok, false);
    if (invalid.ok) return;
    assert.equal(invalid.code, "invalid_account");
    assert.equal(called, 0);
  });

  it("checks Resend without emailing a real recipient", async () => {
    assert.equal(connectivityRecipientAllowed("delivered@resend.dev"), true);
    assert.equal(connectivityRecipientAllowed("delivered+growth@resend.dev"), true);
    assert.equal(connectivityRecipientAllowed("person@jimvio.com"), false);
    const calls: Array<{ url: string; method: string; body: string }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), method: init?.method ?? "GET", body: String(init?.body ?? "") });
      if (String(input).endsWith("/domains")) return jsonResponse(200, { data: [{ id: "domain" }] });
      return jsonResponse(200, { id: "email_123" });
    };
    const domains = await readResendDomains({ env: { RESEND_API_KEY: "re_unit_test_key" }, fetchImpl, backoffMs: 0 });
    assert.equal(domains.ok, true);
    if (!domains.ok) return;
    assert.equal(domains.domainCount, 1);
    const sent = await sendResendConnectivityTest({
      env: { RESEND_API_KEY: "re_unit_test_key", EMAIL_FROM: "Jimvio <info@jimvio.com>" },
      fetchImpl,
      now,
      backoffMs: 0,
    });
    assert.equal(sent.ok, true);
    const emailCall = calls.find((call) => call.url === "https://api.resend.com/emails");
    assert.ok(emailCall);
    assert.equal(emailCall?.method, "POST");
    assert.equal(emailCall?.body.includes("delivered@resend.dev"), true);
    assert.equal(emailCall?.body.includes("person@jimvio.com"), false);
    assert.equal(emailCall?.body.includes("re_unit_test_key"), false);
    const probed = await probeIntegrations({ env: { RESEND_API_KEY: "re_unit_test_key" }, fetchImpl, now });
    assert.equal(probed.checks.resend.state, "verified");
    assert.equal(calls.filter((call) => call.url === "https://api.resend.com/emails").length, 1);
  });

  it("refuses wallet issuance even when the ledger checks pass", () => {
    const decision = rewardIssuanceDecision({
      qualified: true,
      flags: [],
      amountUsd: 5,
      sameDayCount: 0,
      duplicateReference: false,
      ledgerReferenceUnique: true,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.reasons.includes("issuance_disabled"), true);
    const fraud = rewardIssuanceDecision({
      qualified: false,
      flags: ["self_referral", "duplicate_referred_user"],
      amountUsd: 100,
      sameDayCount: 6,
      duplicateReference: true,
      ledgerReferenceUnique: false,
    });
    assert.equal(fraud.allowed, false);
    for (const reason of ["not_qualified", "self_referral", "duplicate_referred_user", "over_limit", "daily_limit", "duplicate_reference", "ledger_unproven", "issuance_disabled"]) {
      assert.equal(fraud.reasons.includes(reason), true);
    }
  });
});
