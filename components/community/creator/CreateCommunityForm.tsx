"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";

const CATEGORIES = ["Business", "Tech", "Marketing", "Finance", "Fitness", "Other"] as const;
const STEPS = ["Basics", "Branding", "Pricing", "Review"] as const;

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CreateCommunityForm() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [isFree, setIsFree] = useState(true);
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState("");
  const [lifetime, setLifetime] = useState("");
  const [currency, setCurrency] = useState<"USD" | "RWF">("USD");
  const [trialDays, setTrialDays] = useState("0");

  const [successId, setSuccessId] = useState<string | null>(null);

  const yearlySave = useMemo(() => {
    const m = parseFloat(monthly);
    const y = parseFloat(yearly);
    if (!m || !y || m <= 0 || y <= 0) return null;
    const annual = m * 12;
    const pct = Math.round(((annual - y) / annual) * 100);
    return pct > 0 ? pct : null;
  }, [monthly, yearly]);

  function addTag() {
    const t = tagInput.trim();
    if (!t || tags.length >= 5) return;
    if (tags.includes(t)) return;
    setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  function canNext() {
    if (step === 0) return name.trim().length >= 2 && tagline.length <= 100;
    if (step === 1) return true;
    if (step === 2) {
      if (isFree) return true;
      const m = parseFloat(monthly);
      const y = parseFloat(yearly);
      return Number.isFinite(m) && m > 0 && Number.isFinite(y) && y > 0;
    }
    return true;
  }

  async function createCommunity() {
    setError(null);
    setSubmitting(true);
    try {
      const slug = slugify(name);
      if (!slug) {
        setError("Please enter a valid name.");
        return;
      }
      const body: Record<string, unknown> = {
        name: name.trim(),
        slug,
        tagline: tagline.trim() || undefined,
        description: description.trim() || undefined,
        long_description: description.trim() || undefined,
        category,
        tags: tags.length ? tags : undefined,
        avatar_url: avatarUrl.trim() || undefined,
        cover_image: coverUrl.trim() || undefined,
        is_free: isFree,
        currency,
        trial_days: parseInt(trialDays, 10) || 0,
        platform_commission_rate: 15,
      };
      if (!isFree) {
        body.monthly_price = parseFloat(monthly);
        body.yearly_price = parseFloat(yearly);
        if (lifetime.trim()) body.lifetime_price = parseFloat(lifetime);
      }

      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create community");
      setSuccessId(data.community?.id as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (successId) {
    return (
      <div className="max-w-[680px] mx-auto px-4 py-16 text-center space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-light)] text-[var(--color-success)]">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]">Community created</h1>
        <p className="text-[var(--color-text-muted)]">Youâ€™re ready to add spaces and rooms.</p>
        <Button asChild className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black px-8">
          <Link href={`/creator/${successId}/spaces`}>Set up your spaces</Link>
        </Button>
        <div>
          <Link href={`/creator/${successId}/dashboard`} className="text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-accent)]">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[680px] mx-auto px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                i <= step ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
              )}
            >
              {i + 1}
            </div>
            <span className={cn("text-xs font-bold truncate hidden sm:inline", i === step ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]")}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="hidden sm:block flex-1 h-px bg-[var(--color-border)] mx-2" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl border border-[var(--color-danger-light)] bg-[var(--color-danger-light)]/40 text-sm text-[var(--color-danger)] font-semibold">
          {error}
        </div>
      )}

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)]">Community name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-xl border-[var(--color-border)]" placeholder="e.g. Creator Lab" />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)]">Tagline (max 100)</label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value.slice(0, 100))}
              className="mt-1 rounded-xl border-[var(--color-border)]"
              placeholder="Short promise to members"
            />
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{tagline.length}/100</p>
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)]">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)]">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="mt-1 rounded-xl border-[var(--color-border)]" placeholder="What is this community about?" />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)]">Upload Avatar</label>
            <div className="mt-1">
              <CloudinaryUploadButton
                folder="jimvio/community-avatars"
                resourceType="image"
                buttonText="Browse Image"
                onUploadSuccess={(url) => setAvatarUrl(url)}
              />
            </div>
            {avatarUrl && (
              <div className="mt-3 flex justify-center">
                <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-[var(--color-border)]">
                  <Image src={avatarUrl} alt="" width={96} height={96} className="object-cover h-full w-full" unoptimized />
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)]">Upload Cover Image</label>
            <div className="mt-1">
              <CloudinaryUploadButton
                folder="jimvio/community-covers"
                resourceType="image"
                buttonText="Browse Image"
                onUploadSuccess={(url) => setCoverUrl(url)}
              />
            </div>
            {coverUrl && (
              <div className="mt-3 h-36 rounded-2xl overflow-hidden border border-[var(--color-border)] relative">
                <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)]">Tags (max 5)</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((t) => (
                <button key={t} type="button" onClick={() => removeTag(t)} className="text-xs font-bold px-2 py-1 rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                  {t} Ã—
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="rounded-xl border-[var(--color-border)]"
                placeholder="Add tag, Enter"
                disabled={tags.length >= 5}
              />
              <Button type="button" variant="outline" className="rounded-xl" onClick={addTag} disabled={tags.length >= 5}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex rounded-xl border border-[var(--color-border)] p-1 bg-[var(--color-surface-secondary)]">
            <button
              type="button"
              className={cn("flex-1 py-2 rounded-lg text-sm font-black", isFree ? "bg-[var(--color-surface)] shadow-sm" : "text-[var(--color-text-muted)]")}
              onClick={() => setIsFree(true)}
            >
              Free
            </button>
            <button
              type="button"
              className={cn("flex-1 py-2 rounded-lg text-sm font-black", !isFree ? "bg-[var(--color-surface)] shadow-sm" : "text-[var(--color-text-muted)]")}
              onClick={() => setIsFree(false)}
            >
              Paid
            </button>
          </div>

          {isFree ? (
            <p className="text-sm text-[var(--color-text-secondary)] font-medium">Members join for free â€” no pricing required.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--color-text-muted)]">Monthly price</label>
                  <Input value={monthly} onChange={(e) => setMonthly(e.target.value)} type="number" min="0" step="0.01" className="mt-1 rounded-xl border-[var(--color-border)]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--color-text-muted)]">Yearly price</label>
                  <Input value={yearly} onChange={(e) => setYearly(e.target.value)} type="number" min="0" step="0.01" className="mt-1 rounded-xl border-[var(--color-border)]" />
                </div>
              </div>
              {yearlySave != null && <p className="text-xs font-bold text-[var(--color-success)]">Save {yearlySave}% vs paying monthly</p>}
              <div>
                <label className="text-xs font-bold text-[var(--color-text-muted)]">Lifetime price (optional)</label>
                <Input value={lifetime} onChange={(e) => setLifetime(e.target.value)} type="number" min="0" step="0.01" className="mt-1 rounded-xl border-[var(--color-border)]" />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--color-text-muted)]">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "USD" | "RWF")}
                  className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold"
                >
                  <option value="USD">USD</option>
                  <option value="RWF">RWF</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--color-text-muted)]">Trial days</label>
                <Input value={trialDays} onChange={(e) => setTrialDays(e.target.value)} type="number" min="0" className="mt-1 rounded-xl border-[var(--color-border)]" />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 p-4 text-sm text-[var(--color-text-secondary)]">
            <p className="font-black text-[var(--color-text-primary)] mb-1">Platform commission</p>
            <p>Jimvio takes <span className="font-bold">15%</span> commission on all subscriptions.</p>
            <p>You keep <span className="font-bold text-[var(--color-success)]">85%</span> of all revenue.</p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3 text-sm">
          <h2 className="text-lg font-black text-[var(--color-text-primary)]">Review</h2>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2">
            <p>
              <span className="text-[var(--color-text-muted)]">Name:</span> <span className="font-bold">{name}</span>
            </p>
            <p>
              <span className="text-[var(--color-text-muted)]">Tagline:</span> {tagline || "â€”"}
            </p>
            <p>
              <span className="text-[var(--color-text-muted)]">Category:</span> {category}
            </p>
            <p>
              <span className="text-[var(--color-text-muted)]">Pricing:</span> {isFree ? "Free" : `Paid (${currency})`}
            </p>
            {!isFree && (
              <p className="text-xs text-[var(--color-text-muted)]">
                Monthly {monthly} Â· Yearly {yearly}
                {lifetime ? ` Â· Lifetime ${lifetime}` : ""}
              </p>
            )}
            <p>
              <span className="text-[var(--color-text-muted)]">Tags:</span> {tags.join(", ") || "â€”"}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between gap-3 mt-10">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl border-[var(--color-border)]"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            type="button"
            className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black"
            disabled={submitting || !canNext()}
            onClick={createCommunity}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Community"}
          </Button>
        )}
      </div>
    </div>
  );
}
