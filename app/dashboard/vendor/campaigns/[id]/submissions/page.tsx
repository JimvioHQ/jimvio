'use client';

import { useEffect, useState } from 'react';
import type { UGCSubmission } from '@/types/ugc';

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-500/20 text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  removed:  'bg-slate-500/20 text-[var(--color-text-muted)] border-slate-500/30',
};

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: '🎵', instagram: '📸', youtube: '▶️', x: '✖️',
};

function RejectModal({
  submissionId,
  onClose,
  onRejected,
}: {
  submissionId: string;
  onClose: () => void;
  onRejected: () => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReject() {
    setLoading(true);
    await fetch(`/api/ugc/submissions/${submissionId}/reject`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'Does not meet campaign requirements' }),
    });
    setLoading(false);
    onRejected();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl border border-[var(--color-border)] bg-[#0f1422] p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Reject Submission</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Reason for rejection (optional)..."
          className="w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] opacity-60 focus:outline-none focus:border-red-500 resize-none mb-4"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] text-sm hover:bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-secondary)]/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-red-600 text-[var(--color-text-primary)] text-sm font-medium hover:bg-red-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BrandSubmissionReviewPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [k: string]: string }>;
}) {
  // This page is used as /dashboard/vendor/campaigns/[id]/submissions
  const [campaignId, setCampaignId] = useState<string>('');

  useEffect(() => {
    paramsPromise.then(p => setCampaignId(p.id));
  }, [paramsPromise]);
  const [submissions, setSubmissions] = useState<UGCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadSubmissions() {
    setLoading(true);
    const params = new URLSearchParams({ campaignId, limit: '50' });
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const res = await fetch(`/api/ugc/submissions?${params}`);
    const json = await res.json();
    setSubmissions(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadSubmissions(); }, [statusFilter]);

  async function handleApprove(id: string) {
    setActionLoading(id);
    await fetch(`/api/ugc/submissions/${id}/approve`, { method: 'PATCH' });
    setActionLoading(null);
    loadSubmissions();
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {rejectTarget && (
        <RejectModal
          submissionId={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={loadSubmissions}
        />
      )}

      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Submission Review Queue</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Review and approve influencer content submissions</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                statusFilter === f
                  ? 'bg-[var(--color-accent)] text-[var(--color-text-primary)]'
                  : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-secondary)]/80 hover:text-[var(--color-text-primary)]'
              }`}
            >
              {f}
              {f === 'pending' && submissions.filter((s) => s.status === 'pending').length > 0 && (
                <span className="ml-1.5 bg-amber-500 text-[var(--color-text-primary)] text-[10px] px-1.5 py-0.5 rounded-full">
                  {submissions.filter((s) => s.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-[var(--color-surface-secondary)] animate-pulse" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20 text-[var(--color-text-muted)] opacity-80">
            <div className="text-[var(--color-surface)]xl mb-3">✅</div>
            <p className="text-[var(--color-text-muted)] font-medium">No submissions in this status</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] backdrop-blur-sm p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl flex-shrink-0 mt-0.5">{PLATFORM_ICONS[sub.platform] ?? '🌐'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {sub.influencer?.display_name ?? 'Influencer'}
                      </p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_STYLES[sub.status]}`}>
                        {sub.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] opacity-80 ml-auto">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <a
                      href={sub.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] truncate block mb-2 transition-colors"
                    >
                      {sub.post_url}
                    </a>
                    {sub.caption && (
                      <p className="text-xs text-[var(--color-text-muted)] mb-2 line-clamp-2">{sub.caption}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)] opacity-80">
                      <span>👁 {(sub.total_views_earned ?? 0).toLocaleString()}</span>
                      <span>💰 ${(sub.total_earnings ?? 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {sub.status === 'pending' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(sub.id)}
                        disabled={actionLoading === sub.id}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 text-[var(--color-text-primary)] text-xs font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === sub.id ? '...' : '✓ Approve'}
                      </button>
                      <button
                        onClick={() => setRejectTarget(sub.id)}
                        className="px-4 py-1.5 rounded-xl bg-red-600/80 text-[var(--color-text-primary)] text-xs font-medium hover:bg-red-600 transition-colors"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                </div>

                {sub.rejection_reason && (
                  <div className="mt-3 px-3 py-2 rounded-xl bg-red-900/15 border border-red-500/20 text-xs text-red-300">
                    Rejection reason: {sub.rejection_reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
