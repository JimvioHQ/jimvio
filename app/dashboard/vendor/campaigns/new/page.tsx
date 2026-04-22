'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Plus, X, Globe, Video, 
  Hash, Users, Type, Sparkles, Layout,
  Calendar, DollarSign, Info, Upload, Loader2, Music, Camera, Play, CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import type { UGCCampaignType, UGCPlatform } from '@/types/ugc';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { cloudinaryService } from '@/services/media/cloudinary';

const PLATFORMS: { value: UGCPlatform; label: string; icon: string; border: string; bgHover: string }[] = [
  { value: 'tiktok',    label: 'TikTok',    icon: '🎵', border: 'border-[#00f2fe]/40', bgHover: 'hover:bg-[#00f2fe]/5' },
  { value: 'instagram', label: 'Instagram', icon: '📸', border: 'border-[#ff0844]/40', bgHover: 'hover:bg-[#ff0844]/5' },
  { value: 'youtube',   label: 'YouTube',   icon: 'â–¶ï¸', border: 'border-[#ff0000]/40', bgHover: 'hover:bg-[#ff0000]/5' },
  { value: 'x',         label: 'X/Twitter', icon: 'âœ–ï¸', border: 'border-zinc-400',     bgHover: 'hover:bg-zinc-100' },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    campaign_type: 'clipping' as UGCCampaignType,
    payment_model: 'per_views' as 'per_views' | 'fixed_per_content',
    rate_per_1k_views: 3,
    fixed_rate: 50,
    total_budget: 500,
    max_payout_per_sub: 400,
    allowed_platforms: ['tiktok', 'instagram', 'youtube', 'x'] as string[],
    content_guidelines: '',
    requires_face: false,
    starts_at: '',
    ends_at: '',
    
    // New Structured Fields
    min_duration: 15,
    max_duration: 60,
    required_hashtags: [] as string[],
    required_mentions: [] as string[],
    required_keywords: [] as string[],
    music_track_url: '',
    music_artist_name: '',
    promotion_target: '',
    promotion_target_url: '',
    media: [] as { type: string; url: string; usage: string }[],
  });

  const [thumbnailInput, setThumbnailInput] = useState('');
  const [exampleInput, setExampleInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, usage: 'banner' | 'example') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const sigRes = await fetch("/api/uploads/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "jimvio/ugc" }),
      });
      if (!sigRes.ok) throw new Error("Failed to get signature");
      const { data: sig } = await sigRes.json();

      const res = await cloudinaryService.uploadDirect(file, sig, file.type.startsWith('video/') ? 'video' : 'image');
      if (!res.success || !res.data) throw new Error(res.error || "Upload failed");

      if (usage === 'banner') {
        const exists = form.media.find(m => m.usage === 'banner');
        if (exists) {
          set('media', form.media.map(m => m.usage === 'banner' ? { ...m, url: res.data!.secure_url } : m));
        } else {
          set('media', [...form.media, { type: 'image', url: res.data!.secure_url, usage: 'banner' }]);
        }
      } else {
        set('media', [...form.media, { type: file.type.startsWith('video/') ? 'video' : 'image', url: res.data!.secure_url, usage: 'example' }]);
      }
    } catch (err: any) {
      setError(err.message || "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const [hashtagInput, setHashtagInput] = useState('');
  const [mentionInput, setMentionInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  function set(key: string, val: unknown) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  function togglePlatform(p: string) {
    setForm((prev) => {
      const current = prev.allowed_platforms;
      return {
        ...prev,
        allowed_platforms: current.includes(p)
          ? current.filter((x) => x !== p)
          : [...current, p],
      };
    });
  }

  const addTag = (key: 'required_hashtags' | 'required_mentions' | 'required_keywords', val: string) => {
    if (!val.trim()) return;
    const cleanVal = val.trim().replace(/^[@#]/, '');
    if (!form[key].includes(cleanVal)) {
      set(key, [...form[key], cleanVal]);
    }
  };

  const removeTag = (key: 'required_hashtags' | 'required_mentions' | 'required_keywords', index: number) => {
    set(key, form[key].filter((_, i) => i !== index));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (form.allowed_platforms.length === 0) { setError('Select at least one platform'); return; }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/ugc/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to create campaign'); return; }
      router.push('/dashboard/vendor/campaigns');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)] pb-24">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
           <Link href="/dashboard/vendor/campaigns" className="inline-flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] font-semibold text-sm transition-all mb-4">
             <ArrowLeft className="h-4 w-4" />
             Back to Operations
           </Link>
           <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] mb-2">
             Launch Content Mission
           </h1>
           <p className="text-[var(--color-text-muted)] text-sm mb-6">
             Deploy an aggressive UGC or Clipping campaign to our global creator network.
           </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Core Blueprint */}
            <div className="rounded-none bg-[var(--color-surface-secondary)] border border-[var(--color-border)] p-6 shadow-none">
               <div className="flex items-center gap-3 mb-5">
                  <Layout className="h-5 w-5 text-[var(--color-accent)]" />
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)] tracking-tight">Core Blueprint</h2>
               </div>
               <div className="space-y-5">
                  <InputGroup 
                    label="Campaign Directive (Title)" 
                    value={form.title} 
                    setter={(v) => set('title', v)} 
                    placeholder="e.g. Summer Glow Skincare Viral Growth" 
                    type="text" 
                  />
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1.5">Strategic Outline</label>
                    <textarea
                       value={form.description}
                       onChange={(e) => set('description', e.target.value)}
                       rows={4}
                       placeholder="Detail the creative vision..."
                       className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-none px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-all resize-none shadow-none"
                    />
                  </div>
               </div>
            </div>

            {/* Rules of Engagement */}
            <div className="rounded-none bg-[var(--color-surface-secondary)] border border-[var(--color-border)] p-6 shadow-none">
               <div className="flex items-center gap-3 mb-5">
                  <CheckCircle2 className="h-5 w-5 text-[var(--color-accent)]" />
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)] tracking-tight">Rules of Engagement</h2>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  <InputGroup label="Min Duration (Seconds)" value={form.min_duration.toString()} setter={(v) => set('min_duration', Number(v))} placeholder="15" type="number" />
                  <InputGroup label="Max Duration (Seconds)" value={form.max_duration.toString()} setter={(v) => set('max_duration', Number(v))} placeholder="60" type="number" />
               </div>

               <div className="space-y-6">
                  {/* Hashtags */}
                  <div className="space-y-2">
                     <label className="block text-xs font-semibold text-[var(--color-text-muted)]">SEO Hashtags</label>
                     <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                           <Hash className="absolute left-3.5 top-[18px] -translate-y-1/2 h-4 w-4 text-zinc-400" />
                           <input type="text" value={hashtagInput} onChange={(e) => setHashtagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('required_hashtags', hashtagInput); setHashtagInput(''); } }} placeholder="viral, brand..." className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-none pl-10 pr-4 py-2.5 text-sm focus:border-[var(--color-accent)] outline-none shadow-none" />
                        </div>
                        <Button type="button" onClick={() => { addTag('required_hashtags', hashtagInput); setHashtagInput(''); }} className="py-2.5 px-6 rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold hover:bg-[var(--color-border)] transition-colors">Add</Button>
                     </div>
                     {form.required_hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                           {form.required_hashtags.map((h, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs font-medium">
                                 #{h} <X className="h-3 w-3 cursor-pointer text-zinc-400 hover:text-red-500" onClick={() => removeTag('required_hashtags', i)} />
                              </span>
                           ))}
                        </div>
                     )}
                  </div>

                  {/* Mentions */}
                  <div className="space-y-2">
                     <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Brand Mentions</label>
                     <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                           <Users className="absolute left-3.5 top-[18px] -translate-y-1/2 h-4 w-4 text-zinc-400" />
                           <input type="text" value={mentionInput} onChange={(e) => setMentionInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('required_mentions', mentionInput); setMentionInput(''); } }} placeholder="@yourbrand..." className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-none pl-10 pr-4 py-2.5 text-sm focus:border-[var(--color-accent)] outline-none shadow-none" />
                        </div>
                        <Button type="button" onClick={() => { addTag('required_mentions', mentionInput); setMentionInput(''); }} className="py-2.5 px-6 rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold hover:bg-[var(--color-border)] transition-colors">Add</Button>
                     </div>
                     {form.required_mentions.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                           {form.required_mentions.map((m, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none bg-[var(--color-surface)] border border-[var(--color-border)] text-blue-600 text-xs font-medium">
                                 @{m} <X className="h-3 w-3 cursor-pointer text-blue-400 hover:text-red-500" onClick={() => removeTag('required_mentions', i)} />
                              </span>
                           ))}
                        </div>
                     )}
                  </div>

                  {/* Keywords */}
                  <div className="space-y-2">
                     <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Required Keywords</label>
                     <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                           <Type className="absolute left-3.5 top-[18px] -translate-y-1/2 h-4 w-4 text-zinc-400" />
                           <input type="text" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('required_keywords', keywordInput); setKeywordInput(''); } }} placeholder="Must mention..." className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-none pl-10 pr-4 py-2.5 text-sm focus:border-[var(--color-accent)] outline-none shadow-none" />
                        </div>
                        <Button type="button" onClick={() => { addTag('required_keywords', keywordInput); setKeywordInput(''); }} className="py-2.5 px-6 rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold hover:bg-[var(--color-border)] transition-colors">Add</Button>
                     </div>
                     {form.required_keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                           {form.required_keywords.map((k, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none bg-zinc-800 text-white text-xs font-medium">
                                 {k} <X className="h-3 w-3 cursor-pointer text-zinc-400 hover:text-red-500" onClick={() => removeTag('required_keywords', i)} />
                              </span>
                           ))}
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* Assets */}
            <div className="rounded-none bg-[var(--color-surface-secondary)] border border-[var(--color-border)] p-6 shadow-none">
               <div className="flex items-center gap-3 mb-5">
                  <ImageIcon className="h-5 w-5 text-[var(--color-accent)]" />
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)] tracking-tight">Media & Assets</h2>
               </div>

               <div className="space-y-8">
                  {/* Thumbnail Row */}
                  <div className="flex flex-col sm:flex-row gap-6">
                     <div className="flex-1 space-y-3">
                        <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Cover Poster</label>
                        <input type="url" value={thumbnailInput} onChange={(e) => setThumbnailInput(e.target.value)} placeholder="Paste image URL..." className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-none px-4 py-2.5 text-sm shadow-none focus:border-[var(--color-accent)] outline-none" />
                        <div className="flex gap-2">
                           <Button type="button" onClick={() => { if (thumbnailInput.trim()) { const exists = form.media.find(m => m.usage === 'banner'); if (exists) { set('media', form.media.map(m => m.usage === 'banner' ? { ...m, url: thumbnailInput.trim() } : m)); } else { set('media', [...form.media, { type: 'image', url: thumbnailInput.trim(), usage: 'banner' }]); } setThumbnailInput(''); } }} className="flex-1 h-10 rounded-none bg-zinc-800 text-white font-medium text-xs hover:bg-black">Set URL</Button>
                           <div className="relative flex-1">
                              <input type="file" id="thumbnail-upload" className="sr-only" accept="image/*" onChange={(e) => handleFileUpload(e, 'banner')} disabled={uploading} />
                              <label htmlFor="thumbnail-upload" className={cn("flex items-center justify-center gap-2 w-full h-10 rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] cursor-pointer hover:bg-zinc-50 dark:bg-surface/50 transition-colors text-xs font-medium text-[var(--color-text-primary)] shadow-none", uploading && "opacity-50 cursor-wait")}>
                                 {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Upload
                              </label>
                           </div>
                        </div>
                     </div>
                     <div className="w-full sm:w-[160px] aspect-video rounded-none bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden relative flex flex-col items-center justify-center shadow-inner group shrink-0">
                        {form.media.find(m => m.usage === 'banner') ? (
                           <>
                              <img src={form.media.find(m => m.usage === 'banner')?.url} className="w-full h-full object-cover" alt="Preview" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                 <button type="button" onClick={() => set('media', form.media.filter(m => m.usage !== 'banner'))} className="text-white text-xs font-semibold bg-red-600 px-3 py-1.5 rounded-none hover:bg-red-700">Remove</button>
                              </div>
                           </>
                        ) : (
                           <>
                              <ImageIcon className="h-6 w-6 text-zinc-300 mb-1" />
                              <span className="text-[10px] text-zinc-400 font-medium">No Banner</span>
                           </>
                        )}
                     </div>
                  </div>

                  <hr className="border-[var(--color-border)]" />

                  {/* Examples Row */}
                  <div className="flex flex-col sm:flex-row gap-6">
                     <div className="flex-1 space-y-3">
                        <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Reference Media</label>
                        <input type="url" value={exampleInput} onChange={(e) => setExampleInput(e.target.value)} placeholder="Paste Reference Link..." className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-none px-4 py-2.5 text-sm shadow-none focus:border-[var(--color-accent)] outline-none" />
                        <div className="flex gap-2">
                           <Button type="button" onClick={() => { if (exampleInput.trim()) { set('media', [...form.media, { type: 'video', url: exampleInput.trim(), usage: 'example' }]); setExampleInput(''); } }} className="flex-1 h-10 rounded-none bg-zinc-800 text-white font-medium text-xs hover:bg-black">Add URL</Button>
                           <div className="relative flex-1">
                              <input type="file" id="example-upload" className="sr-only" accept="image/*,video/*" onChange={(e) => handleFileUpload(e, 'example')} disabled={uploading} />
                              <label htmlFor="example-upload" className={cn("flex items-center justify-center gap-2 w-full h-10 rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] cursor-pointer hover:bg-zinc-50 dark:bg-surface/50 transition-colors text-xs font-medium text-[var(--color-text-primary)] shadow-none", uploading && "opacity-50 cursor-wait")}>
                                 {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Upload
                              </label>
                           </div>
                        </div>
                     </div>
                     <div className="w-full sm:w-[160px] min-h-[100px] flex gap-2 flex-wrap items-start">
                        {form.media.filter(m => m.usage === 'example').map((m, i) => (
                           <div key={i} className="relative w-12 h-12 rounded-none overflow-hidden border border-[var(--color-border)] shadow-none group bg-zinc-100">
                              {m.type === 'image' ? (
                                 <img src={m.url} className="w-full h-full object-cover" alt="" />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-zinc-100"><Play className="h-4 w-4 text-zinc-400" /></div>
                              )}
                              <button type="button" onClick={() => set('media', form.media.filter(x => x.url !== m.url))} className="absolute right-0.5 top-0.5 h-4 w-4 bg-black/60 text-white rounded-none flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 hover:bg-red-500">âœ•</button>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Mission Type */}
            <div className="rounded-none bg-[var(--color-surface-secondary)] border border-[var(--color-border)] p-6 shadow-none">
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Campaign Type</h2>
                  <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
               </div>

               <div className="grid grid-cols-1 gap-2">
                 {[
                   { value: 'clipping', label: 'Clipping', icon: 'âœ‚ï¸', desc: 'Creators remix your content.' },
                   { value: 'ugc',      label: 'Native UGC', icon: '🎬', desc: 'Creators produce 100% original content.' },
                   { value: 'music_clipping', label: 'Music Clipping', icon: '🎵', desc: 'Creators use specific audio line.' },
                   { value: 'promotion', label: 'Promotion', icon: '🚀', desc: 'Promote specific links or brands.' },
                 ].map((t) => (
                   <button
                     key={t.value}
                     type="button"
                     onClick={() => set('campaign_type', t.value)}
                     className={cn(
                       "relative w-full p-4 rounded-none text-left transition-all border flex items-center gap-3",
                       form.campaign_type === t.value
                         ? "bg-violet-50 border-violet-200 ring-1 ring-violet-500/20"
                         : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-zinc-300 hover:bg-zinc-50 dark:bg-surface/50"
                     )}
                   >
                     <span className="text-xl shrink-0">{t.icon}</span>
                     <div>
                        <p className="text-xs font-semibold text-[var(--color-text-primary)]">{t.label}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{t.desc}</p>
                     </div>
                   </button>
                 ))}
               </div>

               {/* Conditional Form Extensions */}
               {form.campaign_type === 'music_clipping' && (
                  <div className="mt-3 p-4 rounded-none bg-orange-50 border border-orange-100 space-y-3 animate-fade-in">
                     <InputGroup label="Audio Track URL" value={form.music_track_url} setter={(v) => set('music_track_url', v)} placeholder="Spotify, Sound Link..." type="url" bg="bg-white dark:bg-surface" />
                     <InputGroup label="Artist Name" value={form.music_artist_name} setter={(v) => set('music_artist_name', v)} placeholder="e.g. Drake" type="text" bg="bg-white dark:bg-surface" />
                  </div>
               )}
               {form.campaign_type === 'promotion' && (
                  <div className="mt-3 p-4 rounded-none bg-blue-50 border border-blue-100 space-y-3 animate-fade-in">
                     <InputGroup label="Promo Target Name" value={form.promotion_target} setter={(v) => set('promotion_target', v)} placeholder="e.g. 50% Off Course" type="text" bg="bg-white dark:bg-surface" />
                     <InputGroup label="Target URL" value={form.promotion_target_url} setter={(v) => set('promotion_target_url', v)} placeholder="Destination Link" type="url" bg="bg-white dark:bg-surface" />
                  </div>
               )}
            </div>

            {/* Financial Escrow Vault */}
            <div className="rounded-none bg-zinc-950 p-6 text-white shadow-none relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent)] opacity-20 blur-3xl rounded-none translate-x-10 -translate-y-10" />
               <div className="relative z-10 flex items-center justify-between mb-5">
                  <h2 className="text-sm font-semibold text-white">Escrow Setup</h2>
                  <DollarSign className="h-4 w-4 text-[var(--color-accent)]" />
               </div>

               <div className="relative z-10 space-y-5">
                  <div className="flex bg-white dark:bg-surface/10 p-1 rounded-none">
                    <button type="button" onClick={() => set('payment_model', 'per_views')} className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-wide rounded-none transition-all", form.payment_model === 'per_views' ? "bg-white dark:bg-surface text-black shadow-none" : "hover:text-white text-zinc-400")}>Per Views</button>
                    <button type="button" onClick={() => set('payment_model', 'fixed_per_content')} className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-wide rounded-none transition-all", form.payment_model === 'fixed_per_content' ? "bg-white dark:bg-surface text-black shadow-none" : "hover:text-white text-zinc-400")}>Fixed Rate</button>
                  </div>

                  <div className="space-y-4">
                     {form.payment_model === 'per_views' ? (
                       <InputGroup label="Rate ($ USD / 1K Views)" value={form.rate_per_1k_views.toString()} setter={(v) => set('rate_per_1k_views', Number(v))} placeholder="3.00" type="number" step="0.1" align="font-semibold text-white focus:border-white" bg="bg-white dark:bg-surface/5 border-white/10" labelColor="text-zinc-400" />
                     ) : (
                       <InputGroup label="Fixed Rate Per Asset ($ USD)" value={form.fixed_rate.toString()} setter={(v) => set('fixed_rate', Number(v))} placeholder="150" type="number" step="1" align="font-semibold text-white focus:border-[var(--color-accent)]" bg="bg-white dark:bg-surface/5 border-white/10" labelColor="text-zinc-400" />
                     )}
                     <InputGroup label="Total Escrow Budget Limit ($ USD)" value={form.total_budget.toString()} setter={(v) => set('total_budget', Number(v))} placeholder="500" type="number" step="1" align="font-semibold text-white focus:border-white" bg="bg-white dark:bg-surface/5 border-white/10" labelColor="text-zinc-400" />
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                     <span className="text-[10px] text-zinc-400 uppercase font-semibold">Estimated Reach</span>
                     <span className="text-lg font-bold text-white">
                        {form.payment_model === 'per_views' 
                           ? ((form.total_budget / form.rate_per_1k_views) * 1000).toLocaleString() + " Views"
                           : Math.floor(form.total_budget / form.fixed_rate).toLocaleString() + " Assets"}
                     </span>
                  </div>
               </div>
            </div>

            {/* Targets & Deployment */}
            <div className="rounded-none bg-[var(--color-surface-secondary)] border border-[var(--color-border)] p-6 shadow-none space-y-6">
               <div className="space-y-3">
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Allowed Platforms</label>
                  <div className="grid grid-cols-2 gap-2">
                     {PLATFORMS.map((p) => (
                        <button key={p.value} type="button" onClick={() => togglePlatform(p.value)} className={cn("p-2.5 rounded-none transition-all border flex items-center justify-center gap-2", form.allowed_platforms.includes(p.value) ? `border-[var(--color-accent)] bg-violet-50/50 shadow-none` : `border-[var(--color-border)] bg-[var(--color-surface)] ${p.bgHover}`)}>
                           <span>{p.icon}</span>
                           <span className={cn("text-[10px] font-semibold", form.allowed_platforms.includes(p.value) ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]")}>{p.label}</span>
                        </button>
                     ))}
                  </div>
               </div>

               <label className="flex items-center justify-between p-4 rounded-none bg-[var(--color-surface)] border border-[var(--color-border)] cursor-pointer hover:bg-zinc-50 dark:bg-surface/50 transition-colors shadow-none">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">Require Face Visibility</span>
                  <div className={cn("w-10 h-6 rounded-none transition-all flex items-center px-1", form.requires_face ? "bg-[var(--color-accent)]" : "bg-zinc-200")}>
                     <div className={cn("h-4 w-4 bg-white dark:bg-surface rounded-none transition-transform shadow-none", form.requires_face ? "translate-x-4" : "translate-x-0")} />
                  </div>
               </label>

               <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Start Date" type="date" value={form.starts_at} setter={(v) => set('starts_at', v)} />
                  <InputGroup label="End Date" type="date" value={form.ends_at} setter={(v) => set('ends_at', v)} />
               </div>
            </div>

            {/* Submission */}
            <div className="pt-2">
               {error && (
                 <div className="mb-4 p-3 rounded-none bg-red-50 border border-red-100 text-xs font-medium text-red-600 text-center animate-fade-in shadow-none">
                   {error}
                 </div>
               )}
               <Button type="submit" disabled={loading} className="w-full h-[52px] rounded-none bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] text-white font-semibold text-sm shadow-none hover:shadow-none transition-all active:scale-[0.98]">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Launch Mission â†’'}
               </Button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}

// Light theme compact InputGroup
function InputGroup({ 
   label, placeholder, type, value, setter, step, align = "text-left", bg = "bg-[var(--color-surface)]", labelColor = "text-[var(--color-text-muted)]"
}: { 
   label: string, placeholder?: string, type: string, value: string, setter: (v: string) => void, step?: string, align?: string, bg?: string, labelColor?: string 
}) {
   return (
      <div className="space-y-1.5 w-full">
         <label className={cn("block text-xs font-semibold", labelColor)}>
            {label}
         </label>
         <input 
           type={type} step={step} required value={value} 
           onChange={(e) => setter(e.target.value)} 
           placeholder={placeholder} 
           className={cn("w-full border border-[var(--color-border)] rounded-none px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors shadow-none", bg, align)} 
         />
      </div>
   );
}

