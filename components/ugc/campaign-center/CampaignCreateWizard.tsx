"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Image as ImageIcon,
  Loader2,
  Save,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import type { UGCCampaignType, UGCPlatform } from "@/types/ugc";
import { cloudinaryService } from "@/services/media/cloudinary";
import { cn } from "@/lib/utils";

const STEPS = [
  "Type",
  "Basics",
  "Rewards",
  "Targeting",
  "Requirements",
  "Assets",
  "Review",
] as const;

const TYPES: { value: UGCCampaignType; label: string; desc: string }[] = [
  { value: "ugc", label: "UGC Campaign", desc: "Original creator content for your brand." },
  { value: "clipping", label: "Clipping", desc: "Pay creators per 1K views on clips." },
  { value: "music_clipping", label: "Music Clipping", desc: "Promote a track with short clips." },
  { value: "promotion", label: "Promotion", desc: "Drive traffic to a product or link." },
];

const PLATFORMS: UGCPlatform[] = ["tiktok", "instagram", "youtube", "x"];

type MediaItem = { type: string; url: string; usage: string };

type FormState = {
  title: string;
  description: string;
  campaign_type: UGCCampaignType;
  payment_model: "per_views" | "fixed_per_content";
  rate_per_1k_views: number;
  fixed_rate: number;
  total_budget: number;
  max_payout_per_sub: number;
  allowed_platforms: string[];
  min_duration: number;
  max_duration: number;
  required_hashtags: string[];
  required_mentions: string[];
  required_keywords: string[];
  requires_face: boolean;
  music_track_url: string;
  music_artist_name: string;
  promotion_target: string;
  promotion_target_url: string;
  media: MediaItem[];
  creator_limit: number;
  countries: string;
  languages: string;
};

const DEFAULT_FORM: FormState = {
  title: "",
  description: "",
  campaign_type: "ugc",
  payment_model: "per_views",
  rate_per_1k_views: 3,
  fixed_rate: 50,
  total_budget: 500,
  max_payout_per_sub: 400,
  allowed_platforms: ["tiktok", "instagram"],
  min_duration: 15,
  max_duration: 60,
  required_hashtags: [],
  required_mentions: [],
  required_keywords: [],
  requires_face: false,
  music_track_url: "",
  music_artist_name: "",
  promotion_target: "",
  promotion_target_url: "",
  media: [],
  creator_limit: 50,
  countries: "",
  languages: "",
};

const DRAFT_KEY = "jimvio-campaign-center-draft-v1";

type CampaignCreateWizardProps = {
  editId?: string;
};

