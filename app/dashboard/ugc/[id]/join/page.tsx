'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { UGCCampaign } from '@/types/ugc';
import { 
  CheckCircle, ArrowLeft, Play, Camera, 
  MessageSquare, Sparkles, Globe,
  DollarSign, ShieldCheck, Zap, ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';
import { toast } from 'sonner';

const PLATFORM_ICONS: Record<string, { icon: any; color: string }> = {
  tiktok:    { icon: Play,          color: 'bg-zinc-900'  },
  instagram: { icon: Camera,        color: 'bg-orange-500' },
  youtube:   { icon: Play,          color: 'bg-red-500'   },
  x:         { icon: MessageSquare, color: 'bg-zinc-800'  },
};

const STEPS = [
  { title: 'Join Campaign', desc: 'Accept the rules.', icon: Zap },
  { title: 'Create Content', desc: 'Film your video.', icon: Camera },
  { title: 'Post Publicly', desc: 'Upload to socials.', icon: ExternalLink },
  { title: 'Submit Link', desc: 'Paste your URL.', icon: MessageSquare },
  { title: 'Earn Rewards', desc: 'Get paid.', icon: DollarSign },
];

export default function JoinCampaignPage() {
  const { formatMoney } = useCurrency();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch(`/api/ugc/campaigns/${id}`),
          fetch(`/api/ugc/campaigns/${id}/participant`)
        ]);
        
        if (cRes.ok) setCampaign((await cRes.json()).campaign || null);
        if (pRes.ok) {
           const { status } = await pRes.json();
           if (status === 'accepted') router.push(`/dashboard/ugc/${id}`);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, router]);

  const handleJoin = async () => {
    if (!agreed) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/ugc/campaigns/${id}/join`, { method: 'POST' });
      if (res.ok) {
        toast.success("Welcome aboard! You've joined the campaign.");
        router.push(`/dashboard/ugc/${id}`);
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to join");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setJoining(false);
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
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
       <div className="flex flex-col md:flex-row items-center gap-8 bg-zinc-950 rounded-[48px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full" />
          <div className="relative shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-[40px] bg-white dark:bg-zinc-900 p-0.5 overflow-hidden shadow-2xl">
             <img src={campaign.media?.[0]?.url || "/hero-bg.png"} className="w-full h-full object-cover rounded-[38px]" alt="" />
          </div>
          <div className="relative space-y-4 text-center md:text-left flex-1">
             <h1 className="text-4xl md:text-5xl font-black leading-none tracking-tight">{campaign.title}</h1>
             <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <div className="px-4 py-2 rounded-2xl bg-white dark:bg-zinc-900/5 border border-white/10 flex items-center gap-2">
                   <DollarSign className="h-4 w-4 text-orange-500" />
                   <span className="text-sm font-black">{formatMoney(campaign.rate_per_1k_views, "RWF")} / 1K views</span>
                </div>
                {campaign.max_payout_per_sub && (
                   <div className="px-4 py-2 rounded-2xl bg-white dark:bg-zinc-900/5 border border-white/10 flex items-center gap-2 text-white/60">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-black">Max {formatMoney(campaign.max_payout_per_sub, "RWF")} per sub</span>
                   </div>
                )}
             </div>
             <div className="flex items-center justify-center md:justify-start gap-3">
                {campaign.allowed_platforms.map(p => {
                   const cfg = PLATFORM_ICONS[p] || { icon: Globe, color: 'bg-zinc-800' };
                   return <div key={p} className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cfg.color)}><cfg.icon className="h-4 w-4 text-white" /></div>
                })}
                <div className="h-4 w-px bg-white dark:bg-zinc-900/20 mx-2" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">
                   {new Date(campaign.starts_at || '').toLocaleDateString()} — {new Date(campaign.ends_at || '').toLocaleDateString()}
                </span>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
             <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-zinc-400" /> Participation Rules
             </h2>
             <div className="space-y-3">
                {[
                   { label: 'Face required in content', show: campaign.requires_face },
                   { label: `Required Hashtags: ${campaign.required_hashtags.map(t => '#' + t).join(', ')}`, show: campaign.required_hashtags.length > 0 },
                   { label: `Required Mentions: ${campaign.required_mentions.map(m => '@' + m).join(', ')}`, show: campaign.required_mentions.length > 0 },
                   { label: `Content Duration: ${campaign.min_duration ?? 0}s — ${campaign.max_duration ?? '∞'}s`, show: true },
                   { label: 'Content must be original and high quality', show: true },
                ].filter(r => r.show).map((r, i) => (
                   <div key={i} className="flex items-center gap-4 p-5 rounded-[28px] bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                      <div className="h-6 w-6 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                         <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <p className="text-sm font-black text-zinc-700 dark:text-zinc-300 leading-tight uppercase tracking-tight">{r.label}</p>
                   </div>
                ))}
             </div>
          </div>

          <div className="space-y-6">
             <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 text-center justify-center">
                <Sparkles className="h-5 w-5 text-orange-500" /> The Journey
             </h2>
             <div className="grid grid-cols-1 gap-4">
                {STEPS.map((s, i) => (
                   <div key={i} className="flex items-center gap-4 p-4 rounded-[28px] bg-white dark:bg-zinc-900 border border-zinc-50 shadow-sm relative group hover:border-orange-200 transition-all">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                         <s.icon className="h-4 w-4 text-zinc-900 dark:text-white" />
                      </div>
                      <div className="flex-1">
                         <h3 className="font-black text-zinc-900 dark:text-white text-xs leading-none uppercase tracking-widest">{s.title}</h3>
                         <p className="text-[10px] font-medium text-zinc-400 leading-tight mt-1">{s.desc}</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>
       </div>

       <div className="pt-10 border-t border-zinc-100 dark:border-zinc-800">
          <div className="max-w-md mx-auto space-y-6 text-center">
             <label className="flex items-center gap-4 cursor-pointer group">
                <div className={cn(
                   "h-8 w-8 rounded-xl border-2 transition-all flex items-center justify-center shrink-0",
                   agreed ? "bg-zinc-950 border-zinc-950 shadow-lg" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 group-hover:border-zinc-400"
                )}>
                   <input type="checkbox" className="hidden" checked={agreed} onChange={() => setAgreed(!agreed)} />
                   {agreed && <CheckCircle className="h-5 w-5 text-white" />}
                </div>
                <span className="text-left text-[11px] font-black text-zinc-700 dark:text-zinc-300 select-none leading-tight uppercase tracking-tight">
                   I agree to follow all campaign requirements and verify my content before submission.
                </span>
             </label>
             <Button 
                onClick={handleJoin}
                disabled={!agreed || joining}
                className="w-full h-16 rounded-[28px] bg-zinc-950 hover:bg-black text-white text-base font-black shadow-2xl active:scale-95 transition-all disabled:opacity-50"
             >
                {joining ? "Confirming..." : "Accept & Join Campaign"}
             </Button>
          </div>
       </div>
    </div>
  );
}
