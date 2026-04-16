'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Globe, Video, Instagram, Twitter, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: Video, color: 'text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-800 hover:border-zinc-900' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-orange-500 border-orange-200 hover:border-orange-500' },
  { id: 'youtube', name: 'YouTube', icon: Globe, color: 'text-red-500 border-red-200 hover:border-red-500' },
  { id: 'x', name: 'X / Twitter', icon: Twitter, color: 'text-blue-500 border-blue-200 hover:border-blue-500' }
];

export default function DashboardUGCSubmitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [platform, setPlatform] = useState<string>('');
  const [postUrl, setPostUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!platform || !postUrl) {
      setError('Please select a platform and enter your post URL.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ugc/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_id: id,
          post_url: postUrl,
          platform,
          caption
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit content');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/ugc/${id}`);
      }, 2000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4 animate-fade-in">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Successfully Submitted!</h2>
        <p className="text-sm font-medium text-zinc-500">Redirecting you to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-20 mt-10">
      <div className="flex items-center justify-between">
         <Link href={`/dashboard/ugc/${id}`} className="group flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:text-white font-black text-sm transition-all w-fit mb-4">
           <div className="h-8 w-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center group-hover:bg-zinc-50 dark:bg-zinc-900/50 shadow-sm">
              <ArrowLeft className="h-4 w-4" />
           </div>
           Back to Dashboard
         </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[40px] border border-zinc-100 dark:border-zinc-800 shadow-xl overflow-hidden">
         <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Submit Your Content</h1>
            <p className="text-sm text-zinc-500 font-medium mt-1">Upload your live social media link for review and tracking.</p>
         </div>

         <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex gap-3 text-red-600">
                 <AlertCircle className="h-5 w-5 shrink-0" />
                 <p className="text-sm font-semibold">{error}</p>
              </div>
            )}

            <div className="space-y-4">
               <label className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">1. Select Platform</label>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {PLATFORMS.map(p => (
                     <div 
                       key={p.id}
                       onClick={() => setPlatform(p.id)}
                       className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 cursor-pointer transition-all ${
                         platform === p.id 
                           ? `bg-zinc-50 dark:bg-zinc-900/50 border-orange-500 ring-4 ring-orange-100 shadow-md` 
                           : `${p.color} bg-white dark:bg-zinc-900 opacity-60 hover:opacity-100`
                       }`}
                     >
                        <p.icon className={`h-8 w-8 mb-3 ${platform === p.id ? 'text-orange-500' : ''}`} />
                        <span className={`text-xs font-black ${platform === p.id ? 'text-orange-600' : 'text-zinc-500'}`}>{p.name}</span>
                     </div>
                  ))}
               </div>
            </div>

            <div className="space-y-4">
               <label className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">2. Post URL</label>
               <input 
                 type="url" 
                 value={postUrl}
                 onChange={(e) => setPostUrl(e.target.value)}
                 placeholder="e.g. https://www.tiktok.com/@user/video/123456"
                 className="w-full h-14 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                 required
               />
               <p className="text-[11px] text-zinc-500 font-bold uppercase">Must be a publicly accessible live link.</p>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <label className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">3. Optional Note</label>
               </div>
               <textarea 
                 value={caption}
                 onChange={(e) => setCaption(e.target.value)}
                 rows={3}
                 placeholder="Any extra context for the brand..."
                 className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-4 text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all resize-none"
               />
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
               <Button 
                 type="submit" 
                 disabled={loading || !platform || !postUrl}
                 className="w-full h-14 rounded-2xl bg-zinc-900 hover:bg-black text-white font-black text-base shadow-xl disabled:opacity-50 transition-all active:scale-[0.98]"
               >
                 {loading ? 'Submitting...' : 'Submit Content'}
               </Button>
            </div>
         </form>
      </div>
    </div>
  );
}
