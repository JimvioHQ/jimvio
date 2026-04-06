'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UGCCampaign } from '@/types/ugc';
import { 
  ArrowLeft, CheckCircle, Globe, 
  Play, Camera, MessageSquare, 
  ShieldCheck, Zap, Info, 
  ExternalLink, DollarSign,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';
import { toast } from 'sonner';

export default function SubmitContentPage() {
  const { formatMoney } = useCurrency();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [postUrl, setPostUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        if (!isUUID) throw new Error("Invalid ID");

        const res = await fetch(`/api/ugc/campaigns/${id}`);
        if (res.ok) setCampaign((await res.json()).campaign || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postUrl || !platform) return toast.error("Please provide a post URL and platform.");

    setSubmitting(true);
    try {
      const res = await fetch('/api/ugc/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: id,
          postUrl,
          platform,
          caption: notes,
        }),
      });

      if (res.ok) {
        toast.success("Content submitted successfully for review!");
        router.push(`/dashboard/ugc/${id}`);
      } else {
        const json = await res.json();
        toast.error(json.error || "Submission failed");
      }
    } catch (err) {
      toast.error("An error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!campaign) return (
    <div className="min-h-[400px] flex items-center justify-center font-black text-zinc-500">
       Campaign not found
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
       <div className="flex items-center justify-between">
          <Link 
             href={`/dashboard/ugc/${id}`} 
             className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-all font-black text-xs uppercase tracking-widest"
          >
             <ArrowLeft className="h-4 w-4" /> Back to Campaign Hub
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-[10px] font-black uppercase tracking-widest text-orange-600">
             <Zap className="h-3 w-3" /> Live Campaign Submission
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Form */}
          <div className="lg:col-span-12 space-y-8">
             <div className="space-y-2">
                <h1 className="text-3xl md:text-5xl font-black text-zinc-900 tracking-tight leading-none">Submit Content</h1>
                <p className="text-zinc-500 font-medium">Link your public post for {campaign.title}.</p>
             </div>

             <form onSubmit={handleSubmit} className="space-y-10 bg-white border border-zinc-100 p-8 md:p-12 rounded-[48px] shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   {/* Platform Selection */}
                   <div className="space-y-4">
                      <label className="text-sm font-black text-zinc-900 uppercase tracking-widest px-1">Select Platform</label>
                      <div className="grid grid-cols-2 gap-3">
                         {(campaign.allowed_platforms ?? []).map(p => (
                            <button
                               key={p}
                               type="button"
                               onClick={() => setPlatform(p)}
                               className={cn(
                                  "h-16 rounded-2xl border transition-all flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest",
                                  platform === p 
                                     ? "bg-zinc-900 border-zinc-900 text-white shadow-xl shadow-zinc-900/20" 
                                     : "bg-zinc-50 border-zinc-100 text-zinc-400 hover:bg-white hover:border-zinc-300"
                               )}
                            >
                               {p === 'tiktok' && <Play className="h-4 w-4" />}
                               {p === 'instagram' && <Camera className="h-4 w-4" />}
                               {p === 'youtube' && <Play className="h-4 w-4" />}
                               {p === 'x' && <MessageSquare className="h-4 w-4" />}
                               {p}
                            </button>
                         ))}
                      </div>
                   </div>

                   {/* Goal Summary */}
                   <div className="p-6 rounded-[32px] bg-orange-50/50 border border-orange-100 flex flex-col justify-center gap-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Your Rewards</span>
                      <p className="text-2xl font-black text-zinc-900 leading-tight">
                        {formatMoney(campaign.rate_per_1k_views, "RWF")} <span className="text-sm font-bold text-zinc-400">/ 1K views</span>
                      </p>
                      {campaign.max_payout_per_sub && (
                         <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Up to {formatMoney(campaign.max_payout_per_sub, "RWF")} per post</p>
                      )}
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-4">
                      <label htmlFor="postUrl" className="text-sm font-black text-zinc-900 uppercase tracking-widest px-1">Post URL</label>
                      <div className="relative group">
                         <Globe className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-orange-500 transition-colors" />
                         <input 
                            id="postUrl"
                            type="url"
                            required
                            placeholder="Paste your TikTok, Reel, or Shorts link..."
                            value={postUrl}
                            onChange={(e) => setPostUrl(e.target.value)}
                            className="w-full h-18 pl-14 pr-6 rounded-3xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-300 transition-all font-bold text-zinc-900 outline-none h-16"
                         />
                      </div>
                      <p className="text-[11px] font-medium text-zinc-400 px-2 leading-relaxed">
                         Only public links are supported. We track views automatically to calculate your earnings.
                      </p>
                   </div>

                   <div className="space-y-4">
                      <label htmlFor="notes" className="text-sm font-black text-zinc-900 uppercase tracking-widest px-1">Notes (Optional)</label>
                      <textarea 
                         id="notes"
                         placeholder="Mention any specific metrics or performance context..."
                         value={notes}
                         onChange={(e) => setNotes(e.target.value)}
                         className="w-full h-32 p-6 rounded-[32px] bg-zinc-50 border border-zinc-100 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-300 transition-all font-medium text-zinc-900 outline-none resize-none"
                      />
                   </div>
                </div>

                {campaign.requires_face && (
                   <div className="flex items-center gap-4 p-5 rounded-3xl bg-amber-50 border border-amber-100">
                      <div className="h-10 w-10 rounded-2xl bg-white border border-amber-200 flex items-center justify-center shrink-0">
                         <Camera className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="space-y-0.5">
                         <p className="text-xs font-black text-amber-800 uppercase tracking-tight">Face Required</p>
                         <p className="text-[10px] font-medium text-amber-700/60 leading-tight">Your face must be visible in this content to qualify for payouts.</p>
                      </div>
                   </div>
                )}

                <div className="pt-6">
                   <Button 
                      type="submit"
                      disabled={submitting}
                      className="w-full h-18 rounded-[32px] bg-zinc-950 hover:bg-black text-white text-lg font-black shadow-2xl active:scale-95 transition-all h-20"
                   >
                      {submitting ? "Submitting Work..." : "Submit Content For Approval →"}
                   </Button>
                   <div className="flex items-center justify-center gap-2 mt-6">
                      <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Botting detected automatically. Fraudulent views void payouts.</p>
                   </div>
                </div>
             </form>
          </div>
       </div>
    </div>
  );
}
