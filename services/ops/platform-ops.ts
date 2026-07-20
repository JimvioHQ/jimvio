import { getAdminDB } from "@/services/base";
import { getSystemAnalysisData } from "@/services/admin/getSystemAnalysis";

export async function getPlatformOperations() {
  const admin = getAdminDB() as any;
  const since24h = new Date(Date.now() - 86_400_000).toISOString();
  const [analysis, users, orders, flags, reports, alerts] = await Promise.all([
    getSystemAnalysisData(),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since24h),
    admin.from("orders").select("id", { count: "exact", head: true }).gte("created_at", since24h),
    admin.from("platform_feature_flags").select("key", { count: "exact", head: true }).eq("enabled", true),
    admin.from("ugc_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("ops_alert_events").select("*").is("resolved_at", null).order("created_at", { ascending: false }).limit(8),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    health: { score: analysis.healthScore, label: analysis.healthLabel },
    users24h: users.count ?? 0,
    orders24h: orders.count ?? 0,
    failedWebhooks24h: analysis.webhooks24h.failed,
    failedWalletCredits: analysis.unresolvedFailedCredits,
    cronSecretPresent: Boolean(process.env.CRON_SECRET),
    liveHealthConfigured: Boolean(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
    enabledFeatureFlags: flags.count ?? 0,
    openReports: reports.count ?? 0,
    recentAlerts: alerts.data ?? [],
  };
}
