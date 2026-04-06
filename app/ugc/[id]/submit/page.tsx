'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, Upload, Link as LinkIcon, 
  CheckCircle2, AlertCircle, Sparkles, 
  Instagram, Youtube, Twitter, 
  Send, Loader2, Play, ChevronRight,
  ShieldCheck, Info, Camera, DollarSign
} from 'lucide-react';
import type { UGCCampaign } from '@/types/ugc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';

const TiktokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
  </svg>
);

const PLATFORM_MAP: Record<string, { icon: any; color: string; bg: string; pattern: RegExp }> = {
  tiktok:    { icon: TiktokIcon, color: 'text-zinc-900', bg: 'bg-zinc-100', pattern: /tiktok\.com/i },
  instagram: { icon: Instagram,  color: 'text-orange-500', bg: 'bg-orange-50', pattern: /instagram\.com/i },
  youtube:   { icon: Youtube,    color: 'text-red-500',    bg: 'bg-red-50', pattern: /youtube\.com|youtu\.be/i },
  x:         { icon: Twitter,    color: 'text-zinc-900', bg: 'bg-zinc-100', pattern: /twitter\.com|x\.com/i },
};

export default function CampaignSubmitPage() {
  const { formatMoney } = useCurrency();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [postUrl, setPostUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ugc/campaigns/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.campaign) setCampaign(j.campaign);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!postUrl) {
      setDetectedPlatform(null);
      return;
    }
    for (const [p, config] of Object.entries(PLATFORM_MAP)) {
      if (config.pattern.test(postUrl)) {
        setDetectedPlatform(p);
        return;
      }
    }
    setDetectedPlatform(null);
  }, [postUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postUrl) {
      toast.error('Please enter a post URL');
      return;
    }
    if (!detectedPlatform) {
      toast.error('Unknown platform. Please use TikTok, Instagram, YouTube, or X.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/ugc/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: id,
          post_url: postUrl,
          platform: detectedPlatform,
          caption: caption,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Content submitted successfully!');
        router.push('/dashboard/submissions');
      } else {
        toast.error(data.error || 'Failed to submit content');
      }
    } catch (err) {
      toast.error('Network error during submission');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-500/50" />
        <p className="text-zinc-500 font-black">Campaign not found</p>
        <Button asChild variant="outline" className="rounded-2xl h-12 px-8 font-black">
          <Link href="/ugc">Back to Campaigns</Link>
        </Button>
      </div>
    );
  }

  const platformCfg = detectedPlatform ? PLATFORM_MAP[detectedPlatform] : { icon: LinkIcon, color: 'text-zinc-400', bg: 'bg-zinc-100' };

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-24 relative overflow-hidden">
      {/* Immersive Watermark Background */}
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none">
        <Image src="/hero-bg.png" alt="" fill className="object-cover" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-10">
        {/* Navigation */}
        <Link 
          href={`/ugc/${id}`}
          className="group flex items-center gap-2 text-zinc-500 hover:text-zinc-900 font-black text-sm transition-all w-fit mb-12"
        >
          <div className="h-10 w-10 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center group-hover:bg-zinc-50 shadow-sm">
             <ArrowLeft className="h-4 w-4" />
          </div>
          Back to Campaign details
        </Link>

        {/* Campaign Snapshot Brief */}
        <div className="p-8 rounded-[40px] bg-white border border-zinc-100 shadow-xl shadow-zinc-200/20 mb-10 space-y-6">
           <div className="flex items-center gap-4">
              <div className="shrink-0 relative">
                 <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
                 {campaign.vendor?.business_logo ? (
                   <img src={campaign.vendor.business_logo} className="relative w-14 h-14 rounded-2xl border-2 border-white object-cover" alt="" />
                 ) : (
                   <div className="relative w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-xl font-black text-white">
                     {campaign.vendor?.business_name?.[0] ?? 'B'}
                   </div>
                 )}
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-0.5">Submission for {campaign.vendor?.business_name}</p>
                 <h1 className="text-2xl font-black text-zinc-900 leading-tight">{campaign.title}</h1>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-3xl bg-zinc-50 border border-zinc-100 flex flex-col justify-center">
                 <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-1">Campaign Type</span>
                 <p className="text-sm font-black text-zinc-900 flex items-center gap-2">
                    {campaign.campaign_type === 'clipping' ? <Sparkles className="h-4 w-4 text-orange-500" /> : <Play className="h-4 w-4 text-orange-500" />}
                    {campaign.campaign_type === 'clipping' ? 'Clipping' : 'UGC'}
                 </p>
              </div>
              <div className="p-4 rounded-3xl bg-zinc-50 border border-zinc-100 flex flex-col justify-center">
                 <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-1">Payout Rate</span>
                 <p className="text-sm font-black text-emerald-600">
                    {formatMoney(campaign.rate_per_1k_views, "RWF")} <span className="text-[10px] text-zinc-400 ml-0.5">/ 1K views</span>
                 </p>
              </div>
           </div>
        </div>

        {/* Main Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
           <div className="p-10 rounded-[52px] bg-white border border-zinc-100 shadow-2xl space-y-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full" />
              
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-zinc-950 flex items-center justify-center">
                    <Send className="h-5 w-5 text-white" />
                 </div>
                 <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Submit Content</h2>
              </div>

              {/* Source Link Section */}
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 px-1">Source Link</label>
                 <div className="relative group">
                    <div className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl flex items-center justify-center transition-all", platformCfg.bg)}>
                       <platformCfg.icon className={cn("h-5 w-5", platformCfg.color)} />
                    </div>
                    <Input 
                      value={postUrl}
                      onChange={(e) => setPostUrl(e.target.value)}
                      placeholder="Paste TikTok, IG Reels, or YouTube URL..."
                      className="h-18 pl-18 pr-6 rounded-[28px] border-zinc-100 bg-zinc-50/50 focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all text-base font-bold placeholder:text-zinc-300 outline-none"
                    />
                    {detectedPlatform && (
                      <div className="absolute right-5 top-1/2 -translate-y-1/2">
                         <CheckCircle2 className="h-6 w-6 text-emerald-500 animate-in zoom-in duration-500" />
                      </div>
                    )}
                 </div>
                 <div className="flex items-start gap-2 px-2">
                    <Info className="h-3 w-3 text-zinc-400 mt-0.5" />
                    <p className="text-[11px] font-bold text-zinc-400 leading-normal">
                       Link to your public post on TikTok, Instagram, or YouTube. We'll track views automatically for payouts.
                    </p>
                 </div>
              </div>

              {/* Optional Caption */}
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 px-1">Notes / Caption <span className="opacity-40 font-bold lowercase tracking-normal">(optional)</span></label>
                 <Textarea 
                   value={caption}
                   onChange={(e) => setCaption(e.target.value)}
                   placeholder="Mention anything relevant to the brand or specific performance context..."
                   className="min-h-[140px] p-6 rounded-[28px] border-zinc-100 bg-zinc-50/50 focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all text-sm font-bold resize-none leading-relaxed"
                 />
              </div>

              {/* Requirement Strip */}
              <div className="space-y-3">
                 {campaign.requires_face && (
                   <div className="flex items-center gap-4 p-5 rounded-[28px] bg-amber-50 border border-amber-100">
                      <div className="h-10 w-10 rounded-xl bg-white border border-amber-200 flex items-center justify-center shrink-0 shadow-sm">
                         <Camera className="h-5 w-5 text-amber-600" />
                      </div>
                      <p className="text-xs font-black text-amber-800 leading-tight">
                         FACE REQUIRED: <span className="font-bold opacity-80">This campaign requires your face to be visible in the content to qualify for payouts.</span>
                      </p>
                   </div>
                 )}
                 <div className="flex items-center gap-4 p-5 rounded-[28px] bg-zinc-950 text-white shadow-xl">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                       <DollarSign className="h-5 w-5 text-orange-500" />
                    </div>
                    <p className="text-xs font-black leading-tight uppercase tracking-wide">
                       Approved content earns <span className="text-orange-500">{formatMoney(campaign.rate_per_1k_views, "RWF")}</span> for every 1,000 views tracked.
                    </p>
                 </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4">
                 <Button 
                   type="submit"
                   disabled={submitting || !detectedPlatform || !postUrl}
                   className="w-full h-18 rounded-[32px] bg-zinc-950 hover:bg-black text-white font-black text-lg shadow-2xl shadow-zinc-950/20 transition-all active:scale-[0.98] disabled:opacity-30 border-none"
                 >
                   {submitting ? (
                     <div className="flex items-center gap-3">
                       <Loader2 className="h-6 w-6 animate-spin" /> Verifying Submission...
                     </div>
                   ) : (
                     <div className="flex items-center gap-3">
                        Submit Content For Approval <ChevronRight className="h-5 w-5" />
                     </div>
                   )}
                 </Button>
                 <div className="flex items-center justify-center gap-2 mt-6">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest leading-none">
                       Content reviewed by brand within 48 hours.
                    </p>
                 </div>
              </div>
           </div>

           <p className="text-center px-10 text-[10px] font-bold text-zinc-400 leading-normal">
              By submitting content, you agree to follow the campaign guidelines and platform terms. Botting or fraudulent views will result in immediate permanent account suspension.
           </p>
        </form>
      </div>
    </div>
  );
}
