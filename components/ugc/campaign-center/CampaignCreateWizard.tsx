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
import type { UGCCampaignType } from "@/types/ugc";
import { cloudinaryService } from "@/services/media/cloudinary";
import { cn } from "@/lib/utils";
import {
  CAMPAIGN_WIZARD_STEPS,
  CAMPAIGN_TYPES,
  canOpenCampaignWizardStep,
  campaignWizardIncompleteSteps,
  campaignWizardProgressPercent,
  coerceFiniteNumber,
  firstIncompleteCampaignStep,
  isCampaignStepComplete,
  parseCampaignWizardStepParam,
  validateCampaignStep,
  validateCampaignWizardReady,
} from "@/lib/ugc/campaign-wizard-validation";
import { useUgcBrandWorkspace } from "@/components/ugc/workspace/UgcBrandWorkspaceProvider";
import { useLocale } from "@/context/LocaleContext";
import { CountryMultiSelect } from "@/components/ugc/campaign-center/CountryMultiSelect";
import {
  CONTENT_FORMATS,
  countryPolicyFromJoinConfig,
  mediaFromBrief,
  mergeJoinConfigBrief,
  platformLabel,
  readCampaignBrief,
  type BriefLink,
  type ContentFormat,
} from "@/lib/ugc/campaign-brief";

const STEP_KEY = "jimvio-campaign-center-step-v1";

const TYPES: {
  value: UGCCampaignType;
  labelKey: "typeUgc" | "typeClipping" | "typeMusic" | "typePromotion";
  descKey: "typeUgcDesc" | "typeClippingDesc" | "typeMusicDesc" | "typePromotionDesc";
}[] = [
  { value: "ugc", labelKey: "typeUgc", descKey: "typeUgcDesc" },
  { value: "clipping", labelKey: "typeClipping", descKey: "typeClippingDesc" },
  { value: "music_clipping", labelKey: "typeMusic", descKey: "typeMusicDesc" },
  { value: "promotion", labelKey: "typePromotion", descKey: "typePromotionDesc" },
];

const PLATFORMS = ["tiktok", "instagram", "youtube", "facebook"] as const;

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
  /** Optional last day of the campaign (yyyy-mm-dd). */
  ends_at: string;
  join_mode: "instant" | "application" | "invite_only" | "hybrid";
  content_format: ContentFormat;
  deliverable_count: number;
  deliverable_label: string;
  key_requirements: string;
  product_visibility: string;
  caption_notes: string;
  language: string;
  restrictions: string;
  submission_instructions: string;
  all_countries: boolean;
  country_codes: string[];
  references: BriefLink[];
  resources: BriefLink[];
  assets: BriefLink[];
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
  ends_at: "",
  join_mode: "instant",
  content_format: "vertical_video",
  deliverable_count: 1,
  deliverable_label: "Original UGC video",
  key_requirements: "Be authentic and natural\nShow the product clearly\nUse the brand's key message\nHigh-quality video and clear audio",
  product_visibility: "Show the product clearly",
  caption_notes: "",
  language: "",
  restrictions: "",
  submission_instructions: "",
  all_countries: true,
  country_codes: [],
  references: [],
  resources: [],
  assets: [],
};

const DRAFT_KEY = "jimvio-campaign-center-draft-v1";

function briefFromStored(description: string): string {
  const cut = description.search(/\n\n(?:Countries|Languages|Creator limit):/);
  return (cut === -1 ? description : description.slice(0, cut)).trim();
}

type CampaignCreateWizardProps = {
  editId?: string;
};

