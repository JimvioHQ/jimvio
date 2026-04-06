'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, XCircle, Clock, 
  ExternalLink, Video, Check,
  Search, Filter, Play,
  MoreVertical, RefreshCcw, Loader2, Sparkles, AlertCircle, Calendar
} from 'lucide-react';
import type { UGCSubmission } from '@/types/ugc';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const STATUS_CONFIG: Record<string, { icon: any, color: string, bg: string, label: string }> = {
  pending:  { icon: Clock,        color: 'text-amber-500',   bg: 'bg-amber-500/10',    label: 'Pending Review' },
  approved: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10',  label: 'Approved' },
  rejected: { icon: XCircle,      color: 'text-red-500',     bg: 'bg-red-500/10',      label: 'Rejected' },
};

function formatCompactNumber(number: number) {
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(number);
}

export default function VendorSubmissionsPage() {
  const [submissions, setSubmissions] = useState<UGCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

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
    setProcessingId(id);
    try {
      const res = await fetch(`/api/ugc/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Content asset successfully ${status}!`);
        loadSubmissions();
      } else {
        toast.error('Failed to update submission status');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500 fade-in pb-12">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pt-4 border-b border-[var(--color-border)] pb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] mb-1.5 flex items-center gap-3">
              Content Pipeline
              {statusFilter === 'pending' && pendingCount > 0 && (
                <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-[10px] uppercase px-2 py-0.5 rounded-full font-black animate-pulse">
                  {pendingCount} Action Required
                </span>
              )}
            </h1>
            <p className="text-sm font-medium text-[var(--color-text-muted)]">Review creator content, enforce guidelines, and approve assets for deployment.</p>
          </div>
          
          {/* Quick Filters */}
          <div className="flex bg-[var(--color-surface-secondary)] p-1 rounded-xl border border-[var(--color-border)] shrink-0 self-start md:self-auto">
            {['pending', 'approved', 'rejected', 'all'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "px-5 py-2 rounded-lg text-xs font-bold capitalize transition-all duration-200",
                  statusFilter === f
                    ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]/50"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Content Feed */}
        <div className="space-y-4">
          {loading ? (
             <div className="space-y-3">
               {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-[24px] bg-[var(--color-surface-secondary)] animate-pulse" />)}
             </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-24 bg-[var(--color-surface)] rounded-[24px] border border-[var(--color-border)] shadow-sm">
              <div className="h-20 w-20 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-full flex items-center justify-center mx-auto mb-5">
                 <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">You're all caught up!</h3>
              <p className="text-sm text-[var(--color-text-muted)] max-w-sm mx-auto mb-6">No {statusFilter !== 'all' ? statusFilter : ''} assets right now. You have reviewed the entire pipeline.</p>
              <Link href="/dashboard/vendor/campaigns">
                <Button className="font-bold bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow-md">Return to Missions</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {submissions.map((sub) => {
                const conf = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
                const Icon = conf.icon;
                const isProcessing = processingId === sub.id;

                const campaign = sub.campaign as any;
                const isFixed = campaign?.payment_model === 'fixed_per_content';

                return (
                  <div 
                    key={sub.id} 
                    className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-5 md:p-6 hover:shadow-md hover:border-[var(--color-accent)]/30 transition-all duration-300"
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      
                      {/* Creator Profile */}
                      <div className="flex items-center gap-4 lg:w-[280px] shrink-0">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-black shadow-inner">
                          {sub.influencer?.display_name?.[0]?.toUpperCase() || 'C'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--color-text-primary)] truncate mb-0.5">
                            {sub.influencer?.display_name || 'Anonymous Creator'}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-[var(--color-text-muted)] uppercase">
                            <span className="text-[var(--color-accent)] bg-[var(--color-accent-light)] px-1.5 py-0.5 rounded-md">{sub.platform}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(sub.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Campaign Insight */}
                      <div className="flex-1 min-w-0 bg-[var(--color-surface-secondary)] rounded-2xl p-4 border border-[var(--color-border)] flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-2">
                           <p className="text-xs font-semibold text-[var(--color-text-muted)]">Mission Brief</p>
                           <a 
                             href={sub.post_url} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 font-bold transition-colors"
                           >
                             <Video className="w-3.5 h-3.5" /> Watch Link <ExternalLink className="w-3 h-3" />
                           </a>
                        </div>
                        <p className="text-sm text-[var(--color-text-primary)] font-bold truncate">
                          {campaign?.title || 'Unknown Campaign'}
                        </p>
                      </div>

                      {/* Payment Overview */}
                      <div className="flex-1 min-w-0 bg-[var(--color-surface-secondary)] rounded-2xl p-4 border border-[var(--color-border)] flex flex-col justify-center">
                        <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">Creator Reward Profile</p>
                        <div className="flex items-end gap-2">
                           <p className="text-xl font-black text-[var(--color-text-primary)]">
                             {isFixed ? `$${campaign?.fixed_rate}` : `$${campaign?.rate_per_1k_views}`}
                           </p>
                           <p className="text-xs font-bold text-[var(--color-text-muted)] pb-1">
                             {isFixed ? 'Flat Payout' : 'per 1K Verified Views'}
                           </p>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-end gap-3 lg:w-[220px] shrink-0 border-t lg:border-t-0 border-[var(--color-border)] pt-4 lg:pt-0">
                        {sub.status === 'pending' ? (
                          <div className="flex items-center gap-2 w-full">
                            <Button 
                              disabled={isProcessing}
                              onClick={() => handleUpdateStatus(sub.id, 'rejected')}
                              variant="ghost"
                              className="flex-1 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 h-11 font-bold text-xs"
                            >
                              Reject
                            </Button>
                            <Button 
                              disabled={isProcessing}
                              onClick={() => handleUpdateStatus(sub.id, 'approved')}
                              className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11 text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                            >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve'}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end w-full">
                            <span className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider", conf.bg, conf.color)}>
                              <Icon className="w-4 h-4" />
                              {conf.label}
                            </span>
                            {sub.status === 'approved' && (
                              <p className="text-[10px] text-[var(--color-text-muted)] font-bold mt-1.5 flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1" asChild>
                                  <a href={sub.post_url} target="_blank" rel="noopener noreferrer">
                                    <Play className="h-3 w-3" />
                                    Watch content
                                  </a>
                                </Button>
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
