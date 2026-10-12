'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  Globe,
  Video,
  Instagram,
  Facebook,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale } from '@/context/LocaleContext';

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: Video, hostHint: 'tiktok.com' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, hostHint: 'instagram.com' },
  { id: 'youtube', name: 'YouTube', icon: Globe, hostHint: 'youtube.com|youtu.be' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, hostHint: 'facebook.com|fb.watch' },
] as const;

function validateUrl(platform: string, url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return 'Enter a post URL or media link.';
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return 'Enter a valid https URL.';
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return 'URL must start with https://';
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const rules: Record<string, RegExp> = {
    tiktok: /(tiktok\.com|vm\.tiktok\.com)$/i,
    instagram: /(instagram\.com|instagr\.am)$/i,
    youtube: /(youtube\.com|youtu\.be)$/i,
    facebook: /(facebook\.com|fb\.watch|fb\.com)$/i,
  };
  const re = rules[platform];
  if (re && !re.test(host)) {
    return `That URL does not look like a ${platform} link.`;
  }
  return null;
}

export default function PublicUGCSubmitPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();

  const [platform, setPlatform] = useState<string>('');
  const [postUrl, setPostUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [claimedViews, setClaimedViews] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [aiReviewing, setAiReviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [requirementLines, setRequirementLines] = useState<string[]>([]);
  const [allowed, setAllowed] = useState<string[] | null>(null);
  const [aiReview, setAiReview] = useState<{
    overallScore?: number;
    riskLevel?: string;
    readyToSubmit?: boolean;
    suggestions?: string[];
    dimensions?: Array<{ label: string; score: number; status: string; notes: string }>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/ugc/campaigns/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const campaign = json.campaign;
      if (!campaign || cancelled) return;
      const { readCampaignBrief, contentFormatLabel, displayPlatforms, platformLabel } = await import("@/lib/ugc/campaign-brief");
      const brief = readCampaignBrief(campaign);
      const lines = [
        contentFormatLabel(brief.contentFormat),
        brief.deliverableLabel,
        ...brief.keyRequirements,
        brief.submissionInstructions,
      ].filter((line): line is string => Boolean(line));
      setCampaignTitle(String(campaign.title ?? ""));
      setRequirementLines(lines);
      const platforms = displayPlatforms(campaign.allowed_platforms).filter((item) =>
        PLATFORMS.some((platform) => platform.id === item),
      );
      setAllowed(platforms.length ? platforms : PLATFORMS.map((item) => item.id));
      if (platforms.length === 1) setPlatform(platforms[0]);
      void platformLabel;
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function runAiReview() {
    if (!platform || !postUrl.trim()) {
      setError('Select a platform and enter a post URL before AI review.');
      return;
    }
    setAiReviewing(true);
    setError(null);
    try {
      const res = await fetch('/api/ugc/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: id,
          postUrl: postUrl.trim(),
          caption,
          platform,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'AI review failed');
      setAiReview(json.result ?? json.data ?? json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI review failed');
    } finally {
      setAiReviewing(false);
    }
  }

  const validationError = useMemo(() => {
    if (!platform || !postUrl.trim()) return null;
    return validateUrl(platform, postUrl);
  }, [platform, postUrl]);

  const canPreview = Boolean(platform && postUrl.trim() && !validationError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!platform || !postUrl) {
      setError('Please select a platform and enter your post URL.');
      return;
    }
    if (!confirmed) {
      setError("Confirm that you reviewed the campaign requirements.");
      return;
    }
    const v = validateUrl(platform, postUrl);
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(12);

    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(88, p + 8));
    }, 180);

    try {
      const res = await fetch('/api/ugc/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: id,
          post_url: postUrl.trim(),
          platform,
          caption,
          claimed_views: claimedViews.trim() === '' ? undefined : Number(claimedViews),
        }),
      });

      const data = await res.json();
      window.clearInterval(tick);
      setProgress(100);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit content');
      }

      setSuccess(true);
    } catch (err: unknown) {
      window.clearInterval(tick);
      setProgress(0);
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center space-y-4 px-4">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-100 shadow-[0_12px_32px_rgba(5,150,105,0.25)]">
          <CheckCircle className="h-10 w-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#111827]">Submission received</h2>
        <p className="max-w-md text-center text-sm text-[#6B7280]">
          The campaign owner has this for review. Status: pending review. Approval is not automatic.
        </p>
        <Link href={`/ugc/${id}/dashboard`} className="text-sm font-semibold text-[#FF5A1F]">
          View submission status
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-20 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/ugc/${id}/`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#6B7280] hover:text-[#111827]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to project
        </Link>
        <Link
          href="/ugc/creator-copilot"
          className="inline-flex items-center rounded-xl border border-[#FFE4D6] bg-[#FFF8F5] px-3 py-1.5 text-[12px] font-semibold text-[#FF5A1F] hover:bg-[#FFF0E8]"
        >
          Creator Copilot
        </Link>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[#EEF0F2] bg-white shadow-[0_12px_40px_rgba(17,24,39,0.06)]">
        <div className="border-b border-[#F3F4F6] bg-gradient-to-r from-[#FFF8F5] to-white px-6 py-5 sm:px-8">
          <h1 className="text-2xl font-bold text-[#111827]">Create submission</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {campaignTitle ? campaignTitle : t("submitUrlHint")}
          </p>
          {requirementLines.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-4 text-[13px] text-[#4B5563]">
              {requirementLines.slice(0, 6).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-7 px-6 py-6 sm:px-8">
          {error ? (
            <div className="flex gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : null}

          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              1. Platform
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PLATFORMS.filter((item) => !allowed || allowed.includes(item.id)).map((p) => {
                const Icon = p.icon;
                const selected = platform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPlatform(p.id);
                      setPreviewReady(false);
                      setError(null);
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-2xl border-2 px-2 py-4 transition',
                      selected
                        ? 'border-[#FF5A1F] bg-[#FFF4EF] shadow-[0_0_0_4px_rgba(255,90,31,0.12)]'
                        : 'border-[#EEF0F2] bg-white opacity-70 hover:opacity-100',
                    )}
                  >
                    <Icon className={cn('mb-2 h-6 w-6', selected ? 'text-[#FF5A1F]' : 'text-[#6B7280]')} />
                    <span
                      className={cn(
                        'text-[11px] font-bold',
                        selected ? 'text-[#FF5A1F]' : 'text-[#6B7280]',
                      )}
                    >
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              2. Post URL or media link
            </label>
            <input
              type="url"
              value={postUrl}
              onChange={(e) => {
                setPostUrl(e.target.value);
                setPreviewReady(false);
                setError(null);
              }}
              placeholder="https://…"
              className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 text-sm font-medium text-[#111827] outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FFE4D6]"
              required
            />
            {validationError ? (
              <p className="text-[12px] font-medium text-rose-600">{validationError}</p>
            ) : postUrl.trim() && platform ? (
              <p className="text-[12px] font-medium text-emerald-600">URL looks valid for {platform}.</p>
            ) : (
              <p className="text-[11px] font-medium text-[#9CA3AF]">
                Must be a publicly accessible live link.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              3. Optional note
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="Any extra context for the brand…"
              className="w-full resize-none rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3 text-sm font-medium outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FFE4D6]"
            />
          </div>

          {canPreview ? (
            <div className="rounded-2xl border border-[#EEF0F2] bg-[#FAFAFA] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-bold text-[#111827]">Preview before submit</p>
                <button
                  type="button"
                  onClick={() => setPreviewReady(true)}
                  className="text-[12px] font-semibold text-[#FF5A1F]"
                >
                  Refresh preview
                </button>
              </div>
              {(previewReady || canPreview) && (
                <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3">
                  <p className="text-[11px] font-bold uppercase text-[#9CA3AF]">{platform}</p>
                  <a
                    href={postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[13px] font-semibold text-[#FF5A1F]"
                  >
                    <span className="truncate">{postUrl}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                  {caption.trim() ? (
                    <p className="mt-2 text-[12px] text-[#6B7280]">{caption}</p>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          <div className="rounded-2xl border border-[#FFE4D6] bg-[#FFF8F5] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-bold text-[#111827]">AI Review</p>
                <p className="text-[12px] text-[#6B7280]">
                  Check hashtags, hook strength, and brand fit before you submit.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-[#FF5A1F] text-[#FF5A1F]"
                disabled={aiReviewing || !canPreview}
                onClick={() => void runAiReview()}
              >
                {aiReviewing ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Reviewing…
                  </span>
                ) : (
                  'Run AI Review'
                )}
              </Button>
            </div>
            {aiReview ? (
              <div className="mt-3 space-y-2 rounded-xl border border-[#EEF0F2] bg-white p-3">
                <div className="flex flex-wrap gap-3 text-[13px]">
                  <span className="font-bold text-[#FF5A1F]">
                    Score {Math.round(aiReview.overallScore ?? 0)}
                  </span>
                  <span className="text-[#6B7280]">Risk: {aiReview.riskLevel ?? '—'}</span>
                  <span
                    className={
                      aiReview.readyToSubmit ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'
                    }
                  >
                    {aiReview.readyToSubmit ? 'Ready to submit' : 'Needs improvement'}
                  </span>
                </div>
                {(aiReview.suggestions?.length ?? 0) > 0 ? (
                  <ul className="list-disc space-y-1 pl-4 text-[12px] text-[#374151]">
                    {aiReview.suggestions!.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          {loading || progress > 0 ? (
            <div>
              <div className="mb-1 flex justify-between text-[11px] font-semibold text-[#6B7280]">
                <span>Upload progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
                <div
                  className="h-full rounded-full bg-[#FF5A1F] transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          <label className="block">
            <span className="text-[12px] font-semibold text-[#374151]">Claimed views (optional)</span>
            <input
              inputMode="numeric"
              value={claimedViews}
              onChange={(e) => setClaimedViews(e.target.value)}
              placeholder="Not used as payment until the brand accepts them"
              className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 text-[13px] outline-none focus:border-[#FF5A1F]"
            />
          </label>

          <label className="flex items-start gap-2 text-[13px] text-[#374151]">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-0.5"
            />
            I reviewed this against the campaign requirements. Submitting does not approve it or pay it.
          </label>

          <div className="border-t border-[#F3F4F6] pt-4">
            <Button
              type="submit"
              disabled={loading || !platform || !postUrl || Boolean(validationError) || !confirmed}
              className="h-12 w-full rounded-full bg-[#FF5A1F] text-base font-bold text-white shadow-[0_8px_24px_rgba(255,90,31,0.3)] hover:bg-[#E04E1A] disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </span>
              ) : (
                'Submit content'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
