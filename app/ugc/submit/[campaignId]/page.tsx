'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UGCCampaign, UGCPlatform } from '@/types/ugc';

const PLATFORMS: { value: UGCPlatform; label: string; icon: string; placeholder: string }[] = [
  { value: 'tiktok',    label: 'TikTok',    icon: '🎵', placeholder: 'https://www.tiktok.com/@user/video/...' },
  { value: 'instagram', label: 'Instagram', icon: '📸', placeholder: 'https://www.instagram.com/reel/...' },
  { value: 'youtube',   label: 'YouTube',   icon: '▶️', placeholder: 'https://www.youtube.com/watch?v=...' },
  { value: 'x',         label: 'X (Twitter)', icon: '✖️', placeholder: 'https://x.com/user/status/...' },
];

export default function SubmitPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const router = useRouter();

  const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
  const [loading, setLoading]   = useState(true);
  const [platform, setPlatform] = useState<UGCPlatform>('tiktok');
  const [postUrl, setPostUrl]   = useState('');
  const [caption, setCaption]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/ugc/campaigns/${campaignId}`)
      .then((r) => r.json())
      .then((j) => setCampaign(j.campaign ?? null))
      .finally(() => setLoading(false));
  }, [campaignId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/ugc/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, post_url: postUrl, platform, caption }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Submission failed'); return; }
      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)]">
        Campaign not found
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <div className="max-w-md w-full mx-4 rounded-2xl border border-emerald-500/30 bg-emerald-900/10 backdrop-blur-sm p-10 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Submission Received!</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            Your content has been submitted to <strong className="text-[var(--color-text-primary)]">{campaign.title}</strong>.
            Once approved, we'll start tracking your views and crediting earnings every 24 hours.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard/submissions"
              className="px-5 py-2 rounded-xl bg-[var(--color-accent)] text-[var(--color-text-primary)] text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              View My Submissions
            </Link>
            <Link
              href="/ugc"
              className="px-5 py-2 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] text-sm font-medium hover:bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-secondary)]/80 transition-colors"
            >
              Browse More
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedPlatform = PLATFORMS.find((p) => p.value === platform)!;
  const allowedPlatforms = campaign.allowed_platforms ?? ['tiktok', 'instagram', 'youtube', 'x'];

  return (
    <div className="">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link href={`/ugc/${campaignId}`} className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-8 transition-colors">
          ← Back to Campaign
        </Link>

        {/* Campaign summary */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] backdrop-blur-sm p-5 mb-6">
          <div className="flex items-center gap-3">
            {campaign.vendor?.business_logo ? (
              <img src={campaign.vendor.business_logo} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold">
                {campaign.vendor?.business_name?.[0] ?? 'B'}
              </div>
            )}
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">{campaign.vendor?.business_name}</p>
              <p className="font-semibold text-[var(--color-text-primary)]">{campaign.title}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xl font-bold text-[var(--color-text-primary)]">${campaign.rate_per_1k_views}</p>
              <p className="text-xs text-[var(--color-text-muted)]">per 1K views</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] backdrop-blur-sm p-6 space-y-5">
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Submit Your Content</h1>

            {/* Platform selector */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">Platform</label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.filter((p) => allowedPlatforms.includes(p.value)).map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlatform(p.value)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      platform === p.value
                        ? 'border-[var(--color-accent)] bg-violet-500/15 text-[var(--color-text-primary)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:border-white/20 hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    <span className="text-lg">{p.icon}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* URL input */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">
                Content URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                required
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder={selectedPlatform.placeholder}
                className="w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] opacity-60 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-all"
              />
              <p className="text-[11px] text-[var(--color-text-muted)] opacity-80 mt-1.5">
                Paste the direct link to your {selectedPlatform.label} post/video
              </p>
            </div>

            {/* Caption */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">
                Caption / Description <span className="text-[var(--color-text-muted)] opacity-80">(optional)</span>
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder="Briefly describe your content..."
                className="w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] opacity-60 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-all resize-none"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-900/20 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="pt-1 text-xs text-[var(--color-text-muted)] opacity-80 leading-relaxed">
              By submitting, you confirm this content is original, you hold the rights to it, and it complies with the campaign guidelines.
              Views are synced every 24 hours and earnings are credited to your wallet automatically.
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] text-[var(--color-text-primary)] text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-900/30"
            >
              {submitting ? 'Submitting...' : 'Submit Content →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
