/**
 * Production error monitoring bootstrap (Sentry-ready).
 *
 * Standby mode when DSN/secrets are missing or @sentry/nextjs is not installed.
 * When ready: npm i @sentry/nextjs, set SENTRY_DSN, then optional SDK configs can call
 * into this module. Boot always remains safe for CI and local builds.
 */

type MonitoringContext = Record<string, unknown>;

export function isMonitoringConfigured(): boolean {
  return Boolean(
    process.env.SENTRY_DSN ||
      process.env.NEXT_PUBLIC_SENTRY_DSN ||
      process.env.JIMVIO_ERROR_MONITORING_DSN
  );
}

export async function initProductionMonitoring(): Promise<void> {
  if (!isMonitoringConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.info(
        "[monitoring] No SENTRY_DSN configured — error monitoring standby. Set SENTRY_DSN (and install @sentry/nextjs) to enable."
      );
    }
    return;
  }

  // Optional SDK load without static dependency (package may be absent).
  try {
    const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<{
      init?: (options: Record<string, unknown>) => void;
    }>;
    const Sentry = await dynamicImport("@sentry/nextjs");
    if (typeof Sentry.init === "function") {
      Sentry.init({
        dsn:
          process.env.SENTRY_DSN ||
          process.env.NEXT_PUBLIC_SENTRY_DSN ||
          process.env.JIMVIO_ERROR_MONITORING_DSN,
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
        release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
      });
      console.info("[monitoring] Sentry initialized");
      return;
    }
  } catch {
    // package missing or init failed
  }

  console.warn(
    "[monitoring] SENTRY_DSN is set but @sentry/nextjs is not available — install the package to activate remote error monitoring."
  );
}

export function captureProductionException(error: unknown, context?: MonitoringContext): void {
  console.error("[monitoring]", error, context || {});
}