export function CampaignCreateWizard({ editId }: CampaignCreateWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const templateId = searchParams.get("template");
  const sourceId = editId || duplicateId || templateId || undefined;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState({ hashtag: "", mention: "", keyword: "" });
  const [activeCampaignId, setActiveCampaignId] = useState<string | undefined>(editId);
  const hydrated = useRef(false);

  const set = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: val }));
  }, []);

  const applyCampaign = useCallback((c: Record<string, unknown>) => {
    setForm({
      ...DEFAULT_FORM,
      title: String(c.title ?? ""),
      description: String(c.description ?? ""),
      campaign_type: (c.campaign_type as FormState["campaign_type"]) ?? "ugc",
      payment_model: (c.payment_model as FormState["payment_model"]) ?? "per_views",
      rate_per_1k_views: Number(c.rate_per_1k_views) || 3,
      fixed_rate: Number(c.fixed_rate) || 50,
      total_budget: Number(c.total_budget) || 500,
      max_payout_per_sub: Number(c.max_payout_per_sub) || 400,
      allowed_platforms: (c.allowed_platforms as UGCPlatform[]) ?? ["tiktok", "instagram"],
      min_duration: Number(c.min_duration) || 15,
      max_duration: Number(c.max_duration) || 60,
      required_hashtags: Array.isArray(c.required_hashtags) ? (c.required_hashtags as string[]) : [],
      required_mentions: Array.isArray(c.required_mentions) ? (c.required_mentions as string[]) : [],
      required_keywords: Array.isArray(c.required_keywords) ? (c.required_keywords as string[]) : [],
      requires_face: Boolean(c.requires_face),
      music_track_url: String(c.music_track_url ?? ""),
      music_artist_name: String(c.music_artist_name ?? ""),
      promotion_target: String(c.promotion_target ?? ""),
      promotion_target_url: String(c.promotion_target_url ?? ""),
      media: Array.isArray(c.media)
        ? (c.media as { type?: string; url: string; usage?: string }[]).map((m) => ({
            type: m.type || "image",
            url: m.url,
            usage: m.usage || "example",
          }))
        : [],
    });
  }, []);

  // Load local autosave, edit target, duplicate, or template campaign
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sourceId) {
        try {
          const res = await fetch(`/api/ugc/campaigns/${sourceId}`);
          const json = await res.json();
          const c = json.campaign;
          if (!c || cancelled) return;
          applyCampaign(c);
          setActiveCampaignId(String(c.id ?? sourceId));
        } catch {
          toast.error("Could not load campaign");
        }
        hydrated.current = true;
        return;
      }

      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as FormState;
          if (!cancelled) setForm({ ...DEFAULT_FORM, ...parsed });
        }
      } catch {
        /* ignore */
      }
      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceId, applyCampaign]);

  // Autosave to localStorage
  useEffect(() => {
    if (!hydrated.current || activeCampaignId) return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
        setAutoSavedAt(new Date().toLocaleTimeString());
      } catch {
        /* ignore */
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [form, activeCampaignId]);

  const progress = ((step + 1) / STEPS.length) * 100;

  const validateStep = (s: number): string | null => {
    if (s === 1 && !form.title.trim()) return "Campaign title is required";
    if (s === 2) {
      if (form.total_budget <= 0) return "Budget must be greater than 0";
      if (form.payment_model === "per_views" && form.rate_per_1k_views <= 0)
        return "Rate per 1K views must be greater than 0";
      if (form.payment_model === "fixed_per_content" && form.fixed_rate <= 0)
        return "Fixed rate must be greater than 0";
    }
    if (s === 3 && form.allowed_platforms.length === 0)
      return "Select at least one platform";
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((v) => Math.min(v + 1, STEPS.length - 1));
  };

  const back = () => {
    setError("");
    setStep((v) => Math.max(v - 1, 0));
  };

  const uploadMedia = async (
    e: React.ChangeEvent<HTMLInputElement>,
    usage: "banner" | "example" | "ad_creative",
  ) => {
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
      const res = await cloudinaryService.uploadDirect(
        file,
        sig,
        file.type.startsWith("video/") ? "video" : "image",
      );
      if (!res.success || !res.data) throw new Error(res.error || "Upload failed");
      const item: MediaItem = {
        type: file.type.startsWith("video/") ? "video" : "image",
        url: res.data.secure_url,
        usage,
      };
      setForm((prev) => {
        if (usage === "banner") {
          const rest = prev.media.filter((m) => m.usage !== "banner");
          return { ...prev, media: [...rest, item] };
        }
        return { ...prev, media: [...prev.media, item] };
      });
      toast.success("Asset uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const payload = useMemo(() => {
    const guidelines: string[] = [];
    if (form.countries.trim()) guidelines.push(`Countries: ${form.countries.trim()}`);
    if (form.languages.trim()) guidelines.push(`Languages: ${form.languages.trim()}`);
    if (form.creator_limit > 0) guidelines.push(`Creator limit: ${form.creator_limit}`);
    const description = [form.description.trim(), ...guidelines]
      .filter(Boolean)
      .join("\n\n");

    return {
      title: form.title.trim(),
      description,
      campaign_type: form.campaign_type,
      payment_model: form.payment_model,
      rate_per_1k_views:
        form.payment_model === "per_views"
          ? form.rate_per_1k_views
          : Math.max(form.rate_per_1k_views, 1),
      fixed_rate: form.fixed_rate,
      total_budget: form.total_budget,
      max_payout_per_sub: form.max_payout_per_sub,
      allowed_platforms: form.allowed_platforms,
      min_duration: form.min_duration,
      max_duration: form.max_duration,
      required_hashtags: form.required_hashtags,
      required_mentions: form.required_mentions,
      required_keywords: form.required_keywords,
      requires_face: form.requires_face,
      music_track_url: form.music_track_url || undefined,
      music_artist_name: form.music_artist_name || undefined,
      promotion_target: form.promotion_target || undefined,
      promotion_target_url: form.promotion_target_url || undefined,
      media: form.media,
    };
  }, [form]);

  const saveDraft = async () => {
    const err = validateStep(1) || validateStep(2);
    if (err) {
      setError(err);
      setStep(err.includes("title") ? 1 : 2);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (activeCampaignId) {
        const res = await fetch(`/api/ugc/campaigns/${activeCampaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: payload.title,
            description: payload.description,
            rate_per_1k_views: payload.rate_per_1k_views,
            total_budget: payload.total_budget,
            max_payout_per_sub: payload.max_payout_per_sub,
            allowed_platforms: payload.allowed_platforms,
            min_duration: payload.min_duration,
            max_duration: payload.max_duration,
            required_hashtags: payload.required_hashtags,
            required_mentions: payload.required_mentions,
            required_keywords: payload.required_keywords,
            requires_face: payload.requires_face,
            status: "draft",
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Save failed");
        toast.success("Draft updated");
        router.push("/ugc/campaign-center/drafts");
        return;
      }

      const res = await fetch("/api/ugc/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Save failed");
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Draft saved");
      router.push("/ugc/campaign-center/drafts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const continueToFunding = async () => {
    for (let s = 0; s < STEPS.length - 1; s++) {
      const err = validateStep(s);
      if (err) {
        setError(err);
        setStep(s);
        return;
      }
    }
    setLoading(true);
    setError("");
    try {
      let id = activeCampaignId;
      if (!id) {
        const res = await fetch("/api/ugc/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Create failed");
        id = json.campaign?.id as string;
        localStorage.removeItem(DRAFT_KEY);
      } else {
        const res = await fetch(`/api/ugc/campaigns/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: payload.title,
            description: payload.description,
            rate_per_1k_views: payload.rate_per_1k_views,
            total_budget: payload.total_budget,
            max_payout_per_sub: payload.max_payout_per_sub,
            allowed_platforms: payload.allowed_platforms,
            min_duration: payload.min_duration,
            max_duration: payload.max_duration,
            required_hashtags: payload.required_hashtags,
            required_mentions: payload.required_mentions,
            required_keywords: payload.required_keywords,
            requires_face: payload.requires_face,
            status: "draft",
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Update failed");
      }

      toast.success("Campaign ready — fund to activate");
      router.push(`/ugc/campaign-center/${id}/fund`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not continue");
    } finally {
      setLoading(false);
    }
  };

  const addTag = (key: "required_hashtags" | "required_mentions" | "required_keywords", raw: string) => {
    const clean = raw.trim().replace(/^[@#]/, "");
    if (!clean) return;
    if (!form[key].includes(clean)) set(key, [...form[key], clean]);
  };

  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6">
      <Link
        href="/ugc/campaign-center"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6B7280] hover:text-[#FF5A1F]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Campaign Center
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#FF5A1F]">
            Campaign Center
          </p>
          <h1 className="mt-1 text-[24px] font-bold tracking-tight text-[#111827] sm:text-[28px]">
            {activeCampaignId && !duplicateId && !templateId
              ? "Edit Campaign"
              : "Create Campaign"}
          </h1>
          <p className="mt-1 text-[13px] text-[#6B7280]">
            Professional multi-step setup with autosave and validation.
          </p>
        </div>
        {autoSavedAt && !activeCampaignId ? (
          <p className="text-[11px] font-medium text-[#9CA3AF]">Autosaved {autoSavedAt}</p>
        ) : null}
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
        <div
          className="h-full rounded-full bg-[#FF5A1F] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition",
              i === step
                ? "bg-[#FFF0E8] text-[#FF5A1F]"
                : i < step
                  ? "bg-[#ECFDF5] text-[#059669]"
                  : "bg-[#F9FAFB] text-[#9CA3AF]",
            )}
          >
            {i < step ? <Check className="mr-1 inline h-3 w-3" /> : null}
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-[#EEF0F2] bg-white p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] sm:p-6">
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set("campaign_type", t.value)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition",
                  form.campaign_type === t.value
                    ? "border-[#FF5A1F] bg-[#FFF8F5] shadow-[0_0_0_3px_rgba(255,90,31,0.12)]"
                    : "border-[#E5E7EB] hover:border-[#FF5A1F]/40",
                )}
              >
                <p className="text-[14px] font-bold text-[#111827]">{t.label}</p>
                <p className="mt-1 text-[12px] text-[#6B7280]">{t.desc}</p>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Campaign Title" required>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Summer Glow Creator Challenge"
                className={inputCls}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={5}
                placeholder="Brief, creative direction, do's and don'ts…"
                className={cn(inputCls, "resize-none")}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Field label="Reward Model">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["per_views", "Per 1K views"],
                    ["fixed_per_content", "Fixed per post"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => set("payment_model", val)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-[13px] font-semibold",
                      form.payment_model === val
                        ? "border-[#FF5A1F] bg-[#FFF8F5] text-[#FF5A1F]"
                        : "border-[#E5E7EB] text-[#374151]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            {form.payment_model === "per_views" ? (
              <Field label="Rate per 1K views (USD)">
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={form.rate_per_1k_views}
                  onChange={(e) => set("rate_per_1k_views", Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
            ) : (
              <Field label="Fixed rate per content (USD)">
                <input
                  type="number"
                  min={1}
                  value={form.fixed_rate}
                  onChange={(e) => set("fixed_rate", Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Total budget (USD)" required>
                <input
                  type="number"
                  min={1}
                  value={form.total_budget}
                  onChange={(e) => set("total_budget", Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Max payout per submission">
                <input
                  type="number"
                  min={1}
                  value={form.max_payout_per_sub}
                  onChange={(e) => set("max_payout_per_sub", Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Views goal (optional note in brief)">
              <input
                type="number"
                min={0}
                placeholder="e.g. 100000"
                className={inputCls}
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (n > 0 && !form.description.includes("Views goal")) {
                    set(
                      "description",
                      `${form.description.trim()}\n\nViews goal: ${n.toLocaleString()}`.trim(),
                    );
                  }
                }}
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Field label="Content Platforms">
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const on = form.allowed_platforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() =>
                        set(
                          "allowed_platforms",
                          on
                            ? form.allowed_platforms.filter((x) => x !== p)
                            : [...form.allowed_platforms, p],
                        )
                      }
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[12px] font-bold capitalize",
                        on ? "bg-[#FF5A1F] text-white" : "bg-[#F3F4F6] text-[#4B5563]",
                      )}
                    >
                      {p === "x" ? "X" : p}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Countries">
                <input
                  value={form.countries}
                  onChange={(e) => set("countries", e.target.value)}
                  placeholder="e.g. Rwanda, Kenya, Global"
                  className={inputCls}
                />
              </Field>
              <Field label="Languages">
                <input
                  value={form.languages}
                  onChange={(e) => set("languages", e.target.value)}
                  placeholder="e.g. English, French, Kinyarwanda"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Creator limit">
              <input
                type="number"
                min={1}
                value={form.creator_limit}
                onChange={(e) => set("creator_limit", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Min duration (sec)">
                <input
                  type="number"
                  value={form.min_duration}
                  onChange={(e) => set("min_duration", Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Max duration (sec)">
                <input
                  type="number"
                  value={form.max_duration}
                  onChange={(e) => set("max_duration", Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>
            <TagField
              label="Required hashtags"
              value={tagInput.hashtag}
              onChange={(v) => setTagInput((p) => ({ ...p, hashtag: v }))}
              onAdd={() => {
                addTag("required_hashtags", tagInput.hashtag);
                setTagInput((p) => ({ ...p, hashtag: "" }));
              }}
              tags={form.required_hashtags}
              onRemove={(i) =>
                set(
                  "required_hashtags",
                  form.required_hashtags.filter((_, idx) => idx !== i),
                )
              }
              prefix="#"
            />
            <TagField
              label="Required mentions"
              value={tagInput.mention}
              onChange={(v) => setTagInput((p) => ({ ...p, mention: v }))}
              onAdd={() => {
                addTag("required_mentions", tagInput.mention);
                setTagInput((p) => ({ ...p, mention: "" }));
              }}
              tags={form.required_mentions}
              onRemove={(i) =>
                set(
                  "required_mentions",
                  form.required_mentions.filter((_, idx) => idx !== i),
                )
              }
              prefix="@"
            />
            <TagField
              label="Required keywords"
              value={tagInput.keyword}
              onChange={(v) => setTagInput((p) => ({ ...p, keyword: v }))}
              onAdd={() => {
                addTag("required_keywords", tagInput.keyword);
                setTagInput((p) => ({ ...p, keyword: "" }));
              }}
              tags={form.required_keywords}
              onRemove={(i) =>
                set(
                  "required_keywords",
                  form.required_keywords.filter((_, idx) => idx !== i),
                )
              }
            />
            <label className="flex items-center gap-2 text-[13px] font-medium text-[#374151]">
              <input
                type="checkbox"
                checked={form.requires_face}
                onChange={(e) => set("requires_face", e.target.checked)}
                className="rounded border-[#D1D5DB]"
              />
              Require face on camera
            </label>
            <Field label="Review flow">
              <p className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-3 text-[12.5px] text-[#4B5563]">
                Submissions enter <strong>pending review</strong>. You approve or reject from
                Campaign Center → Active Campaigns / Submissions before payouts.
              </p>
            </Field>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <Field label="Cover / Thumbnail">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-8 text-center hover:border-[#FF5A1F]/50">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#FF5A1F]" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-[#9CA3AF]" />
                )}
                <span className="text-[12.5px] font-semibold text-[#374151]">
                  Upload cover image
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void uploadMedia(e, "banner")}
                />
              </label>
              {form.media.filter((m) => m.usage === "banner").map((m) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={m.url}
                  src={m.url}
                  alt=""
                  className="mt-2 h-28 w-full rounded-xl object-cover"
                />
              ))}
            </Field>
            <Field label="Attachments / examples">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-2 text-[12.5px] font-semibold text-[#374151] hover:bg-[#F9FAFB]">
                <Upload className="h-3.5 w-3.5" />
                Add image or video
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => void uploadMedia(e, "example")}
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {form.media
                  .filter((m) => m.usage !== "banner")
                  .map((m) => (
                    <div key={m.url} className="relative h-16 w-16 overflow-hidden rounded-lg border">
                      {m.type === "video" ? (
                        <video src={m.url} className="h-full w-full object-cover" muted />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                  ))}
              </div>
            </Field>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3 text-[13px] text-[#374151]">
            <ReviewRow label="Type" value={form.campaign_type.replace(/_/g, " ")} />
            <ReviewRow label="Title" value={form.title || "—"} />
            <ReviewRow
              label="Reward"
              value={
                form.payment_model === "per_views"
                  ? `$${form.rate_per_1k_views}/1K · Budget $${form.total_budget}`
                  : `$${form.fixed_rate}/post · Budget $${form.total_budget}`
              }
            />
            <ReviewRow label="Platforms" value={form.allowed_platforms.join(", ") || "—"} />
            <ReviewRow label="Creator limit" value={String(form.creator_limit)} />
            <ReviewRow label="Assets" value={`${form.media.length} file(s)`} />
            <p className="rounded-xl bg-[#FFF8F5] px-3 py-3 text-[12.5px] text-[#9A3412]">
              Next step: fund your campaign (minimum RWF 1,000). It stays in{" "}
              <strong>Pending Funding</strong> until escrow is deposited, then activates
              automatically.
            </p>
          </div>
        )}

        {error ? <p className="mt-4 text-[13px] font-medium text-red-600">{error}</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#F3F4F6] pt-4">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || loading}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#E5E7EB] px-4 text-[13px] font-semibold text-[#374151] disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={loading}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#E5E7EB] px-4 text-[13px] font-semibold text-[#374151] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Draft
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#FF5A1F] px-4 text-[13px] font-bold text-white"
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void continueToFunding()}
                disabled={loading}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#FF5A1F] px-4 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Continue to Funding
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13px] text-[#111827] outline-none transition focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/15";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold text-[#6B7280]">
        {label}
        {required ? <span className="text-[#FF5A1F]"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

function TagField({
  label,
  value,
  onChange,
  onAdd,
  tags,
  onRemove,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  tags: string[];
  onRemove: (i: number) => void;
  prefix?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          className={inputCls}
          placeholder={`Add ${label.toLowerCase()}`}
        />
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-xl bg-[#111827] px-3 text-[12px] font-bold text-white"
        >
          Add
        </button>
      </div>
      {tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t, i) => (
            <button
              key={`${t}-${i}`}
              type="button"
              onClick={() => onRemove(i)}
              className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold text-[#374151]"
            >
              {prefix}
              {t} ×
            </button>
          ))}
        </div>
      ) : null}
    </Field>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#F3F4F6] py-2">
      <span className="text-[12px] font-semibold text-[#9CA3AF]">{label}</span>
      <span className="text-right font-medium capitalize">{value}</span>
    </div>
  );
}
