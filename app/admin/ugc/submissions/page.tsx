'use client';

import { useEffect, useState } from 'react';
import type { UGCSubmission } from '@/types/ugc';

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
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">All Submissions</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Admin view of all influencer content submissions</p>
        </div>

        <div className="flex gap-2 mb-6">
          {['all','pending','approved','rejected'].map(f => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={`px-3 py-1 rounded-none text-xs font-medium capitalize transition-all ${
                status === f ? 'bg-[var(--color-accent)] text-[var(--color-text-primary)]' : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-secondary)]/80 hover:text-[var(--color-text-primary)]'
              }`}
            >
              {f}
            </button>
          ))}
          <span className="ml-auto text-xs text-[var(--color-text-muted)] opacity-80 self-center">{submissions.length} results</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-none animate-pulse bg-[var(--color-surface-secondary)]" />)}
          </div>
        ) : (
          <div className="rounded-none border border-[var(--color-border)] overflow-hidden">
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
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-none ${STATUS_STYLES[sub.status]}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sub.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(sub.id)}
                          className="text-[11px] px-2.5 py-1 rounded-none bg-emerald-600/80 text-[var(--color-text-primary)] hover:bg-emerald-600 transition-colors"
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

