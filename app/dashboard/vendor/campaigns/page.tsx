'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { UGCCampaign } from '@/types/ugc';

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  draft:     'bg-slate-500/20   text-[var(--color-text-muted)]   border-slate-500/30',
  paused:    'bg-amber-500/20   text-amber-400   border-amber-500/30',
  completed: 'bg-blue-500/20    text-[var(--color-surface)]lue-400    border-blue-500/30',
  cancelled: 'bg-red-500/20     text-red-400     border-red-500/30',
};

export default function BrandCampaignsPage() {
  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ugc/campaigns?status=all&limit=50')
      .then((r) => r.json())
      .then((j) => setCampaigns(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const totalSpent = campaigns.reduce((s, c) => s + (c.spent_budget ?? 0), 0);
  const totalBudget = campaigns.reduce((s, c) => s + (c.total_budget ?? 0), 0);
  const totalViews  = campaigns.reduce((s, c) => s + (c.total_views_tracked ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">My Campaigns</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Manage your UGC &amp; Clipping campaigns</p>
          </div>
          <Link
            href="/dashboard/vendor/campaigns/new"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] text-[var(--color-text-primary)] text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-violet-900/30"
          >
            + New Campaign
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Campaigns', value: campaigns.length },
            { label: 'Total Budget Used', value: `$${totalSpent.toFixed(0)} / $${totalBudget.toFixed(0)}` },
            { label: 'Total Views', value: `${(totalViews / 1000).toFixed(1)}K` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-5 text-center">
              <p className="text-xl font-bold text-[var(--color-text-primary)]">{s.value}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-[var(--color-surface-secondary)] animate-pulse" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🚀</div>
            <p className="text-[var(--color-text-muted)] text-lg font-medium">No campaigns yet</p>
            <p className="text-[var(--color-text-muted)] opacity-80 text-sm mt-1">Create your first campaign to start getting UGC content</p>
            <Link
              href="/dashboard/vendor/campaigns/new"
              className="inline-block mt-5 px-6 py-2.5 rounded-xl bg-[var(--color-accent)] text-[var(--color-text-primary)] text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Create Campaign →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const pct = Math.min(100, ((c.spent_budget ?? 0) / (c.total_budget || 1)) * 100);
              return (
                <div key={c.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-5 hover:bg-[var(--color-surface-secondary)] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[var(--color-text-primary)] truncate">{c.title}</h3>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_STYLES[c.status]}`}>
                          {c.status.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] opacity-80 bg-[var(--color-surface-secondary)] px-2 py-0.5 rounded-full">
                          {c.campaign_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)] mb-3">
                        <span>${c.rate_per_1k_views}/1K views</span>
                        <span>{c.submission_count ?? 0} submissions</span>
                        <span>{c.approved_count ?? 0} approved</span>
                        <span>{((c.total_views_tracked ?? 0) / 1000).toFixed(1)}K views</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[var(--color-surface-secondary)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
                          ${(c.spent_budget ?? 0).toFixed(0)} / ${c.total_budget.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Link
                        href={`/dashboard/vendor/campaigns/${c.id}/submissions`}
                        className="px-3 py-1.5 rounded-xl bg-violet-600/80 text-[var(--color-text-primary)] text-xs font-medium hover:bg-[var(--color-accent)] transition-colors text-center"
                      >
                        Review Queue
                        {(c.submission_count ?? 0) > (c.approved_count ?? 0) && (
                          <span className="ml-1.5 bg-amber-500 text-[var(--color-text-primary)] text-[10px] px-1.5 py-0.5 rounded-full">
                            {(c.submission_count ?? 0) - (c.approved_count ?? 0)}
                          </span>
                        )}
                      </Link>
                      <Link
                        href={`/dashboard/vendor/campaigns/${c.id}`}
                        className="px-3 py-1.5 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] text-xs font-medium hover:bg-[var(--color-surface-secondary)] transition-colors text-center"
                      >
                        View Stats
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
