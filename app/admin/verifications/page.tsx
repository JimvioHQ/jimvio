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
import { EmptyState } from "@/components/ui/admin";
import { Store, Video } from "lucide-react";
import Link from "next/link";

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

    const allowedPlatforms = ["all", "tiktok", "instagram", "youtube", "x"];
    const platformFilter = allowedPlatforms.includes(sp.platform ?? "")
        ? (sp.platform as "all" | "tiktok" | "instagram" | "youtube" | "x")
        : undefined;

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

    const buckets = vendorData.reduce(
        (acc: any, v: any) => {
            if (!v.created_at) return acc;
            const days = Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86_400_000);
            if (days >= 14)     acc.critical++;
            else if (days >= 7) acc.aging++;
            else if (days >= 3) acc.watching++;
            else                acc.fresh++;
            return acc;
        },
        { critical: 0, aging: 0, watching: 0, fresh: 0 },
    );

    const oldestDays = vendorData.length
        ? Math.floor(
            Math.max(...vendorData.map((v: any) =>
                v.created_at ? Date.now() - new Date(v.created_at).getTime() : 0
            )) / 86_400_000,
        )
        : 0;

    const activeCount =
        tab === "vendors"  ? vendorData.length
        : tab === "creators" ? creatorData.length
        : tab === "ugc"      ? ugcData.length
        : reportData.length;

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-[var(--color-border)]/60">
                <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1.5">
                        Admin
                    </p>
                    <h1 className="text-[22px] font-medium tracking-tight text-[var(--color-text-primary)] leading-tight">
                        Review queue
                    </h1>
                    <p className="text-[13px] text-[var(--color-text-muted)] mt-1">
                        {activeCount === 0
                            ? "Nothing waiting in this tab."
                            : tab === "vendors" && oldestDays >= 7
                                ? <>Oldest vendor waiting <strong className="text-rose-600 font-semibold">{oldestDays} days</strong>. {activeCount} total.</>
                                : <>{activeCount} item{activeCount !== 1 ? "s" : ""} waiting.</>
                        }
                    </p>
                </div>

                {/* Aging chips — vendors only */}
                {tab === "vendors" && vendorData.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {buckets.critical > 0 && <AgingChip n={buckets.critical} label="14d+" tone="critical" />}
                        {buckets.aging    > 0 && <AgingChip n={buckets.aging}    label="7–13d" tone="aging" />}
                        {buckets.watching > 0 && <AgingChip n={buckets.watching} label="3–6d"  tone="watching" />}
                        {buckets.fresh    > 0 && <AgingChip n={buckets.fresh}    label="< 3d"  tone="fresh" />}
                    </div>
                )}
            </div>

            {/* ── Tabs ── */}
            <VerificationTabs current={tab} counts={counts} />

            {/* ── Filters ── */}
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

            {/* ── Content ── */}
            {tab === "vendors" && (
                vendorData.length === 0
                    ? <EmptyState
                        icon={<Store className="h-5 w-5 text-[var(--color-text-muted)]" />}
                        title="Queue is clear"
                        message={sp.q || sp.country ? "No matches for these filters." : "No vendors are pending review."}
                    />
                    : <VerificationTable vendors={vendorData} />
            )}
            {tab === "creators" && (
                creatorData.length === 0
                    ? <EmptyState
                        icon={<Store className="h-5 w-5 text-[var(--color-text-muted)]" />}
                        title="No pending creators"
                        message="No creator applications awaiting review."
                    />
                    : <CreatorsTable creators={creatorData} />
            )}
            {tab === "ugc" && (
                ugcData.length === 0
                    ? <EmptyState
                        icon={<Video className="h-5 w-5 text-[var(--color-text-muted)]" />}
                        title="No pending submissions"
                        message="All UGC submissions have been reviewed."
                    />
                    : <UGCSubmissionsTable submissions={ugcData} />
            )}
            {tab === "reports" && (
                reportData.length === 0
                    ? <EmptyState
                        icon={<Store className="h-5 w-5 text-[var(--color-text-muted)]" />}
                        title="No pending reports"
                        message="No reports awaiting review."
                    />
                    : <ReportsTable reports={reportData} />
            )}
        </div>
    );
}

// ── Platform filter ───────────────────────────────────────────────────────────

function PlatformFilter({ current }: { current: string }) {
    const platforms = ["all", "tiktok", "instagram", "youtube", "x"];
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {platforms.map((p) => {
                const active = current === p;
                return (
                    <Link
                        key={p}
                        href={`?tab=ugc&platform=${p}`}
                        className={[
                            "h-7 px-3 inline-flex items-center rounded-full text-[12px] font-medium capitalize transition-all select-none",
                            active
                                ? "bg-[var(--color-text-primary)] text-[var(--color-surface)] ring-0"
                                : "bg-[var(--color-surface)] ring-[0.5px] ring-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
                        ].join(" ")}
                    >
                        {p}
                    </Link>
                );
            })}
        </div>
    );
}

// ── Aging chip ────────────────────────────────────────────────────────────────

const AGING_STYLES = {
    critical: "bg-rose-500/[0.08]   text-rose-600   border-rose-500/20   dark:text-rose-400",
    aging:    "bg-orange-500/[0.08] text-orange-600 border-orange-500/20 dark:text-orange-400",
    watching: "bg-amber-500/[0.08]  text-amber-600  border-amber-500/20  dark:text-amber-400",
    fresh:    "bg-slate-500/[0.08]  text-slate-500  border-slate-500/20  dark:text-slate-400",
} as const;

function AgingChip({ n, label, tone }: {
    n: number; label: string; tone: keyof typeof AGING_STYLES;
}) {
    return (
        <div className={`inline-flex items-baseline gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] ${AGING_STYLES[tone]}`}>
            <span className="font-bold tabular-nums">{n}</span>
            <span className="opacity-70 text-[11px]">{label}</span>
        </div>
    );
}