'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { UGCCampaign } from '@/types/ugc';

const STATUS_COLORS: Record<string, string> = {
  active:    'text-emerald-600', 
  paused:    'text-amber-600',
  draft:     'text-stone-400',   
  completed: 'text-blue-600', 
  cancelled: 'text-red-600',
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
    <div className="min-h-screen bg-[#f8f7f5] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-stone-900 tracking-tight">Campaign Operations</h1>
            <p className="text-sm text-stone-500 font-medium">Platform-wide UGC & clipping management</p>
          </div>
          <Link
            href="/admin/ugc/submissions"
            className="px-6 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/10"
          >
            Review Submissions
          </Link>
        </div>

        {/* Global Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Campaigns', value: campaigns.length, accent: '#10b981' },
            { label: 'Global Budget',    value: `$${totalBudget.toLocaleString()}`, accent: '#6366f1' },
            { label: 'Total Spent',     value: `$${totalSpent.toLocaleString()}`, accent: '#f59e0b' },
            { label: 'Total Views',     value: `${(totalViews / 1000).toFixed(1)}K`, accent: '#ec4899' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
               <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">{s.label}</p>
               <p className="text-3xl font-black text-stone-900 leading-none">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          {['active','draft','paused','completed','cancelled'].map((s) => (
            <div key={s} className="flex-1 min-w-[120px] rounded-xl bg-white border border-stone-100 p-4 shadow-sm text-center">
              <p className={`text-xl font-black ${STATUS_COLORS[s]}`}>{byStatus(s)}</p>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-1">{s}</p>
            </div>
          ))}
        </div>

        {/* Campaign Table */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50">
             <h2 className="text-sm font-black text-stone-700 uppercase tracking-widest">Active Campaigns</h2>
          </div>
          {loading ? (
            <div className="p-8 space-y-4">
              {[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded-xl bg-stone-50 animate-pulse" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50/30 text-stone-400">
                    {['Campaign', 'Brand', 'Type', 'Performance', 'Budget Status', 'Subs', 'Status'].map(h => (
                      <th key={h} className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/vendor/campaigns/${c.id}`} className="font-bold text-stone-900 hover:text-orange-600 transition-colors">
                          {c.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-semibold text-stone-600">{c.vendor?.business_name ?? '—'}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-stone-100 text-stone-600 uppercase tracking-tighter">
                          {c.campaign_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-stone-900 font-bold">
                        {(c.total_views_tracked || 0).toLocaleString()} <span className="text-[10px] text-stone-400 font-medium">views</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                           <div className="flex justify-between text-[10px] font-bold text-stone-500">
                              <span>${c.spent_budget?.toLocaleString()}</span>
                              <span>${c.total_budget?.toLocaleString()}</span>
                           </div>
                           <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                              <div 
                                 className="h-full bg-orange-500 rounded-full" 
                                 style={{ width: `${Math.min(100, ((c.spent_budget || 0) / (c.total_budget || 1)) * 100)}%` }} 
                              />
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-stone-900 font-bold">{c.submission_count ?? 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[c.status].replace('text-', 'bg-')}`} />
                           <span className={`text-[11px] font-black uppercase tracking-tight ${STATUS_COLORS[c.status]}`}>
                              {c.status}
                           </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
