'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UGCCampaignType, UGCPlatform } from '@/types/ugc';

const PLATFORMS: { value: UGCPlatform; label: string; icon: string }[] = [
  { value: 'tiktok',    label: 'TikTok',    icon: '🎵' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'youtube',   label: 'YouTube',   icon: '▶️' },
  { value: 'x',         label: 'X (Twitter)', icon: '✖️' },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    campaign_type: 'clipping' as UGCCampaignType,
    rate_per_1k_views: 3,
    total_budget: 500,
    max_payout_per_sub: 400,
    allowed_platforms: ['tiktok', 'instagram', 'youtube', 'x'] as string[],
    content_guidelines: '',
    requires_face: false,
    starts_at: '',
    ends_at: '',
  });

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
    <div className="">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Create Campaign</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Set up a UGC or Clipping campaign for influencers</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] backdrop-blur-sm p-6 space-y-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Campaign Type</h2>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'clipping', label: '✂️ Clipping', desc: 'Influencers clip & post brand videos' },
                { value: 'ugc',      label: '🎬 UGC',      desc: 'Influencers create original content' },
              ] as const).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('campaign_type', t.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    form.campaign_type === t.value
                      ? 'border-[var(--color-accent)] bg-violet-500/15'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-white/20'
                  }`}
                >
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.label}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] backdrop-blur-sm p-6 space-y-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Campaign Details</h2>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. TikTok Clipping Campaign Q2 2025"
                className="w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] opacity-60 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                placeholder="Describe what kind of content you're looking for..."
                className="w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] opacity-60 focus:outline-none focus:border-[var(--color-accent)] resize-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Content Guidelines</label>
              <textarea
                value={form.content_guidelines}
                onChange={(e) => set('content_guidelines', e.target.value)}
                rows={4}
                placeholder="• Use our branded hashtag&#10;• Show the product clearly&#10;• Keep video under 60 seconds"
                className="w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] opacity-60 focus:outline-none focus:border-[var(--color-accent)] resize-none transition-all"
              />
            </div>
          </div>

          {/* Payout */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] backdrop-blur-sm p-6 space-y-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Budget &amp; Payout</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                  Rate ($/1K views) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  required
                  value={form.rate_per_1k_views}
                  onChange={(e) => set('rate_per_1k_views', Number(e.target.value))}
                  className="w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                  Total Budget ($) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.total_budget}
                  onChange={(e) => set('total_budget', Number(e.target.value))}
                  className="w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Max per submission ($)</label>
                <input
                  type="number"
                  min={1}
                  value={form.max_payout_per_sub}
                  onChange={(e) => set('max_payout_per_sub', Number(e.target.value))}
                  className="w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-all"
                />
              </div>
            </div>

            {/* Estimate */}
            <div className="bg-[var(--color-surface-secondary)] rounded-xl px-4 py-3 text-xs text-[var(--color-text-muted)]">
              📊 At ${form.rate_per_1k_views}/1K views, your $
              {form.total_budget} budget supports approximately{' '}
              <strong className="text-[var(--color-text-primary)]">
                {((form.total_budget / form.rate_per_1k_views) * 1000).toLocaleString()}
              </strong>{' '}
              total tracked views
            </div>
          </div>

          {/* Platforms */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] backdrop-blur-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Allowed Platforms</h2>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePlatform(p.value)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    form.allowed_platforms.includes(p.value)
                      ? 'border-[var(--color-accent)] bg-violet-500/15 text-[var(--color-text-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:border-white/20 hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <span className="text-lg">{p.icon}</span>
                  {p.label}
                  {form.allowed_platforms.includes(p.value) && (
                    <span className="ml-auto text-[var(--color-accent)]">✓</span>
                  )}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requires_face}
                onChange={(e) => set('requires_face', e.target.checked)}
                className="w-4 h-4 accent-violet-500"
              />
              <span className="text-sm text-[var(--color-text-primary)]">Require creator's face to appear in content</span>
            </label>
          </div>

          {/* Dates */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] backdrop-blur-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Schedule (optional)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={form.starts_at}
                  onChange={(e) => set('starts_at', e.target.value)}
                  className="w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">End Date</label>
                <input
                  type="date"
                  value={form.ends_at}
                  onChange={(e) => set('ends_at', e.target.value)}
                  className="w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-all"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-900/20 border border-red-500/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] text-sm font-medium hover:bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-secondary)]/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] text-[var(--color-text-primary)] text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-900/30"
            >
              {loading ? 'Creating...' : 'Create Campaign →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
