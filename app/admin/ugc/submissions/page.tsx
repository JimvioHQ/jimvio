'use client';

import { useEffect, useState } from 'react';
import type { UGCSubmission } from '@/types/ugc';
import { TabCountBadge } from '@/components/ui/tab-count-badge';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-500/20 text-amber-400',
  approved: 'bg-emerald-500/20 text-emerald-400',
  rejected: 'bg-red-500/20 text-red-400',
  removed:  'bg-slate-500/20 text-[var(--color-text-muted)]',
};

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: '🎵', instagram: '📸', youtube: 'â–¶ï¸', x: '✓–ï¸',
};

export default function AdminAllSubmissionsPage() {
  const [submissions, setSubmissions] = useState<UGCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    async function loadCounts() {
      const entries = await Promise.all(
        (['all', 'pending', 'approved', 'rejected'] as const).map(async (key) => {
          const p = new URLSearchParams({ limit: '1' });
          if (key !== 'all') p.set('status', key);
          const res = await fetch(`/api/ugc/submissions?${p}`);
          const json = await res.json();
          return [key, Number(json.total ?? 0)] as const;
        })
      );
      setCounts(Object.fromEntries(entries));
    }
    loadCounts();
  }, []);

  useEffect(() => {
    const p = new URLSearchParams({ limit: '100' });
    if (status !== 'all') p.set('status', status);
    setLoading(true);
    fetch(`/api/ugc/submissions?${p}`)
      .then(r => r.json())
      .then(j => setSubmissions(j.data ?? []))
      .finally(() => setLoading(false));
  }, [status]);

  async function handleApprove(id: string) {
    await fetch(`/api/ugc/submissions/${id}/approve`, { method: 'PATCH' });
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
    setCounts((c) => ({
      ...c,
      pending: Math.max(0, (c.pending ?? 0) - 1),
      approved: (c.approved ?? 0) + 1,
    }));
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">All Submissions</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Admin view of all influencer content submissions</p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap items-center">
          {(['all','pending','approved','rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all border",
                status === f
                  ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                  : "bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {f}
              <TabCountBadge
                count={counts[f] ?? 0}
                active={status === f}
                warn={f === 'pending'}
              />
            </button>
          ))}
          <span className="ml-auto text-xs text-[var(--color-text-muted)] opacity-80 self-center">
            {submissions.length} shown
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-sm animate-pulse bg-[var(--color-surface-secondary)]" />)}
          </div>
        ) : (
          <div className="rounded-sm border border-[var(--color-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                <tr>
                  {['Platform','Creator','Campaign','URL','Views','Earnings','Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] text-[var(--color-text-muted)] font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {submissions.map(sub => (
                  <tr key={sub.id} className="hover:bg-[var(--color-surface-secondary)] transition-colors">
                    <td className="px-4 py-3 text-lg">{PLATFORM_ICONS[sub.platform] ?? 'ðŸŒ'}</td>
                    <td className="px-4 py-3 text-[var(--color-text-primary)] text-xs">{sub.influencer?.display_name ?? '—'}</td>
                    <td className="px-4 py-3 text-[var(--color-text-primary)] text-xs max-w-[140px] truncate">{sub.campaign?.title ?? '—'}</td>
                    <td className="px-4 py-3">
                      <a href={sub.post_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors max-w-[160px] truncate block">
                        {sub.post_url}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-primary)] text-xs">{(sub.total_views_earned ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[var(--color-text-primary)] text-xs">${(sub.total_earnings ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-sm ${STATUS_STYLES[sub.status]}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sub.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(sub.id)}
                          className="text-[11px] px-2.5 py-1 rounded-sm bg-emerald-600/80 text-[var(--color-text-primary)] hover:bg-emerald-600 transition-colors"
                        >
                          Approve
                        </button>
                      )}
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