export function CampaignCreateWizard({ editId }: CampaignCreateWizardProps) {
  const { ugcFetch, brandId } = useUgcBrandWorkspace();
  const { t } = useLocale();
  const STEPS = [
    t("wizardStepType"),
    t("wizardStepBasics"),
    t("wizardStepRewards"),
    t("wizardStepTargeting"),
    t("wizardStepRequirements"),
    t("wizardStepAssets"),
    t("wizardStepReview"),
  ];

  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const templateId = searchParams.get("template");
  const stepParam = searchParams.get("step");
  const sourceId = editId || duplicateId || templateId || undefined;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState({ hashtag: "", mention: "", keyword: "" });
  const [activeCampaignId, setActiveCampaignId] = useState<string | undefined>(editId);
  const [persistedStatus, setPersistedStatus] = useState("draft");
  const hydrated = useRef(false);
  const moneyLocked = persistedStatus === "active" || persistedStatus === "paused" || persistedStatus === "completed";

  const set = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: val }));
  }, []);

  const applyCampaign = useCallback((c: Record<string, unknown>) => {
    const loadedType = CAMPAIGN_TYPES.includes(c.campaign_type as (typeof CAMPAIGN_TYPES)[number])
      ? (c.campaign_type as FormState["campaign_type"])
      : typeof c.campaign_type === "string" && c.campaign_type
        ? (c.campaign_type as FormState["campaign_type"])
        : "ugc";
    const brief = readCampaignBrief({
      join_config: c.join_config as never,
      media: Array.isArray(c.media) ? (c.media as never) : [],
    });
    const policy = countryPolicyFromJoinConfig(c.join_config);
    const next: FormState = {
      ...DEFAULT_FORM,
      title: String(c.title ?? ""),
      description: briefFromStored(String(c.description ?? "")),
      campaign_type: loadedType,
      payment_model: c.payment_model === "fixed_per_content" ? "fixed_per_content" : "per_views",
      rate_per_1k_views: coerceFiniteNumber(c.rate_per_1k_views) ?? 0,
      fixed_rate: coerceFiniteNumber(c.fixed_rate) ?? 0,
      total_budget: coerceFiniteNumber(c.total_budget) ?? 0,
      max_payout_per_sub: coerceFiniteNumber(c.max_payout_per_sub) ?? 0,
      allowed_platforms: Array.isArray(c.allowed_platforms)
        ? (c.allowed_platforms as string[]).filter((platform) => platform !== "x" && platform !== "twitter")
        : [],
      min_duration: coerceFiniteNumber(c.min_duration) ?? 0,
      max_duration: coerceFiniteNumber(c.max_duration) ?? 0,
      required_hashtags: Array.isArray(c.required_hashtags) ? (c.required_hashtags as string[]) : [],
      required_mentions: Array.isArray(c.required_mentions) ? (c.required_mentions as string[]) : [],
      required_keywords: Array.isArray(c.required_keywords) ? (c.required_keywords as string[]) : [],
      requires_face: Boolean(c.requires_face),
      join_mode: ["instant", "application", "invite_only", "hybrid"].includes(String(c.join_mode))
        ? (c.join_mode as FormState["join_mode"])
        : "instant",
      creator_limit:
        Number.isFinite(Number(c.max_participants)) && Number(c.max_participants) > 0
          ? Math.floor(Number(c.max_participants))
          : 0,
      ends_at: typeof c.ends_at === "string" && c.ends_at ? c.ends_at.slice(0, 10) : "",
      content_format:
        brief.contentFormat ??
        (Number(c.min_duration) > 0 || Number(c.max_duration) > 0 ? "vertical_video" : "other"),
      deliverable_count: brief.deliverableCount ?? 0,
      deliverable_label: brief.deliverableLabel,
      key_requirements: brief.keyRequirements.join("\n"),
      product_visibility: brief.productVisibility,
      caption_notes: brief.captionNotes,
      language: brief.language,
      restrictions: brief.restrictions,
      submission_instructions: brief.submissionInstructions,
      all_countries: policy.mode === "all",
      country_codes: policy.codes,
      references: brief.references,
      resources: brief.resources,
      assets: brief.assets,
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
    };
    setForm(next);
    return next;
  }, []);

  // Load local autosave, edit target, duplicate, or template campaign
  useEffect(() => {
    let cancelled = false;
    const requestedStep = parseCampaignWizardStepParam(stepParam);
    const restoreStep = (draft: FormState) => {
      let saved: number | null = null;
      try {
        const raw = sessionStorage.getItem(STEP_KEY);
        saved = raw != null ? Number(raw) : null;
        if (!Number.isInteger(saved)) saved = null;
      } catch {
        saved = null;
      }
      const candidate = requestedStep ?? saved ?? 0;
      const target = canOpenCampaignWizardStep(draft, candidate)
        ? candidate
        : firstIncompleteCampaignStep(draft);
      if (!cancelled) setStep(target);
    };

    (async () => {
      if (sourceId) {
        try {
          const res = await ugcFetch(`/api/ugc/campaigns/${sourceId}`);
          const json = await res.json();
          const c = json.campaign;
          if (!c || cancelled) return;
          const next = applyCampaign(c);
          if (editId) {
            setActiveCampaignId(String(c.id ?? editId));
            setPersistedStatus(typeof c.status === "string" ? c.status : "draft");
          } else {
            setActiveCampaignId(undefined);
            setPersistedStatus("draft");
          }
          restoreStep(next);
        } catch {
          toast.error(t("couldNotLoadCampaign"));
        }
        hydrated.current = true;
        return;
      }

      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as FormState;
          const next = { ...DEFAULT_FORM, ...parsed };
          if (!cancelled) {
            setForm(next);
            restoreStep(next);
          }
        } else if (requestedStep != null && !cancelled) {
          restoreStep(DEFAULT_FORM);
        }
      } catch {
        /* ignore */
      }
      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- locale helper is stable for this load
  }, [sourceId, applyCampaign, stepParam, ugcFetch, editId]);

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

  const persistLocalDraft = useCallback((nextForm: FormState, nextStep?: number) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(nextForm));
      if (typeof nextStep === "number") {
        sessionStorage.setItem(STEP_KEY, String(nextStep));
      }
      setAutoSavedAt(new Date().toLocaleTimeString());
      return true;
    } catch {
      return false;
    }
  }, []);

  const applyStepErrors = (errors: { field: string; message: string }[]) => {
    setError(errors.map((e) => e.message).join(" · "));
    setFieldErrors(Object.fromEntries(errors.map((e) => [e.field, e.message])));
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
      toast.success(t("assetUploaded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const uploadBriefFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    bucket: "references" | "resources" | "assets",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    const max = isVideo ? 80_000_000 : isPdf ? 15_000_000 : 8_000_000;
    if (!isVideo && !isImage && !isPdf) {
      toast.error("Use an image, video, or PDF.");
      e.target.value = "";
      return;
    }
    if (file.size > max) {
      toast.error("That file is too large.");
      e.target.value = "";
      return;
    }
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
        isVideo ? "video" : isImage ? "image" : "raw",
      );
      if (!res.success || !res.data) throw new Error(res.error || "Upload failed");
      const link: BriefLink = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Untitled",
        url: res.data.secure_url,
        note: "",
        kind: isVideo ? "video" : isImage ? "image" : "file",
        fileType: isPdf ? "PDF" : isVideo ? "VIDEO" : "IMAGE",
      };
      setForm((prev) => ({ ...prev, [bucket]: [...prev[bucket], link] }));
      toast.success(t("assetUploaded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const addBriefLink = (bucket: "references" | "resources" | "assets", url: string) => {
    const safe = url.trim();
    if (!/^https?:\/\//i.test(safe)) {
      toast.error("Enter an https link.");
      return;
    }
    const link: BriefLink = {
      id: crypto.randomUUID(),
      title: bucket === "references" ? "Reference" : bucket === "resources" ? "Resource" : "Brand asset",
      url: safe,
      note: "",
      kind: "link",
      fileType: "LINK",
    };
    setForm((prev) => ({ ...prev, [bucket]: [...prev[bucket], link] }));
  };

  const payload = useMemo(() => {
    const description = form.description.trim();
    const briefInput = {
      contentFormat: form.content_format,
      deliverableCount: form.deliverable_count > 0 ? form.deliverable_count : null,
      deliverableLabel: form.deliverable_label,
      keyRequirements: form.key_requirements,
      productVisibility: form.product_visibility,
      captionNotes: form.caption_notes,
      language: form.language,
      restrictions: form.restrictions,
      submissionInstructions: form.submission_instructions,
      allCountries: form.all_countries,
      countryCodes: form.country_codes,
      references: form.references,
      resources: form.resources,
      assets: form.assets,
    };
    const video = form.content_format === "vertical_video" || form.content_format === "horizontal_video";

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
      min_duration: video && form.min_duration > 0 ? form.min_duration : null,
      max_duration: video && form.max_duration > 0 ? form.max_duration : null,
      required_hashtags: form.required_hashtags,
      required_mentions: form.required_mentions,
      required_keywords: form.required_keywords,
      requires_face: form.requires_face,
      music_track_url: form.music_track_url || undefined,
      music_artist_name: form.music_artist_name || undefined,
      promotion_target: form.promotion_target || undefined,
      promotion_target_url: form.promotion_target_url || undefined,
      media: mediaFromBrief(
        form.media
          .filter((item) => item.usage === "banner")
          .map((item) => ({
            type: item.type === "video" || item.type === "file" ? item.type : "image",
            url: item.url,
            usage: "banner" as const,
            thumbnail_url: null,
          })),
        {
          contentFormat: form.content_format,
          deliverableCount: briefInput.deliverableCount,
          deliverableLabel: form.deliverable_label,
          keyRequirements: form.key_requirements.split("\n").map((line) => line.trim()).filter(Boolean),
          productVisibility: form.product_visibility,
          captionNotes: form.caption_notes,
          language: form.language,
          restrictions: form.restrictions,
          submissionInstructions: form.submission_instructions,
          references: form.references,
          resources: form.resources,
          assets: form.assets,
        },
      ),
      join_config: mergeJoinConfigBrief({}, briefInput),
      join_mode: form.join_mode,
      max_participants: form.creator_limit > 0 ? Math.floor(form.creator_limit) : null,
      ends_at: /^\d{4}-\d{2}-\d{2}$/.test(form.ends_at) ? new Date(`${form.ends_at}T23:59:59`).toISOString() : null,
      brand_id: brandId || undefined,
      content_format: form.content_format,
      all_countries: form.all_countries,
      country_codes: form.country_codes,
    };
  }, [form, brandId]);

  const serverDraftPatch = (extra: Record<string, unknown> = {}) => {
    const patch: Record<string, unknown> = {
      title: payload.title,
      description: payload.description,
      campaign_type: payload.campaign_type,
      allowed_platforms: payload.allowed_platforms,
      min_duration: payload.min_duration,
      max_duration: payload.max_duration,
      required_hashtags: payload.required_hashtags,
      required_mentions: payload.required_mentions,
      required_keywords: payload.required_keywords,
      requires_face: payload.requires_face,
      join_config: payload.join_config,
      join_mode: payload.join_mode,
      max_participants: payload.max_participants,
      ends_at: payload.ends_at,
      media: payload.media,
      ...extra,
    };
    if (!moneyLocked) {
      patch.payment_model = payload.payment_model;
      patch.rate_per_1k_views = payload.rate_per_1k_views;
      patch.fixed_rate = payload.fixed_rate;
      patch.total_budget = payload.total_budget;
      patch.max_payout_per_sub = payload.max_payout_per_sub;
    }
    if (persistedStatus === "draft") patch.status = "draft";
    return patch;
  };

  const persistServerDraft = async (): Promise<boolean> => {
    if (!activeCampaignId) return true;
    const res = await ugcFetch(`/api/ugc/campaigns/${activeCampaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serverDraftPatch()),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as { error?: string }).error || "Save failed");
    return true;
  };

  const progress = campaignWizardProgressPercent(form);

  const next = async () => {
    const result = validateCampaignStep(step, form);
    if (!result.success) {
      applyStepErrors(result.errors);
      return;
    }
    setError("");
    setFieldErrors({});
    if (!persistLocalDraft(form, step)) {
      setError("Could not save this step. Try again.");
      return;
    }
    if (activeCampaignId) {
      setLoading(true);
      try {
        await persistServerDraft();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save this step. Try again.");
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    const nextIndex = Math.min(step + 1, STEPS.length - 1);
    persistLocalDraft(form, nextIndex);
    setStep(nextIndex);
  };

  const back = () => {
    setError("");
    setFieldErrors({});
    setStep((v) => Math.max(v - 1, 0));
  };

  const goToStep = (target: number) => {
    if (!canOpenCampaignWizardStep(form, target)) {
      const first = firstIncompleteCampaignStep(form);
      const result = validateCampaignStep(first, form);
      applyStepErrors(
        result.errors.length
          ? result.errors
          : [{ field: "step", message: "Complete the previous required steps first." }],
      );
      setStep(first);
      return;
    }
    setError("");
    setFieldErrors({});
    setStep(target);
    persistLocalDraft(form, target);
  };

  const saveDraft = async () => {
    const basics = validateCampaignStep("basics", form);
    const rewards = validateCampaignStep("rewards", form);
    if (!basics.success) {
      applyStepErrors(basics.errors);
      setStep(1);
      return;
    }
    if (!rewards.success) {
      applyStepErrors(rewards.errors);
      setStep(2);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (activeCampaignId) {
        const res = await ugcFetch(`/api/ugc/campaigns/${activeCampaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serverDraftPatch()),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Save failed");
        if (persistedStatus === "draft") {
          toast.success(t("draftUpdated"));
          router.push("/ugc/campaign-center/drafts");
        } else {
          toast.success("Campaign saved. Its status is unchanged.");
          router.push("/ugc/campaigns?workspace=manage");
        }
        return;
      }

      const res = await ugcFetch("/api/ugc/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Save failed");
      localStorage.removeItem(DRAFT_KEY);
      toast.success(t("draftSaved"));
      router.push("/ugc/campaign-center/drafts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const continueToFunding = async () => {
    const ready = validateCampaignWizardReady(form);
    if (!ready.success) {
      applyStepErrors(ready.errors);
      setStep(firstIncompleteCampaignStep(form));
      return;
    }
    setLoading(true);
    setError("");
    try {
      let id = activeCampaignId;
      if (!id) {
        const res = await ugcFetch("/api/ugc/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, readyForFunding: true }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const missing = Array.isArray(json.missing)
            ? (json.missing as { message?: string }[]).map((m) => m.message).filter(Boolean).join(" · ")
            : "";
          throw new Error(missing || json.error || "Create failed");
        }
        id = json.campaign?.id as string;
        localStorage.removeItem(DRAFT_KEY);
      } else {
        const res = await ugcFetch(`/api/ugc/campaigns/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serverDraftPatch({ readyForFunding: true })),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const missing = Array.isArray(json.missing)
            ? (json.missing as { message?: string }[]).map((m) => m.message).filter(Boolean).join(" · ")
            : "";
          throw new Error(missing || json.error || "Update failed");
        }
      }

      toast.success(t("campaignReadyFund"));
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
    <div className="mx-auto w-full min-w-0 max-w-[920px] px-4 py-6 sm:px-6">
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
            {editId ? "Edit Campaign" : t("createCampaign")}
          </h1>
          <p className="mt-1 text-[13px] text-[#6B7280]">
            {editId
              ? `Current status: ${persistedStatus.replaceAll("_", " ")}. Saving keeps this status.`
              : "Professional multi-step setup with autosave and validation."}
          </p>
          {editId ? (
            <Link
              href={`/ugc/${editId}`}
              className="mt-2 inline-flex text-[13px] font-semibold text-[#FF5A1F] hover:underline"
            >
              Preview campaign
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/ugc/campaign-center/copilot"
            className="inline-flex items-center rounded-xl border border-[#FFE4D6] bg-[#FFF8F5] px-3 py-1.5 text-[12px] font-semibold text-[#FF5A1F] hover:bg-[#FFF0E8]"
          >
            AI Copilot
          </Link>
          {autoSavedAt && !activeCampaignId ? (
            <p className="text-[11px] font-medium text-[#9CA3AF]">Autosaved {autoSavedAt}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
        <div
          className="h-full rounded-full bg-[#FF5A1F] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, i) => {
          const complete = isCampaignStepComplete(form, i);
          return (
          <button
            key={label}
            type="button"
            onClick={() => goToStep(i)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition",
              i === step
                ? "bg-[#FFF0E8] text-[#FF5A1F]"
                : complete
                  ? "bg-[#ECFDF5] text-[#059669]"
                  : "bg-[#F9FAFB] text-[#9CA3AF]",
            )}
          >
            {complete && i !== step ? <Check className="mr-1 inline h-3 w-3" /> : null}
            {label}
          </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-[#EEF0F2] bg-white p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] sm:p-6">
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {TYPES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => set("campaign_type", item.value)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition",
                  form.campaign_type === item.value
                    ? "border-[#FF5A1F] bg-[#FFF8F5] shadow-[0_0_0_3px_rgba(255,90,31,0.12)]"
                    : "border-[#E5E7EB] hover:border-[#FF5A1F]/40",
                )}
              >
                <p className="text-[14px] font-bold text-[#111827]">{t(item.labelKey)}</p>
                <p className="mt-1 text-[12px] text-[#6B7280]">{t(item.descKey)}</p>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label={t("wizardTitle")} required error={fieldErrors.title}>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={t("wizardPhTitle")}
                className={inputCls}
              />
            </Field>
            <Field label={t("wizardDescription")}>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={5}
                placeholder={t("wizardPhDescription")}
                className={cn(inputCls, "resize-none")}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <fieldset disabled={moneyLocked} className="space-y-4 disabled:opacity-70">
            {moneyLocked ? (
              <p className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 text-[12.5px] text-[#4B5563]">
                Reward amounts stay locked after the campaign is live so escrow and payouts are not reset.
              </p>
            ) : null}
            <Field label={t("wizardRewardModel")}>
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
              <Field label={t("wizardRatePer1k")} required error={fieldErrors.rate_per_1k_views}>
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
              <Field label={t("wizardFixedRate")} required error={fieldErrors.fixed_rate}>
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
              <Field label={t("wizardTotalBudget")} required error={fieldErrors.total_budget}>
                <input
                  type="number"
                  min={1}
                  value={form.total_budget}
                  onChange={(e) => set("total_budget", Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label={t("wizardMaxPayout")}>
                <input
                  type="number"
                  min={1}
                  value={form.max_payout_per_sub}
                  onChange={(e) => set("max_payout_per_sub", Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label={t("wizardViewsGoal")}>
              <input
                type="number"
                min={0}
                placeholder={t("wizardPhViews")}
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
          </fieldset>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Field label={t("wizardPlatforms")} required error={fieldErrors.allowed_platforms}>
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
                      {platformLabel(p)}
                    </button>
                  );
                })}
              </div>
            </Field>
            <CountryMultiSelect
              allCountries={form.all_countries}
              codes={form.country_codes}
              onAllCountries={(value) => set("all_countries", value)}
              onCodes={(codes) => set("country_codes", codes)}
            />
            {fieldErrors.country_codes ? (
              <p className="text-[12px] font-medium text-red-600">{fieldErrors.country_codes}</p>
            ) : null}
            <Field label={t("wizardLanguages")}>
              <input
                value={form.language}
                onChange={(e) => set("language", e.target.value)}
                placeholder={t("wizardPhLanguages")}
                className={inputCls}
              />
            </Field>
            <Field label="How creators join">
              <select
                value={form.join_mode}
                onChange={(e) => set("join_mode", e.target.value as FormState["join_mode"])}
                className={inputCls}
              >
                <option value="instant">Join immediately</option>
                <option value="application">Application review</option>
                <option value="hybrid">Auto-accept strong matches</option>
                <option value="invite_only">Invite only</option>
              </select>
            </Field>
            <Field label={t("wizardCreatorLimit")}>
              <input
                type="number"
                min={1}
                value={form.creator_limit}
                onChange={(e) => set("creator_limit", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Campaign ends (optional)">
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={form.ends_at}
                onChange={(e) => set("ends_at", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Field label="Content format">
              <select
                value={form.content_format}
                onChange={(e) => set("content_format", e.target.value as ContentFormat)}
                className={inputCls}
              >
                {CONTENT_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {format === "vertical_video"
                      ? "Vertical video (9:16)"
                      : format === "horizontal_video"
                        ? "Horizontal video (16:9)"
                        : format === "image"
                          ? "Image / photo"
                          : "Other"}
                  </option>
                ))}
              </select>
            </Field>
            {form.content_format === "vertical_video" || form.content_format === "horizontal_video" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("wizardMinDuration")} required error={fieldErrors.min_duration}>
                <input
                  type="number"
                  min={1}
                  value={form.min_duration > 0 ? form.min_duration : ""}
                  onChange={(e) =>
                    set("min_duration", e.target.value === "" ? 0 : Number(e.target.value))
                  }
                  className={inputCls}
                />
              </Field>
              <Field label={t("wizardMaxDuration")} required error={fieldErrors.max_duration}>
                <input
                  type="number"
                  min={1}
                  value={form.max_duration > 0 ? form.max_duration : ""}
                  onChange={(e) =>
                    set("max_duration", e.target.value === "" ? 0 : Number(e.target.value))
                  }
                  className={inputCls}
                />
              </Field>
            </div>
            ) : (
              <p className="text-[12px] text-[#6B7280]">Video length is not required for this format.</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Number of deliverables">
                <input
                  type="number"
                  min={1}
                  value={form.deliverable_count > 0 ? form.deliverable_count : ""}
                  onChange={(e) => set("deliverable_count", e.target.value === "" ? 0 : Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Deliverable">
                <input
                  value={form.deliverable_label}
                  onChange={(e) => set("deliverable_label", e.target.value)}
                  className={inputCls}
                  placeholder="Original UGC video"
                />
              </Field>
            </div>
            <Field label="Key requirements">
              <textarea
                value={form.key_requirements}
                onChange={(e) => set("key_requirements", e.target.value)}
                rows={4}
                className={inputCls}
                placeholder="One requirement per line"
              />
            </Field>
            <Field label="Product visibility">
              <input
                value={form.product_visibility}
                onChange={(e) => set("product_visibility", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Caption, hashtags, mentions, and calls to action">
              <textarea
                value={form.caption_notes}
                onChange={(e) => set("caption_notes", e.target.value)}
                rows={3}
                className={inputCls}
              />
            </Field>
            <TagField
              label={t("wizardHashtags")}
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
              label={t("wizardMentions")}
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
              label={t("wizardKeywords")}
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
            <Field label="Restrictions and brand safety">
              <textarea
                value={form.restrictions}
                onChange={(e) => set("restrictions", e.target.value)}
                rows={3}
                className={inputCls}
              />
            </Field>
            <Field label="Submission instructions">
              <textarea
                value={form.submission_instructions}
                onChange={(e) => set("submission_instructions", e.target.value)}
                rows={3}
                className={inputCls}
              />
            </Field>
            <label className="flex items-center gap-2 text-[13px] font-medium text-[#374151]">
              <input
                type="checkbox"
                checked={form.requires_face}
                onChange={(e) => set("requires_face", e.target.checked)}
                className="rounded border-[#D1D5DB]"
              />
              Require face on camera
            </label>
            <Field label={t("wizardReviewFlow")}>
              <p className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-3 text-[12.5px] text-[#4B5563]">
                Submissions enter <strong>pending review</strong>. You approve or reject from
                Campaign Center → Active Campaigns / Submissions before payouts.
              </p>
            </Field>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <Field label={t("wizardCover")}>
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
            <Field label={t("wizardAttachments")}>
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
            <BriefList
              label="References"
              hint="Example videos, images, or links, plus what the creator should learn."
              items={form.references}
              uploading={uploading}
              onUpload={(e) => void uploadBriefFile(e, "references")}
              onAddLink={(url) => addBriefLink("references", url)}
              onChange={(items) => set("references", items)}
            />
            <BriefList
              label="Resources"
              hint="Briefs, guidelines, scripts, and other documents."
              items={form.resources}
              uploading={uploading}
              accept="image/*,video/*,application/pdf"
              onUpload={(e) => void uploadBriefFile(e, "resources")}
              onAddLink={(url) => addBriefLink("resources", url)}
              onChange={(items) => set("resources", items)}
            />
            <BriefList
              label="Brand assets"
              hint="Logo, product photos, and other files creators may use."
              items={form.assets}
              uploading={uploading}
              onUpload={(e) => void uploadBriefFile(e, "assets")}
              onAddLink={(url) => addBriefLink("assets", url)}
              onChange={(items) => set("assets", items)}
            />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3 text-[13px] text-[#374151]">
            {campaignWizardIncompleteSteps(form).length > 0 ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-[12.5px] text-red-800">
                <p className="font-semibold">This campaign is not ready for funding.</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {campaignWizardIncompleteSteps(form).map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="font-semibold underline decoration-red-300 underline-offset-2"
                        onClick={() => goToStep(CAMPAIGN_WIZARD_STEPS.find((x) => x.id === s.id)?.index ?? 0)}
                      >
                        {s.label}
                      </button>
                      {": "}
                      {s.errors.map((e) => e.message).join(" ")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : persistedStatus === "draft" ? (
              <p className="rounded-xl border border-[#BBF7D0] bg-[#ECFDF5] px-3 py-3 text-[12.5px] text-[#166534]">
                Required campaign data is complete. Fund escrow to activate.
              </p>
            ) : (
              <p className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-3 text-[12.5px] text-[#374151]">
                This campaign stays <strong className="capitalize">{persistedStatus.replaceAll("_", " ")}</strong>.
                Saving does not fund it or change its status.
              </p>
            )}
            <ReviewRow label={t("reviewType")} value={form.campaign_type.replace(/_/g, " ")} />
            <ReviewRow label={t("reviewTitle")} value={form.title.trim() || "—"} />
            <ReviewRow
              label={t("reviewReward")}
              value={
                form.payment_model === "per_views"
                  ? `$${form.rate_per_1k_views}/1K · Budget $${form.total_budget}`
                  : `$${form.fixed_rate}/post · Budget $${form.total_budget}`
              }
            />
            <ReviewRow label={t("reviewPlatforms")} value={form.allowed_platforms.map(platformLabel).join(", ") || "—"} />
            <ReviewRow
              label="Countries"
              value={form.all_countries ? "All countries" : form.country_codes.join(", ") || "—"}
            />
            <ReviewRow label="Content format" value={form.content_format.replaceAll("_", " ")} />
            <ReviewRow
              label={t("reviewDuration")}
              value={
                form.min_duration > 0 && form.max_duration > 0 && form.min_duration <= form.max_duration
                  ? `${form.min_duration}–${form.max_duration}s`
                  : "—"
              }
            />
            <ReviewRow label="Join mode" value={form.join_mode.replaceAll("_", " ")} />
            <ReviewRow label={t("wizardCreatorLimit")} value={form.creator_limit > 0 ? String(form.creator_limit) : "No limit"} />
            <ReviewRow label="Ends" value={form.ends_at ? new Date(`${form.ends_at}T12:00:00`).toLocaleDateString() : "Until the budget runs out"} />
            <ReviewRow
              label={t("wizardHashtags")}
              value={form.required_hashtags.length ? form.required_hashtags.map((t) => `#${t}`).join(" ") : "None"}
            />
            <ReviewRow label={t("reviewAssetsLabel")} value={t("reviewAssets", { count: form.media.length })} />
            {persistedStatus === "draft" && validateCampaignWizardReady(form).success ? (
              <p className="rounded-xl bg-[#FFF8F5] px-3 py-3 text-[12.5px] text-[#9A3412]">
                Next step: fund your campaign (minimum $1.00). It stays in{" "}
                <strong>Pending Funding</strong> until escrow is deposited, then activates
                automatically.
              </p>
            ) : null}
          </div>
        )}

        {error ? <p className="mt-4 text-[13px] font-medium text-red-600">{error}</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#F3F4F6] pt-4">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || loading}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#E5E7EB] px-4 text-[13px] font-semibold text-[#374151] disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("back")}
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#E5E7EB] px-4 text-[13px] font-semibold text-[#374151] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {persistedStatus === "draft" ? t("saveDraft") : "Save changes"}
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => void next()}
                disabled={loading}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#FF5A1F] px-4 text-[13px] font-bold text-white"
              >
                {t("continue")}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : persistedStatus === "draft" ? (
              <button
                type="button"
                onClick={() => void continueToFunding()}
                disabled={loading || !validateCampaignWizardReady(form).success}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#FF5A1F] px-4 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {t("continueToFunding")}
              </button>
            ) : null}
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
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold text-[#6B7280]">
        {label}
        {required ? <span className="text-[#FF5A1F]"> *</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-[12px] font-medium text-red-600">{error}</p> : null}
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
  const { t } = useLocale();
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
          {t("add")}
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

function BriefList({
  label,
  hint,
  items,
  uploading,
  accept = "image/*,video/*",
  onUpload,
  onAddLink,
  onChange,
}: {
  label: string;
  hint: string;
  items: BriefLink[];
  uploading: boolean;
  accept?: string;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddLink: (url: string) => void;
  onChange: (items: BriefLink[]) => void;
}) {
  const [url, setUrl] = useState("");
  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    onChange(copy);
  };
  return (
    <Field label={label}>
      <p className="mb-2 text-[12px] text-[#6B7280]">{hint}</p>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E5E7EB] px-3 py-2 text-[12px] font-semibold">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Upload"}
          <input type="file" accept={accept} className="hidden" onChange={onUpload} />
        </label>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://"
          aria-label={`${label} link`}
          className="min-w-[180px] flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px]"
        />
        <button
          type="button"
          className="rounded-full bg-[#111827] px-3 text-[12px] font-bold text-white"
          onClick={() => {
            onAddLink(url);
            setUrl("");
          }}
        >
          Add link
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={item.id} className="rounded-xl border border-[#EEF0F2] p-3">
            <div className="flex items-start justify-between gap-2">
              <input
                value={item.title}
                aria-label={`${label} title`}
                onChange={(event) =>
                  onChange(items.map((row) => (row.id === item.id ? { ...row, title: event.target.value } : row)))
                }
                className="w-full text-[13px] font-semibold outline-none"
              />
              <button type="button" className="text-[12px] text-[#9CA3AF]" onClick={() => move(index, -1)} aria-label="Move up">
                Up
              </button>
              <button type="button" className="text-[12px] text-[#9CA3AF]" onClick={() => move(index, 1)} aria-label="Move down">
                Down
              </button>
              <button
                type="button"
                className="text-[12px] font-semibold text-red-600"
                onClick={() => onChange(items.filter((row) => row.id !== item.id))}
              >
                Remove
              </button>
            </div>
            <input
              value={item.note}
              aria-label={`${label} note`}
              placeholder="What should the creator learn from this?"
              onChange={(event) =>
                onChange(items.map((row) => (row.id === item.id ? { ...row, note: event.target.value } : row)))
              }
              className="mt-1 w-full text-[12px] text-[#6B7280] outline-none"
            />
          </li>
        ))}
      </ul>
    </Field>
  );
}
