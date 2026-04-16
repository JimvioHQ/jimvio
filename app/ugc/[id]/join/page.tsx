'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { UGCCampaign, UGCPlatform } from '@/types/ugc';
import { 
  CheckCircle, ArrowLeft, Play, Camera, 
  MessageSquare, Globe, Info, Sparkles, 
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
  { title: 'Join Campaign', desc: 'Accept the rules and secure your spot.', icon: Zap },
  { title: 'Create Content', desc: 'Follow guidelines and film your video.', icon: Camera },
  { title: 'Post Publicly', desc: 'Upload to your social platforms.', icon: ExternalLink },
  { title: 'Submit Link', desc: 'Paste your URL in the dashboard.', icon: MessageSquare },
  { title: 'Earn Rewards', desc: 'Track views and get paid automatically.', icon: DollarSign },
];

export default function JoinCampaignPage() {
  const { formatMoney } = useCurrency();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
  const [isJoined, setIsJoined] = useState(false);
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
        
        if (cRes.ok) {
           const { campaign } = await cRes.json();
           setCampaign(campaign);
        }
        if (pRes.ok) {
           const { status } = await pRes.json();
           if (status === 'accepted') setIsJoined(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id]);

  const handleJoin = async () => {
    if (!agreed) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/ugc/campaigns/${id}/join`, { method: 'POST' });
      if (res.ok) {
        toast.success("Welcome aboard! You've joined the campaign.");
        router.push(`/ugc/${id}/dashboard`);
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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/50">
       <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!campaign) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/50 font-black text-zinc-500">
       Campaign not found
    </div>
  );

  if (isJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/50 p-6">
         <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[40px] p-10 border border-zinc-100 dark:border-zinc-800 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
               <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <div className="space-y-2">
               <h1 className="text-2xl font-black text-zinc-900 dark:text-white">You're already in!</h1>
               <p className="text-zinc-500 font-medium">You have already joined this campaign. Ready to submit your content?</p>
            </div>
            <Button asChild size="lg" className="w-full h-14 rounded-2xl bg-zinc-950 hover:bg-black text-white font-black">
               <Link href={`/ugc/${id}/dashboard`}>Go to Dashboard →</Link>
            </Button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20">
      {/* ── HEADER ── */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
           <Link href={`/ugc/${id}`} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:text-white font-black text-sm transition-all">
              <ArrowLeft className="h-4 w-4" /> Back
           </Link>
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Campaign Onboarding</span>
              <div className="h-1 w-12 bg-zinc-100 rounded-full overflow-hidden">
                 <div className="h-full bg-orange-500 w-1/4 animate-pulse" />
              </div>
           </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* LEFT: INFO & REQUIREMENTS */}
        <div className="lg:col-span-12 space-y-12">
           {/* Section 1: Hero Summary */}
           <div className="flex flex-col md:flex-row items-center gap-8 bg-zinc-950 rounded-[48px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full" />
              <div className="relative shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-[40px] bg-white dark:bg-zinc-900 p-1 overflow-hidden shadow-2xl">
                 <img src={campaign.media?.[0]?.url || "/hero-bg.png"} className="w-full h-full object-cover rounded-[38px]" alt="" />
              </div>
              <div className="relative space-y-4 text-center md:text-left flex-1">
                 <h1 className="text-4xl md:text-5xl font-black leading-none tracking-tight">{campaign.title}</h1>
                 <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                    <div className="px-4 py-2 rounded-2xl bg-white dark:bg-zinc-900/5 border border-white/10 flex items-center gap-2">
                       <DollarSign className="h-4 w-4 text-orange-500" />
                       <span className="text-sm font-black">{formatMoney(campaign.rate_per_1k_views, "USD")} / 1K views</span>
                    </div>
                    {campaign.max_payout_per_sub && (
                       <div className="px-4 py-2 rounded-2xl bg-white dark:bg-zinc-900/5 border border-white/10 flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm font-black">Max {formatMoney(campaign.max_payout_per_sub, "USD")} per sub</span>
                       </div>
                    )}
                 </div>
                 <div className="flex items-center justify-center md:justify-start gap-3">
                    {campaign.allowed_platforms.map(p => {
                       const cfg = PLATFORM_ICONS[p];
                       if (!cfg) return null;
                       return <div key={p} className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cfg.color)}><cfg.icon className="h-4 w-4 text-white" /></div>
                    })}
                    <div className="h-4 w-px bg-white dark:bg-zinc-900/20 mx-2" />
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
                       {new Date(campaign.starts_at || '').toLocaleDateString()} — {new Date(campaign.ends_at || '').toLocaleDateString()}
                    </span>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Section 2: Requirements Checklist */}
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
                          <p className="text-sm font-black text-zinc-700 dark:text-zinc-300">{r.label}</p>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Section 3: Content Examples */}
              <div className="space-y-6">
                 <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Play className="h-5 w-5 text-zinc-400" /> Reference Gallery
                 </h2>
                 <div className="grid grid-cols-2 gap-4">
                    {campaign.media?.filter(m => m.usage === 'example').map((m, i) => (
                       <div key={i} className="aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-100 border border-zinc-200 dark:border-zinc-800 group relative">
                          <img src={m.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                          <div className="absolute bottom-3 left-3">
                             <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900/20 backdrop-blur-md flex items-center justify-center">
                                <Play className="h-3 w-3 text-white fill-white" />
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Section 4: How it Works */}
           <section className="space-y-6">
              <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 text-center justify-center">
                 <Sparkles className="h-5 w-5 text-orange-500" /> The Road to Earnings
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                 {STEPS.map((s, i) => (
                    <div key={i} className="p-6 rounded-[32px] bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-center space-y-3 relative overflow-hidden group hover:border-orange-200 transition-all">
                       <div className="absolute -top-2 -right-2 text-4xl font-black text-zinc-50 opacity-0 group-hover:opacity-100 transition-all">{i+1}</div>
                       <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center mx-auto mb-2">
                          <s.icon className="h-5 w-5 text-zinc-900 dark:text-white" />
                       </div>
                       <h3 className="font-black text-zinc-900 dark:text-white text-sm leading-tight uppercase tracking-wider">{s.title}</h3>
                       <p className="text-[11px] font-medium text-zinc-400 leading-relaxed px-2">{s.desc}</p>
                    </div>
                 ))}
              </div>
           </section>

           {/* FINAL CTA */}
           <div className="pt-10 border-t border-zinc-200 dark:border-zinc-800">
              <div className="max-w-md mx-auto space-y-6 text-center">
                 <label className="flex items-center gap-4 cursor-pointer group">
                    <div className={cn(
                       "h-8 w-8 rounded-xl border-2 transition-all flex items-center justify-center shrink-0",
                       agreed ? "bg-zinc-900 border-zinc-900" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 group-hover:border-zinc-400"
                    )}>
                       <input type="checkbox" className="hidden" checked={agreed} onChange={() => setAgreed(!agreed)} />
                       {agreed && <CheckCircle className="h-5 w-5 text-white" />}
                    </div>
                    <span className="text-left text-sm font-black text-zinc-700 dark:text-zinc-300 select-none">
                       I agree to follow all campaign requirements and verify my content before submission.
                    </span>
                 </label>
                 
                 <Button 
                    onClick={handleJoin}
                    disabled={!agreed || joining}
                    className="w-full h-16 rounded-[28px] bg-zinc-950 hover:bg-black text-white text-lg font-black shadow-2xl shadow-zinc-950/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
                 >
                    {joining ? "Confirming..." : "Accept & Join Campaign"}
                 </Button>
                 
                 <div className="flex items-center justify-center gap-2 py-4">
                    <ShieldCheck className="h-4 w-4 text-orange-500" />
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Verified Brand Collaboration · Jimvio Trade Assurance</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
