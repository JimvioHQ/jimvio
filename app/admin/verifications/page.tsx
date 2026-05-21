

// app/admin/verifications/page.tsx
import React from "react";
import {
  getPendingVendors,
  getPendingCreators,
  getPendingUGCSubmissions,
  getPendingReports,
  getVerificationCounts,
  getVendorCountries,
} from "@/services/db";
import { VerificationTable } from "@/components/admin/verification-table";
import { VerificationTabs } from "@/components/admin/verification-tabs";
import { VerificationFilters } from "@/components/admin/verification-filters";
import { CreatorsTable } from "@/components/admin/creators-table";
import { UGCSubmissionsTable } from "@/components/admin/ugc-submissions-table";
import { ReportsTable } from "@/components/admin/reports-table";

export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    country?: string;
    sort?: string;
    age?: string;
    platform?: string;
  }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab ?? "vendors";

  // Ensure `platform` matches the allowed values expected by the DB helper
  const allowedPlatforms = ["all", "tiktok", "instagram", "youtube", "x"];
  const platformFilter = allowedPlatforms.includes(sp.platform ?? "")
    ? (sp.platform as "all" | "tiktok" | "instagram" | "youtube" | "x")
    : undefined;

  // Run counts + active-tab query in parallel
  const [counts, countries, vendorData, creatorData, ugcData, reportData] =
    await Promise.all([
      getVerificationCounts(),
      getVendorCountries(),
      tab === "vendors"
        ? getPendingVendors({
            q: sp.q,
            country: sp.country,
            sort: sp.sort ?? "oldest",
            minAgeDays: sp.age ? Number(sp.age) : undefined,
          })
        : Promise.resolve([]),
      tab === "creators"
        ? getPendingCreators({ q: sp.q, sort: sp.sort ?? "oldest" })
        : Promise.resolve([]),
      tab === "ugc"
        ? getPendingUGCSubmissions({ sort: sp.sort ?? "oldest", platform: platformFilter })
        : Promise.resolve([]),
      tab === "reports"
        ? getPendingReports({ sort: sp.sort ?? "oldest" })
        : Promise.resolve([]),
    ]);

  // Aging buckets — vendors only
  const buckets = vendorData.reduce(
    (acc: any, v: any) => {
      if (!v.created_at) return acc;
      const days = Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86_400_000);
      if (days >= 14) acc.critical++;
      else if (days >= 7) acc.aging++;
      else if (days >= 3) acc.watching++;
      else acc.fresh++;
      return acc;
    },
    { critical: 0, aging: 0, watching: 0, fresh: 0 }
  );

  const oldestDays =
    vendorData.length
      ? Math.floor(
          Math.max(
            ...vendorData.map((v: any) =>
              v.created_at ? Date.now() - new Date(v.created_at).getTime() : 0
            )
          ) / 86_400_000
        )
      : 0;

  const activeCount =
    tab === "vendors"  ? vendorData.length
    : tab === "creators" ? creatorData.length
    : tab === "ugc"      ? ugcData.length
    : reportData.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, color: "var(--color-text-primary)" }}>
            Review queue
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted, #888)", margin: "2px 0 0" }}>
            {activeCount === 0
              ? "Nothing waiting in this tab."
              : tab === "vendors" && oldestDays >= 7
                ? <>Oldest vendor waiting <strong style={{ color: "#dc2626" }}>{oldestDays} days</strong>. {activeCount} total.</>
                : <>{activeCount} item{activeCount !== 1 ? "s" : ""} waiting.</>}
          </p>
        </div>

        {tab === "vendors" && vendorData.length > 0 && (
          <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
            {buckets.critical > 0 && <AgingChip n={buckets.critical} label="14d+" tone="critical" />}
            {buckets.aging    > 0 && <AgingChip n={buckets.aging}    label="7–13d" tone="aging" />}
            {buckets.watching > 0 && <AgingChip n={buckets.watching} label="3–6d"  tone="watching" />}
            {buckets.fresh    > 0 && <AgingChip n={buckets.fresh}    label="< 3d"  tone="fresh" />}
          </div>
        )}
      </header>

      {/* Tabs — now with real counts */}
      <VerificationTabs current={tab} counts={counts} />

      {/* Filters */}
      {tab === "vendors" && (
        <VerificationFilters
          q={sp.q ?? ""}
          country={sp.country ?? ""}
          sort={sp.sort ?? "oldest"}
          age={sp.age ?? ""}
          countries={countries}
        />
      )}
      {tab === "creators" && (
        <VerificationFilters
          q={sp.q ?? ""}
          country=""
          sort={sp.sort ?? "oldest"}
          age=""
          countries={[]}
        />
      )}
      {tab === "ugc" && (
        <PlatformFilter current={sp.platform ?? "all"} />
      )}

      {/* Content */}
      {tab === "vendors" && (
        vendorData.length === 0
          ? <EmptyState message={sp.q || sp.country ? "No matches for these filters." : "Queue is clear."} />
          : <VerificationTable vendors={vendorData} />
      )}
      {tab === "creators" && (
        creatorData.length === 0
          ? <EmptyState message="No pending creator applications." />
          : <CreatorsTable creators={creatorData} />
      )}
      {tab === "ugc" && (
        ugcData.length === 0
          ? <EmptyState message="No pending UGC submissions." />
          : <UGCSubmissionsTable submissions={ugcData} />
      )}
      {tab === "reports" && (
        reportData.length === 0
          ? <EmptyState message="No pending reports." />
          : <ReportsTable reports={reportData} />
      )}
    </div>
  );
}

