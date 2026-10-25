import { googleAdsMissing, metaAdsMissing, readGoogleAdsCustomer, readMetaAdAccount, spendGate } from "./ads-connectivity";
import { readResendDomains } from "./resend-probe";
import { searchConsoleReadSummary } from "./search-console-log";
import { readSearchConsoleSurface } from "./search-console";
import type { IntegrationCheck, IntegrationChecks, MeasuredSignals } from "./types";

function check(state: IntegrationCheck["state"], detail: string, checkedAt: string | null): IntegrationCheck {
  return { state, detail: detail.slice(0, 240), checkedAt };
}

export function uncheckedIntegrations(now?: Date): IntegrationChecks {
  const at = now ? now.toISOString() : null;
  return {
    searchConsole: check("missing", "Set GOOGLE_SEARCH_CONSOLE_SITE_URL and GOOGLE_SEARCH_CONSOLE_CREDENTIALS.", at),
    resend: check("missing", "RESEND_API_KEY is not set for this process.", at),
    googleAds: check("missing", "Set GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_DEVELOPER_TOKEN, and GOOGLE_ADS_ACCESS_TOKEN.", at),
    metaAds: check("missing", "Set META_ADS_ACCOUNT_ID and META_ADS_ACCESS_TOKEN.", at),
  };
}

function failed(detail: string, at: string): IntegrationCheck {
  return check("failed", detail, at);
}

export async function probeIntegrations(input: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: Date;
} = {}): Promise<{ checks: IntegrationChecks; searchConsoleReport?: MeasuredSignals["searchConsoleReport"] }> {
  const env = input.env ?? process.env;
  const now = input.now ?? new Date();
  const at = now.toISOString();
  const fetchImpl = input.fetchImpl;
  const attempts = 2;
  const spend = spendGate(env);

  const searchPromise = readSearchConsoleSurface({ env, fetchImpl, now, attempts });
  const resendPromise = readResendDomains({ env, fetchImpl, attempts });
  const googlePromise = readGoogleAdsCustomer({ env, fetchImpl, attempts });
  const metaPromise = readMetaAdAccount({ env, fetchImpl, attempts });
  const [search, resend, google, meta] = await Promise.all([searchPromise, resendPromise, googlePromise, metaPromise]);

  let searchCheck: IntegrationCheck;
  let searchConsoleReport: MeasuredSignals["searchConsoleReport"];
  if (search.ok) {
    searchCheck = check(
      "verified",
      searchConsoleReadSummary({
        status: "read",
        rowCount: search.queries.length,
        pageRows: search.pages,
        pageRead: search.pageRead,
      }),
      at,
    );
    searchConsoleReport = {
      status: "read",
      rowCount: search.queries.length,
      queries: search.queries.map((row) => row.query),
      queryRows: search.queries.map((row) => ({
        query: row.query,
        clicks: row.clicks,
        impressions: row.impressions,
        position: row.position,
      })),
      pageRows: search.pages.map((row) => ({
        page: row.page,
        clicks: row.clicks,
        impressions: row.impressions,
        position: row.position,
      })),
      pageRead: search.pageRead,
    };
  } else if (search.code === "missing") {
    searchCheck = check("missing", "Set GOOGLE_SEARCH_CONSOLE_SITE_URL and GOOGLE_SEARCH_CONSOLE_CREDENTIALS. The credential is a service-account JSON key with the Search Console readonly scope.", null);
  } else {
    searchCheck = failed(`Search Console read failed (${search.code}). No query demand was recorded.`, at);
    searchConsoleReport = { status: "failed", rowCount: 0, queries: [], code: search.code };
  }

  let resendCheck: IntegrationCheck;
  if (resend.ok) {
    resendCheck = check("verified", `Resend accepted a domains read (${resend.domainCount} domains). No message was sent.`, at);
  } else if (resend.code === "missing") {
    resendCheck = check("missing", "RESEND_API_KEY is not set for this process. This engine does not send marketing email.", null);
  } else {
    resendCheck = failed(`Resend domains read failed (${resend.code}). No message was sent.`, at);
  }

  const googleMissing = googleAdsMissing(env);
  let googleCheck: IntegrationCheck;
  if (google.ok) {
    googleCheck = check("verified", `Google Ads customer ${google.accountId} was read. ${spend.reason}`, at);
  } else if (google.code === "missing") {
    googleCheck = check("missing", `Set ${googleMissing.join(", ")}. A customer id alone does not spend. ${spend.reason}`, null);
  } else {
    googleCheck = failed(`Google Ads read failed (${google.code}). ${spend.reason}`, at);
  }

  const metaMissing = metaAdsMissing(env);
  let metaCheck: IntegrationCheck;
  if (meta.ok) {
    const cap = meta.providerSpendCap ? ` Provider spend cap field: ${meta.providerSpendCap}.` : "";
    metaCheck = check("verified", `Meta ad account ${meta.accountId} was read.${cap} ${spend.reason}`, at);
  } else if (meta.code === "missing") {
    metaCheck = check("missing", `Set ${metaMissing.join(", ")}. An account id alone does not spend. ${spend.reason}`, null);
  } else {
    metaCheck = failed(`Meta ads read failed (${meta.code}). ${spend.reason}`, at);
  }

  return {
    checks: { searchConsole: searchCheck, resend: resendCheck, googleAds: googleCheck, metaAds: metaCheck },
    searchConsoleReport,
  };
}
