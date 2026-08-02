import { Award, Briefcase, Building2, ShoppingBag, Sparkles, Star, Users2, Video } from "lucide-react";
import type { IdentityProfilePayload } from "@/lib/identity/types";
import { formatNumber } from "@/lib/utils";
import { IdentityCard, IdentityEmptyState, IdentitySectionHeading, cn } from "@/components/identity/identity-ui";

function formatMoney(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function IdentityOverviewPanel({ payload }: { payload: IdentityProfilePayload }) {
  const { profile, stats } = payload;
  const brands = payload.resume.filter((r) => r.entryType === "brand");
  const categories = Array.from(new Set([...profile.specialties, ...profile.industries]));

  const overallEarnings =
    (stats?.ugc.earningsPaid ?? 0) + (stats?.affiliate.totalEarnings ?? 0) + (stats?.marketplace.totalRevenue ?? 0);

  return (
    <div className="space-y-6">
      {profile.bio ? (
        <IdentityCard className="p-5">
          <IdentitySectionHeading eyebrow="About" title="Bio" className="mb-3" />
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-[#3E3A34]">{profile.bio}</p>
        </IdentityCard>
      ) : null}

      {profile.skills.length > 0 && (
        <IdentityCard className="p-5">
          <IdentitySectionHeading eyebrow="Expertise" title="Skills" className="mb-3" />
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-black/[0.06] bg-black/[0.02] px-2.5 py-1 text-[11.5px] text-[#59544B]"
              >
                {skill}
              </span>
            ))}
          </div>
        </IdentityCard>
      )}

      {categories.length > 0 && (
        <IdentityCard className="p-5">
          <IdentitySectionHeading eyebrow="Focus" title="Specialties & industries" className="mb-3" />
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <span
                key={c}
                className="rounded-full border border-[#FFDCC7] bg-[#FFF1EA] px-2.5 py-1 text-[11.5px] font-medium text-[#D6480F]"
              >
                {c}
              </span>
            ))}
          </div>
        </IdentityCard>
      )}

      {brands.length > 0 && (
        <IdentityCard className="p-5">
          <IdentitySectionHeading eyebrow="Collaborations" title="Brands worked with" className="mb-3" />
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 py-1.5"
              >
                <Building2 className="h-3.5 w-3.5 text-[#9A9388]" />
                <span className="text-[12.5px] font-medium text-[#1C1B19]">{b.title}</span>
              </div>
            ))}
          </div>
        </IdentityCard>
      )}

      <div>
        <IdentitySectionHeading eyebrow="Performance" title="Cross-platform earnings" className="mb-4" />
        {!stats ? (
          <IdentityEmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title="No performance data yet"
            description="Earnings and campaign stats will appear here once activity starts."
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <MetricTile icon={Video} label="UGC earned" value={formatMoney(stats.ugc.earningsPaid)} sub={`${stats.ugc.campaignsCompleted} campaigns completed`} />
            <MetricTile icon={Users2} label="Affiliate earned" value={formatMoney(stats.affiliate.totalEarnings)} sub={`${stats.affiliate.totalConversions} conversions`} />
            <MetricTile icon={ShoppingBag} label="Marketplace revenue" value={formatMoney(stats.marketplace.totalRevenue)} sub={`${stats.marketplace.totalSales} sales`} />
            <MetricTile icon={Sparkles} label="Overall earned" value={formatMoney(overallEarnings)} sub="Across all surfaces" accent />
          </div>
        )}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <StatPill
          icon={Star}
          label="Avg. rating"
          value={profile.reviewCount > 0 ? `${profile.avgRating.toFixed(1)} / 5` : "New"}
          sub={profile.reviewCount > 0 ? `${profile.reviewCount} review${profile.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}
        />
        <StatPill
          icon={ShoppingBag}
          label="Products sold"
          value={stats ? formatNumber(stats.marketplace.totalSales) : "0"}
          sub={stats?.marketplace.isVendor ? `${stats.marketplace.productsCount} listed` : "Not a vendor"}
        />
        <StatPill
          icon={Award}
          label="Community reputation"
          value={stats ? formatNumber(stats.community.totalPoints) : "0"}
          sub={stats && stats.community.communitiesJoined > 0 ? `${stats.community.communitiesJoined} communities` : "Not joined yet"}
        />
      </div>

      {payload.portfolio.length === 0 && brands.length === 0 && !profile.bio && (
        <IdentityEmptyState
          icon={<Briefcase className="h-6 w-6" />}
          title="This profile is just getting started"
          description="Once this creator adds a bio, skills and work, it'll show up here."
        />
      )}
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        accent ? "border-[#FFDCC7] bg-[#FFF1EA]" : "border-black/[0.06] bg-white",
      )}
    >
      <Icon className={cn("mb-2 h-4 w-4", accent ? "text-[#D6480F]" : "text-[#FF5A1F]")} />
      <p className="font-[var(--font-identity-serif)] text-[19px] font-medium text-[#161512]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#9A9388]">{label}</p>
      {sub && <p className="mt-1 text-[10.5px] text-[#B9B3A6]">{sub}</p>}
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF1EA] text-[#D6480F]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-[#1C1B19]">{value}</p>
        <p className="truncate text-[11px] text-[#9A9388]">
          {label}
          {sub ? ` · ${sub}` : ""}
        </p>
      </div>
    </div>
  );
}