// ── Platform filter for UGC tab ───────────────────────────────────────────────
function PlatformFilter({ current }: { current: string }) {
  const platforms = ["all", "tiktok", "instagram", "youtube", "x"];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {platforms.map((p) => (
        <a
          key={p}
          href={`?tab=ugc&platform=${p}`}
          style={{
            height: 28, padding: "0 12px", borderRadius: 5, fontSize: 12, fontWeight: 500,
            display: "inline-flex", alignItems: "center", textDecoration: "none",
            border: `0.5px solid ${current === p ? "var(--color-text-primary)" : "var(--color-border)"}`,
            background: current === p ? "var(--color-text-primary)" : "transparent",
            color: current === p ? "var(--color-bg, #fff)" : "var(--color-text-secondary)",
            textTransform: "capitalize",
          }}
        >
          {p}
        </a>
      ))}
    </div>
  );
}

function AgingChip({ n, label, tone }: { n: number; label: string; tone: "critical" | "aging" | "watching" | "fresh" }) {
  const colors = {
    critical: { bg: "rgba(220,38,38,0.08)", fg: "#dc2626", border: "rgba(220,38,38,0.2)" },
    aging:    { bg: "rgba(234,88,12,0.08)", fg: "#ea580c", border: "rgba(234,88,12,0.2)" },
    watching: { bg: "rgba(217,119,6,0.08)", fg: "#d97706", border: "rgba(217,119,6,0.2)" },
    fresh:    { bg: "rgba(100,116,139,0.08)", fg: "#475569", border: "rgba(100,116,139,0.2)" },
  }[tone];
  return (
    <div style={{
      display: "inline-flex", alignItems: "baseline", gap: 5, padding: "5px 10px",
      borderRadius: 6, background: colors.bg, border: `0.5px solid ${colors.border}`,
    }}>
      <span style={{ fontWeight: 700, color: colors.fg, fontSize: 13 }}>{n}</span>
      <span style={{ color: colors.fg, opacity: 0.7, fontSize: 11 }}>{label}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      padding: "44px 24px", textAlign: "center",
      border: "0.5px dashed var(--color-border)",
      borderRadius: 10, color: "var(--color-text-muted, #888)", fontSize: 13,
    }}>
      {message}
    </div>
  );
}