'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, XCircle, Clock, 
  ExternalLink, User, Video, 
  Search, Filter, ChevronRight,
  MoreVertical, RefreshCcw, Loader2
} from 'lucide-react';
import type { UGCSubmission } from '@/types/ugc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-500/10 text-amber-500 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function VendorSubmissionsPage() {
  const [submissions, setSubmissions] = useState<UGCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [refreshing, setRefreshing] = useState(false);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ugc/submissions?status=${statusFilter === 'all' ? '' : statusFilter}`);
      if (res.ok) {
        const json = await res.json();
        setSubmissions(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/ugc/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Submission ${status} successfully`);
        loadSubmissions();
      } else {
        toast.error('Failed to update status');
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]">Submission Review</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Approve or reject creator content links</p>
        </div>
        <div className="flex items-center gap-2">
          {['pending', 'approved', 'rejected', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all border ${
                statusFilter === f
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)]/50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--color-text-muted)] opacity-50 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Loading submissions...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-24 bg-[var(--color-surface-secondary)]/30 border border-dashed border-[var(--color-border)] rounded-3xl">
          <div className="text-4xl mb-4 opacity-20">📥</div>
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">No submissions found</h3>
          <p className="text-sm text-[var(--color-text-muted)]">New influencer submissions will appear here for review</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {submissions.map((sub) => {
            const StatusIcon = STATUS_ICONS[sub.status] || Clock;
            return (
              <div 
                key={sub.id} 
                className="group bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-accent)]/50 transition-all shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  {/* Creator Info */}
                  <div className="flex items-center gap-3 min-w-[240px]">
                    <div className="w-12 h-12 rounded-xl bg-violet-600/10 flex items-center justify-center text-violet-500 font-bold text-lg">
                      {sub.influencer?.display_name?.[0] || 'C'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[var(--color-text-primary)] truncate">
                        {sub.influencer?.display_name || 'Anonymous Creator'}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mt-0.5">
                        {sub.platform} · {new Date(sub.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Campaign & Link */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">
                      Campaign: <span className="text-[var(--color-text-primary)] font-bold">{sub.campaign?.title}</span>
                    </p>
                    <a 
                      href={sub.post_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-[var(--color-accent)] font-medium hover:underline group/link"
                    >
                      <Video className="w-4 h-4" />
                      View Content Link
                      <ExternalLink className="w-3 h-3 translate-y-[-1px] opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </a>
                  </div>

                  {/* Earnings Potential */}
                  <div className="hidden lg:block text-center px-6 border-x border-[var(--color-border)]/50">
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1">Rate</p>
                    <p className="text-sm font-black text-emerald-500">
                      ${sub.campaign?.rate_per_1k_views}/1k views
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`h-8 px-4 font-bold border ${STATUS_COLORS[sub.status]}`}>
                      <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                      {sub.status.toUpperCase()}
                    </Badge>

                    {sub.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleUpdateStatus(sub.id, 'rejected')}
                          className="h-9 px-4 rounded-xl text-red-500 hover:bg-red-500/10"
                        >
                          Reject
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateStatus(sub.id, 'approved')}
                          className="h-9 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                        >
                          Approve
                        </Button>
                      </div>
                    )}

                    <div className="ml-2">
                      <Button variant="ghost" size="icon" className="rounded-xl text-[var(--color-text-muted)]">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
