// components/communities/create-community-form.tsx
"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  Briefcase, Cpu, Megaphone, TrendingUp, Dumbbell, Sparkles,
  X, Plus, Globe, Lock, Image as ImageIcon, Type, Palette,
  DollarSign, Eye, Hash, ArrowRight, Pencil,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "Business", icon: Briefcase },
  { value: "Tech", icon: Cpu },
  { value: "Marketing", icon: Megaphone },
  { value: "Finance", icon: TrendingUp },
  { value: "Fitness", icon: Dumbbell },
  { value: "Other", icon: Sparkles },
] as const;

const STEPS = [
  { key: "basics", label: "Basics", icon: Type, desc: "Name, category, description" },
  { key: "branding", label: "Branding", icon: Palette, desc: "Visuals, tags, visibility" },
  { key: "pricing", label: "Access", icon: DollarSign, desc: "Free or paid membership" },
  { key: "review", label: "Review", icon: Eye, desc: "Confirm and create" },
] as const;

const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "auth", "create", "dashboard", "help",
  "settings", "creator", "community", "communities", "new",
]);

function slugify(name: string) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface FieldErrors {
  name?: string;
  slug?: string;
  tagline?: string;
  description?: string;
  monthly?: string;
  yearly?: string;
  lifetime?: string;
  trial?: string;
}

interface FormFields {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  isFree: boolean;
  monthly: string;
  yearly: string;
  lifetime: string;
  trialDays: string;
}

