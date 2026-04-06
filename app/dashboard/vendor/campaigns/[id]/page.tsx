'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { UGCCampaign } from '@/types/ugc';

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  draft:     'bg-slate-500/20 text-[var(--color-text-muted)] border-slate-500/30',
  paused:    'bg-amber-500/20 text-amber-400 border-amber-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft:     ['active', 'cancelled'],
  active:    ['paused', 'completed', 'cancelled'],
  paused:    ['active', 'cancelled'],
  completed: [],
  cancelled: [],
};

export default function BrandCampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  async function load() {
    const res = await fetch(`/api/ugc/campaigns/${id}`);
    const json = await res.json();
    setCampaign(json.campaign ?? null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function changeStatus(newStatus: string) {
    setUpdating(true);
    await fetch(`/api/ugc/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    await load();
    setUpdating(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)]">
        Campaign not found
      </div>
    );
  }

  const budgetPct = Math.min(100, ((campaign.spent_budget ?? 0) / (campaign.total_budget || 1)) * 100);
  const earnRate   = campaign.total_views_tracked
    ? ((campaign.spent_budget ?? 0) / (campaign.total_views_tracked / 1000)).toFixed(2)
    : '—';
  const nextStatuses = STATUS_TRANSITIONS[campaign.status] ?? [];

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <Link href="/dashboard/vendor/campaigns" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mt-1">
            ←
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{campaign.title}</h1>
              <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[campaign.status]}`}>
                {campaign.status.toUpperCase()}
              </span>
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-violet-500/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30">
                {campaign.campaign_type.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{campaign.description}</p>
          </div>

          {/* Status transitions */}
          {nextStatuses.length > 0 && (
            <div className="flex gap-2 flex-shrink-0">
              {nextStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={updating}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors disabled:opacity-50 ${
                    s === 'active'    ? 'bg-emerald-600 hover:bg-emerald-500 text-[var(--color-text-primary)]' :
                    s === 'paused'    ? 'bg-amber-600   hover:bg-amber-500   text-[var(--color-text-primary)]' :
                    s === 'cancelled' ? 'bg-red-600     hover:bg-red-500     text-[var(--color-text-primary)]' :
                    s === 'completed' ? 'bg-blue-600    hover:bg-blue-500    text-[var(--color-text-primary)]' :
                    'bg-slate-700 text-[var(--color-text-primary)]'
                  }`}
                >
                  → {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Rate',        value: `$${campaign.rate_per_1k_views}/1K` },
            { label: 'Submissions', value: campaign.submission_count ?? 0 },
            { label: 'Approved',    value: campaign.approved_count ?? 0 },
            { label: 'Views Tracked', value: `${((campaign.total_views_tracked ?? 0) / 1000).toFixed(1)}K` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-5 text-center">
              <p className="text-xl font-bold text-[var(--color-text-primary)]">{s.value}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Budget */}
          <div className="lg:col-span-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] backdrop-blur-sm p-6">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Budget Utilization</h2>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--color-text-muted)]">Spent</span>
              <span className="text-[var(--color-text-primary)] font-medium">
                ${(campaign.spent_budget ?? 0).toFixed(2)} / ${campaign.total_budget.toFixed(2)}
              </span>
            </div>
            <div className="h-3 bg-[var(--color-surface-secondary)] rounded-full overflow-hidden mb-1">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] opacity-80 mb-4">{budgetPct.toFixed(1)}% used • ${(campaign.total_budget - (campaign.spent_budget ?? 0)).toFixed(2)} remaining</p>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Budget',    value: `$${campaign.total_budget.toFixed(2)}` },
                { label: 'Spent Budget',    value: `$${(campaign.spent_budget ?? 0).toFixed(2)}` },
                { label: 'Effective Rate',  value: earnRate === '—' ? '—' : `$${earnRate}/1K` },
              ].map((s) => (
                <div key={s.label} className="bg-[var(--color-surface-secondary)] rounded-xl p-3 text-center">
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">{s.value}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <Link
              href={`/dashboard/vendor/campaigns/${id}/submissions`}
              className="flex items-center justify-between p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-secondary)] transition-all group"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-hover)] transition-colors">Review Queue</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {(campaign.submission_count ?? 0) - (campaign.approved_count ?? 0)} pending
                </p>
              </div>
              <span className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors">→</span>
            </Link>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4 space-y-2">
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-3">Campaign Settings</p>
              <div className="text-xs text-[var(--color-text-muted)] space-y-1.5">
                <div className="flex justify-between">
                  <span>Max per submission</span>
                  <span className="text-[var(--color-text-primary)]">${campaign.max_payout_per_sub ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Requires face</span>
                  <span className="text-[var(--color-text-primary)]">{campaign.requires_face ? 'Yes' : 'No'}</span>
                </div>
                {campaign.starts_at && (
                  <div className="flex justify-between">
                    <span>Start</span>
                    <span className="text-[var(--color-text-primary)]">{new Date(campaign.starts_at).toLocaleDateString()}</span>
                  </div>
                )}
                {campaign.ends_at && (
                  <div className="flex justify-between">
                    <span>End</span>
                    <span className="text-[var(--color-text-primary)]">{new Date(campaign.ends_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
