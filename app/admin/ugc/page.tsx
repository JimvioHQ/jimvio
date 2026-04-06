'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { UGCCampaign } from '@/types/ugc';

const STATUS_COLORS: Record<string, string> = {
  active:    'text-emerald-400', paused: 'text-amber-400',
  draft:     'text-[var(--color-text-muted)]',   completed: 'text-[var(--color-surface)]lue-400', cancelled: 'text-red-400',
};

export default function AdminUGCPage() {
  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ugc/campaigns?status=all&limit=100')
      .then((r) => r.json())
      .then((j) => setCampaigns(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const byStatus = (s: string) => campaigns.filter((c) => c.status === s).length;
  const totalBudget = campaigns.reduce((a, c) => a + (c.total_budget ?? 0), 0);
  const totalSpent  = campaigns.reduce((a, c) => a + (c.spent_budget ?? 0), 0);
  const totalViews  = campaigns.reduce((a, c) => a + (c.total_views_tracked ?? 0), 0);
  const totalSubs   = campaigns.reduce((a, c) => a + (c.submission_count ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">UGC &amp; Clipping — Admin</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Platform-wide campaign overview</p>
          </div>
          <Link
            href="/admin/ugc/submissions"
            className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-[var(--color-text-primary)] text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            All Submissions
          </Link>
        </div>

        {/* Platform stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Campaigns', value: campaigns.length },
            { label: 'Total Budget',    value: `$${totalBudget.toFixed(0)}` },
            { label: 'Total Spent',     value: `$${totalSpent.toFixed(0)}` },
            { label: 'Total Views',     value: `${(totalViews / 1000).toFixed(1)}K` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-5 text-center">
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{s.value}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {['active','draft','paused','completed','cancelled'].map((s) => (
            <div key={s} className="rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] p-3 text-center">
              <p className={`text-lg font-bold ${STATUS_COLORS[s]}`}>{byStatus(s)}</p>
              <p className="text-[11px] text-[var(--color-text-muted)] opacity-80 capitalize">{s}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl bg-[var(--color-surface-secondary)] animate-pulse" />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                <tr>
                  {['Campaign', 'Brand', 'Type', 'Rate', 'Budget', 'Subs', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] text-[var(--color-text-muted)] font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--color-surface-secondary)] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/vendor/campaigns/${c.id}`} className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-hover)] transition-colors">
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{c.vendor?.business_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/15 text-[var(--color-accent)]">
                        {c.campaign_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-primary)]">${c.rate_per_1k_views}/1K</td>
                    <td className="px-4 py-3 text-[var(--color-text-primary)] text-xs">
                      ${(c.spent_budget ?? 0).toFixed(0)} / ${c.total_budget}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-primary)]">{c.submission_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-medium ${STATUS_COLORS[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