function validateStep(step: number, f: FormFields): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 0) {
    const n = f.name.trim();
    if (!n) errors.name = "Required";
    else if (n.length < 2) errors.name = "Must be at least 2 characters";
    else if (n.length > 60) errors.name = "Must be 60 characters or fewer";

    if (!f.slug) errors.slug = "Required";
    else if (f.slug.length < 3) errors.slug = "Must be at least 3 characters";
    else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(f.slug)) errors.slug = "Lowercase letters, numbers, and hyphens only";
    else if (RESERVED_SLUGS.has(f.slug)) errors.slug = "This URL is reserved";

    if (f.tagline.length > 100) errors.tagline = "Must be 100 characters or fewer";
    if (f.description.length > 500) errors.description = "Must be 500 characters or fewer";
  }

  if (step === 2 && !f.isFree) {
    const m = parseFloat(f.monthly);
    const y = parseFloat(f.yearly);
    const l = f.lifetime.trim() ? parseFloat(f.lifetime) : null;
    const t = parseInt(f.trialDays, 10);

    if (!f.monthly.trim() || !Number.isFinite(m) || m <= 0) errors.monthly = "Required, must be greater than 0";
    if (!f.yearly.trim() || !Number.isFinite(y) || y <= 0) errors.yearly = "Required, must be greater than 0";
    else if (Number.isFinite(m) && m > 0 && y > m * 12) errors.yearly = "Should not exceed monthly × 12";

    if (l !== null && (!Number.isFinite(l) || l <= 0)) errors.lifetime = "Must be greater than 0, or leave empty";
    if (!Number.isFinite(t) || t < 0 || t > 365) errors.trial = "Must be 0–365 days";
  }

  return errors;
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Field({
  label, hint, error, required, optional, count, children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  count?: { current: number; max: number };
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[13px] font-medium text-[var(--color-text-primary)]">
          {label}
          {required && <span className="ml-0.5 text-[var(--color-danger)]">*</span>}
          {optional && <span className="ml-1.5 text-[11px] font-normal text-[var(--color-text-muted)]">Optional</span>}
        </label>
        {count && (
          <span className={cn(
            "text-[11px] tabular-nums",
            count.current > count.max ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"
          )}>
            {count.current}/{count.max}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-[12px] text-[var(--color-danger)]">
          <AlertCircle size={11} />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

function StyledInput({
  error, ...props
}: React.ComponentProps<typeof Input> & { error?: string }) {
  return (
    <Input
      {...props}
      className={cn(
        "h-9 rounded-md text-[13px] transition-colors",
        "border bg-[var(--color-bg)] text-[var(--color-text-primary)]",
        error
          ? "border-[var(--color-danger)] focus-visible:ring-1 focus-visible:ring-[var(--color-danger)]/40"
          : "border-[var(--color-border)] focus-visible:border-[var(--color-accent)] focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]/30",
        props.className
      )}
    />
  );
}

// ─── Step indicator (clickable for completed steps) ───────────────────────────

function StepIndicator({
  step, completedSteps, onStepClick,
}: {
  step: number;
  completedSteps: Set<number>;
  onStepClick: (i: number) => void;
}) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center">
        {STEPS.map((s, i) => {
          const done = completedSteps.has(i);
          const active = i === step;
          const clickable = done || i < step;
          const StepIcon = s.icon;

          return (
            <React.Fragment key={s.key}>
              <li className="flex items-center">
                <button
                  type="button"
                  onClick={() => clickable && onStepClick(i)}
                  disabled={!clickable}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 group",
                    clickable && !active && "cursor-pointer",
                    !clickable && "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-medium transition-colors",
                      active && "border-[var(--color-accent)] bg-[var(--color-accent)] text-white",
                      done && !active && "border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-accent)] group-hover:bg-[var(--color-accent)]/5",
                      !done && !active && "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)]"
                    )}
                  >
                    {done && !active ? <Check size={13} strokeWidth={2.5} /> : <StepIcon size={12} />}
                  </span>
                  <span className={cn(
                    "hidden sm:inline text-[13px] transition-colors",
                    active && "text-[var(--color-text-primary)] font-medium",
                    !active && "text-[var(--color-text-muted)]",
                    clickable && !active && "group-hover:text-[var(--color-text-primary)]"
                  )}>
                    {s.label}
                  </span>
                </button>
              </li>
              {i < STEPS.length - 1 && (
                <li
                  aria-hidden
                  className={cn(
                    "mx-2 h-px flex-1 sm:mx-3 transition-colors",
                    completedSteps.has(i) ? "bg-[var(--color-accent)]/40" : "bg-[var(--color-border)]"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function CreateCommunityForm() {
  // Step state
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Step 0 — Basics
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<"checking" | "available" | "taken" | null>(null);
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0].value);
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");

  // Step 1 — Branding
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  // Step 2 — Pricing
  const [isFree, setIsFree] = useState(true);
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState("");
  const [lifetime, setLifetime] = useState("");
  const [currency, setCurrency] = useState<"USD" | "RWF">("RWF");
  const [trialDays, setTrialDays] = useState("0");

  const [successId, setSuccessId] = useState<string | null>(null);

  // ── Auto-slug from name unless edited ────────────────────────────────────
  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name));
  }, [name, slugEdited]);

  // ── Slug availability check (debounced) ──────────────────────────────────
  useEffect(() => {
    if (!slug || slug.length < 3) { setSlugAvailable(null); return; }
    if (RESERVED_SLUGS.has(slug)) { setSlugAvailable("taken"); return; }

    setSlugAvailable("checking");
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/communities/slug-check?slug=${encodeURIComponent(slug)}`, { signal: ctrl.signal });
        if (!res.ok) { setSlugAvailable(null); return; }
        const data = await res.json();
        setSlugAvailable(data.available ? "available" : "taken");
      } catch { /* aborted */ }
    }, 400);

    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [slug]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const fields: FormFields = { name, slug, tagline, description: longDescription, isFree, monthly, yearly, lifetime, trialDays };

  const yearlySave = useMemo(() => {
    const m = parseFloat(monthly), y = parseFloat(yearly);
    if (!m || !y || m <= 0 || y <= 0) return null;
    const pct = Math.round(((m * 12 - y) / (m * 12)) * 100);
    return pct > 0 ? pct : null;
  }, [monthly, yearly]);

  const currentErrors = useMemo(() => validateStep(step, fields), [step, fields]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const touch = useCallback((f: string) => setTouched(prev => new Set(prev).add(f)), []);

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!t) return;
    if (t.length < 2) { setTagError("Tag must be at least 2 characters"); return; }
    if (tags.length >= 5) { setTagError("Maximum 5 tags"); return; }
    if (tags.includes(t)) { setTagError("Already added"); return; }
    setTags([...tags, t]);
    setTagInput("");
    setTagError(null);
  }

  function goNext() {
    const stepFields: Record<number, string[]> = {
      0: ["name", "slug", "tagline", "description"],
      2: ["monthly", "yearly", "lifetime", "trial"],
    };
    if (stepFields[step]) {
      setTouched(prev => {
        const next = new Set(prev);
        stepFields[step].forEach(f => next.add(f));
        return next;
      });
    }
    const errors = validateStep(step, fields);
    if (Object.keys(errors).length > 0) return;
    if (step === 0 && slugAvailable === "taken") return;

    setCompletedSteps(prev => new Set(prev).add(step));
    setStep(s => s + 1);
  }

  function goToStep(i: number) {
    setStep(i);
  }

  async function submit() {
    setSubmitError(null);
    const errors = validateStep(step, fields);
    if (Object.keys(errors).length > 0) return;
    if (slugAvailable === "taken") { setSubmitError("Please choose an available URL slug"); return; }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        slug,
        tagline: tagline.trim() || undefined,
        description: shortDescription.trim() || undefined,
        long_description: longDescription.trim() || undefined,
        category,
        tags: tags.length ? tags : undefined,
        avatar_url: avatarUrl.trim() || undefined,
        cover_image: coverUrl.trim() || undefined,
        is_private: isPrivate,
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
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (successId) {
    return (
      <div className="mx-auto max-w-[440px] px-4 py-16">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-8 text-center">
          <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-success)]/10">
            <Check className="h-5 w-5 text-[var(--color-success)]" strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {name} is live
          </h1>
          <p className="mt-1.5 text-[13px] text-[var(--color-text-muted)]">
            Default spaces have been set up. Invite members or customize the layout next.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={`/creator/${successId}/spaces`}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-[var(--color-accent)] px-4 text-[13px] font-medium text-white hover:bg-[var(--color-accent-hover)]"
            >
              Customize spaces <ArrowRight size={13} />
            </Link>
            <Link
              href={`/creator/${successId}/dashboard`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--color-border)] px-4 text-[13px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Skip to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Layout ───────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[640px] px-4 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Create a community
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Set up the basics. You can change everything later from settings.
        </p>
      </header>

      <StepIndicator step={step} completedSteps={completedSteps} onStepClick={goToStep} />

      {submitError && (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-3 text-[13px] text-[var(--color-danger)]">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6 sm:p-7">
        <div className="mb-5 border-b border-[var(--color-border)] pb-4">
          <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{STEPS[step].label}</h2>
          <p className="mt-0.5 text-[13px] text-[var(--color-text-muted)]">{STEPS[step].desc}</p>
        </div>

        {/* ── Step 0 ── */}
        {step === 0 && (
          <div className="space-y-5">
            <Field
              label="Community name"
              required
              error={touched.has("name") ? currentErrors.name : undefined}
              count={{ current: name.length, max: 60 }}
            >
              <StyledInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => touch("name")}
                placeholder="e.g. Creator Lab"
                error={touched.has("name") ? currentErrors.name : undefined}
                maxLength={60}
              />
            </Field>

            <Field
              label="URL"
              required
              error={touched.has("slug") ? currentErrors.slug : undefined}
              hint="Your community will live at this address. Lowercase, no spaces."
            >
              <div className="flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)]/30">
                <span className="flex h-9 items-center px-2.5 text-[12px] text-[var(--color-text-muted)] border-r border-[var(--color-border)]">
                  jimvio.com/c/
                </span>
                <input
                  value={slug}
                  onChange={(e) => { setSlug(slugify(e.target.value)); setSlugEdited(true); }}
                  onBlur={() => touch("slug")}
                  placeholder="creator-lab"
                  className="h-9 flex-1 bg-transparent px-2.5 text-[13px] font-mono outline-none text-[var(--color-text-primary)]"
                />
                <span className="px-2.5">
                  {slugAvailable === "checking" && <Loader2 size={12} className="animate-spin text-[var(--color-text-muted)]" />}
                  {slugAvailable === "available" && <Check size={13} className="text-[var(--color-success)]" />}
                  {slugAvailable === "taken" && <X size={13} className="text-[var(--color-danger)]" />}
                </span>
              </div>
              {slugAvailable === "taken" && (
                <p className="mt-1 text-[12px] text-[var(--color-danger)]">This URL is already taken</p>
              )}
            </Field>

            <Field
              label="Tagline"
              optional
              error={touched.has("tagline") ? currentErrors.tagline : undefined}
              count={{ current: tagline.length, max: 100 }}
              hint="A one-line promise that appears on cards and previews."
            >
              <StyledInput
                value={tagline}
                onChange={(e) => setTagline(e.target.value.slice(0, 100))}
                onBlur={() => touch("tagline")}
                placeholder="The best place to grow your audience"
                error={touched.has("tagline") ? currentErrors.tagline : undefined}
              />
            </Field>

            <Field label="Category" required>
              <div className="grid grid-cols-3 gap-1.5">
                {CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  const selected = category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={cn(
                        "flex h-9 items-center justify-center gap-1.5 rounded-md border text-[12px] transition-colors",
                        selected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5 text-[var(--color-accent)]"
                          : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      )}
                    >
                      <Icon size={13} />
                      {c.value}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field
              label="Short description"
              optional
              count={{ current: shortDescription.length, max: 160 }}
              hint="Used on community cards and search results."
            >
              <StyledInput
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value.slice(0, 160))}
                placeholder="A friendly community for indie makers learning together"
              />
            </Field>

            <Field
              label="Full description"
              optional
              error={touched.has("description") ? currentErrors.description : undefined}
              count={{ current: longDescription.length, max: 500 }}
              hint="Shown on the community's about page. Markdown supported."
            >
              <textarea
                value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
                onBlur={() => touch("description")}
                rows={4}
                placeholder="What will members learn? What's the culture like? Who is this for?"
                className={cn(
                  "w-full rounded-md border bg-[var(--color-bg)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] resize-none transition-colors",
                  "border-[var(--color-border)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/30",
                  touched.has("description") && currentErrors.description && "border-[var(--color-danger)]"
                )}
              />
            </Field>
          </div>
        )}

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Visibility */}
            <Field label="Visibility" required hint="You can change this later in settings.">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: false, label: "Public", icon: Globe, desc: "Anyone can find and join" },
                  { value: true, label: "Private", icon: Lock, desc: "Invite only, hidden from search" },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const selected = isPrivate === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setIsPrivate(opt.value)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors",
                        selected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                          : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]"
                      )}
                    >
                      <span className={cn(
                        "flex items-center gap-1.5 text-[13px] font-medium",
                        selected ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"
                      )}>
                        <Icon size={13} /> {opt.label}
                      </span>
                      <span className="text-[12px] text-[var(--color-text-muted)]">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Avatar */}
            <Field label="Avatar" optional hint="Square image. At least 256×256px.">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="" width={56} height={56} className="h-full w-full object-cover" unoptimized />
                  ) : (
                    <ImageIcon size={18} className="text-[var(--color-text-muted)]" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <CloudinaryUploadButton
                    folder="jimvio/community-avatars"
                    resourceType="image"
                    buttonText={avatarUrl ? "Replace" : "Upload"}
                    onUploadSuccess={(url) => setAvatarUrl(url)}
                  />
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl("")}
                      className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </Field>

            {/* Cover */}
            <Field label="Cover image" optional hint="Wide image, 3:1 ratio. Around 1200×400px.">
              {coverUrl ? (
                <div className="relative aspect-[3/1] overflow-hidden rounded-md border border-[var(--color-border)]">
                  <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
                  <button
                    type="button"
                    onClick={() => setCoverUrl("")}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm hover:bg-black/75"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex aspect-[3/1] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
                  <ImageIcon size={20} className="text-[var(--color-text-muted)]" />
                  <CloudinaryUploadButton
                    folder="jimvio/community-covers"
                    resourceType="image"
                    buttonText="Upload cover"
                    onUploadSuccess={(url) => setCoverUrl(url)}
                  />
                </div>
              )}
            </Field>

            {/* Tags */}
            <Field
              label="Tags"
              optional
              count={{ current: tags.length, max: 5 }}
              hint="Used in search and discovery. Press Enter to add."
              error={tagError ?? undefined}
            >
              {tags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[12px] text-[var(--color-text-secondary)]"
                    >
                      <Hash size={10} className="text-[var(--color-text-muted)]" />
                      {t}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter((x) => x !== t))}
                        className="-mr-0.5 ml-0.5 rounded hover:text-[var(--color-danger)]"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <StyledInput
                  value={tagInput}
                  onChange={(e) => { setTagInput(e.target.value); setTagError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="design, productivity, mindset"
                  disabled={tags.length >= 5}
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={tags.length >= 5 || !tagInput.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
                >
                  <Plus size={14} />
                </button>
              </div>
            </Field>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div className="space-y-5">
            <Field label="Membership type" required>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: true, label: "Free", icon: Globe, desc: "Open to all members" },
                  { value: false, label: "Paid", icon: Lock, desc: "Subscription required" },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const selected = isFree === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => {
                        setIsFree(opt.value);
                        if (opt.value) { setMonthly(""); setYearly(""); setLifetime(""); setTrialDays("0"); }
                      }}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors",
                        selected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                          : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]"
                      )}
                    >
                      <span className={cn(
                        "flex items-center gap-1.5 text-[13px] font-medium",
                        selected ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"
                      )}>
                        <Icon size={13} /> {opt.label}
                      </span>
                      <span className="text-[12px] text-[var(--color-text-muted)]">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            {!isFree && (
              <>
                <Field label="Currency" required>
                  <div className="grid grid-cols-2 gap-2">
                    {(["RWF", "USD"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCurrency(c)}
                        className={cn(
                          "h-9 rounded-md border text-[13px] font-medium transition-colors",
                          currency === c
                            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5 text-[var(--color-accent)]"
                            : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Monthly"
                    required
                    error={touched.has("monthly") ? currentErrors.monthly : undefined}
                  >
                    <PriceInput
                      currency={currency}
                      value={monthly}
                      onChange={setMonthly}
                      onBlur={() => touch("monthly")}
                      error={touched.has("monthly") ? !!currentErrors.monthly : false}
                    />
                  </Field>
                  <Field
                    label="Yearly"
                    required
                    error={touched.has("yearly") ? currentErrors.yearly : undefined}
                  >
                    <PriceInput
                      currency={currency}
                      value={yearly}
                      onChange={setYearly}
                      onBlur={() => touch("yearly")}
                      error={touched.has("yearly") ? !!currentErrors.yearly : false}
                    />
                  </Field>
                </div>

                {yearlySave != null && (
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    Members save <span className="font-medium text-[var(--color-success)]">{yearlySave}%</span> with the yearly plan.
                  </p>
                )}

                <Field
                  label="Lifetime"
                  optional
                  error={touched.has("lifetime") ? currentErrors.lifetime : undefined}
                  hint="One-time payment. Leave empty to disable."
                >
                  <PriceInput
                    currency={currency}
                    value={lifetime}
                    onChange={setLifetime}
                    onBlur={() => touch("lifetime")}
                    error={touched.has("lifetime") ? !!currentErrors.lifetime : false}
                    placeholder="299.00"
                  />
                </Field>

                <Field
                  label="Free trial"
                  optional
                  error={touched.has("trial") ? currentErrors.trial : undefined}
                  hint="Days. Set to 0 for no trial."
                >
                  <StyledInput
                    type="number"
                    min="0"
                    max="365"
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                    onBlur={() => touch("trial")}
                    placeholder="0"
                    error={touched.has("trial") ? currentErrors.trial : undefined}
                    className="max-w-[100px]"
                  />
                </Field>
              </>
            )}

            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <p className="text-[12px] text-[var(--color-text-secondary)]">
                <span className="font-medium text-[var(--color-text-primary)]">Platform fee:</span>{" "}
                Jimvio takes 15% on paid memberships. You keep 85%. Free communities have no fee.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Live preview */}
            <div className="overflow-hidden rounded-md border border-[var(--color-border)]">
              {coverUrl ? (
                <div className="relative aspect-[3/1]">
                  <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="aspect-[6/1] bg-gradient-to-r from-[var(--color-surface)] to-[var(--color-surface-secondary)]" />
              )}
              <div className="flex items-start gap-3 p-4">
                <div className="-mt-8 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-[var(--color-bg)] bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="" width={56} height={56} className="h-full w-full object-cover" unoptimized />
                  ) : (
                    (() => {
                      const C = CATEGORIES.find((c) => c.value === category)!.icon;
                      return <C size={20} className="text-[var(--color-text-muted)]" />;
                    })()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                      {name || "Untitled community"}
                    </h3>
                    {isPrivate && (
                      <span className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                        <Lock size={9} /> Private
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                    {tagline || shortDescription || "No tagline"}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary table */}
            <dl className="divide-y divide-[var(--color-border)] rounded-md border border-[var(--color-border)] text-[13px]">
              <SummaryRow label="URL" value={<span className="font-mono text-[12px]">jimvio.com/c/{slug}</span>} editable onEdit={() => goToStep(0)} />
              <SummaryRow label="Category" value={category} editable onEdit={() => goToStep(0)} />
              <SummaryRow label="Visibility" value={isPrivate ? "Private" : "Public"} editable onEdit={() => goToStep(1)} />
              <SummaryRow label="Tags" value={tags.length ? tags.map((t) => `#${t}`).join(" ") : "None"} editable onEdit={() => goToStep(1)} />
              <SummaryRow
                label="Membership"
                value={isFree ? "Free" : `${monthly}/mo · ${yearly}/yr ${currency}${lifetime ? ` · ${lifetime} lifetime` : ""}`}
                editable
                onEdit={() => goToStep(2)}
              />
              {!isFree && parseInt(trialDays, 10) > 0 && (
                <SummaryRow label="Free trial" value={`${trialDays} days`} editable onEdit={() => goToStep(2)} />
              )}
            </dl>

            {/* What happens next */}
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <p className="text-[12px] font-medium text-[var(--color-text-primary)]">What happens next</p>
              <ul className="mt-1.5 space-y-1 text-[12px] text-[var(--color-text-muted)]">
                <li>• Default spaces are created (General, Announcements, Resources)</li>
                <li>• You become the owner with admin access</li>
                <li>• Community {isPrivate ? "stays hidden until you invite people" : "appears in search after 24 hours"}</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-[var(--color-border)] px-3 text-[13px] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-30"
        >
          <ChevronLeft size={14} /> Back
        </button>

        <span className="text-[12px] text-[var(--color-text-muted)] tabular-nums">
          {step + 1} / {STEPS.length}
        </span>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex h-9 items-center gap-1 rounded-md bg-[var(--color-accent)] px-4 text-[13px] font-medium text-white hover:bg-[var(--color-accent-hover)]"
          >
            Continue <ChevronRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-4 text-[13px] font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
            {submitting ? "Creating…" : "Create community"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PriceInput({
  currency, value, onChange, onBlur, error, placeholder = "9.99",
}: {
  currency: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error: boolean;
  placeholder?: string;
}) {
  return (
    <div className={cn(
      "flex items-center rounded-md border bg-[var(--color-bg)] focus-within:ring-1",
      error
        ? "border-[var(--color-danger)] focus-within:ring-[var(--color-danger)]/30"
        : "border-[var(--color-border)] focus-within:border-[var(--color-accent)] focus-within:ring-[var(--color-accent)]/30"
    )}>
      <span className="flex h-9 items-center px-2.5 text-[12px] font-medium text-[var(--color-text-muted)] border-r border-[var(--color-border)]">
        {currency}
      </span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="h-9 flex-1 bg-transparent px-2.5 text-[13px] outline-none text-[var(--color-text-primary)]"
      />
    </div>
  );
}

function SummaryRow({
  label, value, editable, onEdit,
}: {
  label: string;
  value: React.ReactNode;
  editable?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="flex items-center gap-2 truncate text-[var(--color-text-primary)]">
        <span className="truncate">{value}</span>
        {editable && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            aria-label={`Edit ${label}`}
          >
            <Pencil size={11} />
          </button>
        )}
      </dd>
    </div>
  );
}