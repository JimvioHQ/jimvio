"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { UGCCampaign } from "@/types/ugc";
import type {
  ApplicationField,
  JoinConfig,
  JoinEligibilityResult,
  UGCJoinMode,
} from "@/lib/ugc/join-engine";
import { DEFAULT_TERMS } from "@/lib/ugc/join-engine";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ugc/campaign-detail/campaign-detail-ui";
import {
  getCampaignRewardLine,
} from "@/components/ugc/workspace/ugc-campaign-utils";

type JoinContext = {
  joinMode: UGCJoinMode;
  joinConfig: JoinConfig;
  eligibility: JoinEligibilityResult;
  participant: { status: string | null; applicationStatus?: string | null };
};

export function CampaignJoinFlow() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { formatMoney } = useCurrency();

  const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
  const [ctx, setCtx] = useState<JoinContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [success, setSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, pRes, eRes] = await Promise.all([
        fetch(`/api/ugc/campaigns/${id}`),
        fetch(`/api/ugc/campaigns/${id}/participant`),
        fetch(`/api/ugc/campaigns/${id}/eligibility`),
      ]);

      if (cRes.ok) {
        const { campaign: c } = await cRes.json();
        setCampaign(c);
      }
      if (pRes.ok && eRes.ok) {
        const pJson = await pRes.json();
        const eJson = await eRes.json();
        setCtx({
          joinMode: pJson.joinMode ?? eJson.joinMode ?? "instant",
          joinConfig: pJson.joinConfig ?? eJson.joinConfig ?? {},
          eligibility: eJson.eligibility,
          participant: {
            status: pJson.status,
            applicationStatus: pJson.applicationStatus,
          },
        });
        if (pJson.status === "accepted") {
          router.replace(`/ugc/${id}/dashboard`);
          return;
        }
        if (pJson.status === "pending" || pJson.status === "waitlisted") {
          router.replace(`/ugc/${id}/application`);
          return;
        }
      }
    } catch {
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const terms = ctx?.joinConfig?.terms ?? DEFAULT_TERMS;
  const allTermsAccepted = terms.every((t) => termsAccepted[t]);
  const fields = ctx?.joinConfig?.applicationFields ?? [];
  const needsApplication =
    ctx?.joinMode === "application" || ctx?.joinMode === "hybrid";

  const requiredFieldsMet = useMemo(() => {
    return fields
      .filter((f) => f.required)
      .every((f) => (form[f.id] ?? "").trim().length > 0);
  }, [fields, form]);

  const canOpenConfirm =
    allTermsAccepted &&
    !ctx?.eligibility?.blocked &&
    (!needsApplication || requiredFieldsMet);

  const handleSubmit = async () => {
    if (!understood || !canOpenConfirm) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/ugc/campaigns/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
          applicationData: form,
          applicationMessage: form.bio ?? form.experience ?? "",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Could not join campaign");
        return;
      }
      setConfirmOpen(false);
      setSuccess(true);
      toast.success(json.message ?? "Application submitted");
      window.setTimeout(() => {
        router.push("/ugc/applications");
      }, 1600);
    } catch {
      toast.error("Network error. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
      </div>
    );
  }

  if (!campaign || !ctx) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <AlertCircle className="h-8 w-8 text-[#9CA3AF]" />
        <p className="font-semibold text-[#111827]">Campaign unavailable</p>
        <Link href="/ugc" className="text-sm font-semibold text-[#FF5A1F]">
          Back to discover
        </Link>
      </div>
    );
  }

  const modeLabel =
    ctx.joinMode === "instant"
      ? "Instant join"
      : ctx.joinMode === "invite_only"
        ? "Invite only"
        : ctx.joinMode === "hybrid"
          ? "Smart apply"
          : "Application required";

  const reqLines = [
    campaign.min_duration || campaign.max_duration
      ? `Duration ${campaign.min_duration ?? 0}s–${campaign.max_duration ?? "∞"}s`
      : "Flexible duration",
    (campaign.allowed_platforms ?? []).join(", ") || "Any platform",
    campaign.requires_face ? "On-camera required" : "Face optional",
    campaign.ends_at
      ? `Complete by ${new Date(campaign.ends_at).toLocaleDateString()}`
      : "Flexible timeline",
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <div className="border-b border-[#EEF0F2] bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href={`/ugc/${id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#6B7280]"
          >
            <ArrowLeft className="h-4 w-4" />
            Campaign
          </Link>
          <span className="rounded-full bg-[#FFF4EF] px-2.5 py-1 text-[11px] font-bold text-[#FF5A1F]">
            {modeLabel}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 16 }}
              className="grid h-16 w-16 place-items-center rounded-full bg-[#059669] text-white shadow-[0_12px_32px_rgba(5,150,105,0.35)]"
            >
              <Check className="h-8 w-8" strokeWidth={2.5} />
            </motion.div>
            <h1 className="mt-5 text-[24px] font-bold text-[#111827]">You&apos;re in</h1>
            <p className="mt-2 text-[14px] text-[#6B7280]">
              Taking you to My Applications…
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-3xl space-y-5 px-4 py-6"
          >
            <div className="rounded-[18px] border border-[#EEF0F2] bg-white p-5 shadow-sm">
              <h1 className="text-xl font-bold text-[#111827]">{campaign.title}</h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                {getCampaignRewardLine(campaign, formatMoney)} ·{" "}
                {campaign.vendor?.business_name}
              </p>
            </div>

            <div className="rounded-[18px] border border-[#EEF0F2] bg-white p-5 shadow-sm">
              <h2 className="text-[15px] font-bold text-[#111827]">Eligibility</h2>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-2xl font-bold text-[#FF5A1F]">
                  {ctx.eligibility.score}%
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase",
                    ctx.eligibility.level === "eligible"
                      ? "bg-emerald-50 text-emerald-700"
                      : ctx.eligibility.level === "almost"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700",
                  )}
                >
                  {ctx.eligibility.level.replace("_", " ")}
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar value={ctx.eligibility.score} />
              </div>
              {ctx.eligibility.blocked ? (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                  {ctx.eligibility.blockReason ??
                    ctx.eligibility.reasons?.find((r) => !r.met)?.label ??
                    "You are not eligible for this campaign."}
                </p>
              ) : null}
            </div>

            {needsApplication && fields.length > 0 ? (
              <div className="rounded-[18px] border border-[#EEF0F2] bg-white p-5 shadow-sm space-y-3">
                <h2 className="text-[15px] font-bold text-[#111827]">Application</h2>
                {fields.map((f: ApplicationField) => (
                  <label key={f.id} className="block">
                    <span className="text-[12px] font-semibold text-[#6B7280]">
                      {f.label}
                      {f.required ? " *" : ""}
                    </span>
                    {f.type === "long_text" ? (
                      <textarea
                        value={form[f.id] ?? ""}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, [f.id]: e.target.value }))
                        }
                        rows={3}
                        className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
                      />
                    ) : (
                      <input
                        value={form[f.id] ?? ""}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, [f.id]: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
                      />
                    )}
                  </label>
                ))}
              </div>
            ) : null}

            <div className="rounded-[18px] border border-[#EEF0F2] bg-white p-5 shadow-sm">
              <h2 className="text-[15px] font-bold text-[#111827]">Terms</h2>
              <div className="mt-3 space-y-2">
                {terms.map((t) => (
                  <label
                    key={t}
                    className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#EEF0F2] px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(termsAccepted[t])}
                      onChange={(e) =>
                        setTermsAccepted((p) => ({ ...p, [t]: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-[#D1D5DB]"
                    />
                    <span className="text-[13px] text-[#374151]">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-[12px] leading-relaxed text-emerald-800">
                Escrow protects payouts. Review the campaign brief carefully before joining.
              </p>
            </div>

            <button
              type="button"
              disabled={!canOpenConfirm || ctx.joinMode === "invite_only"}
              onClick={() => {
                setUnderstood(false);
                setConfirmOpen(true);
              }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF5A1F] text-[14px] font-bold text-white shadow-[0_8px_24px_rgba(255,90,31,0.35)] disabled:opacity-50"
            >
              {ctx.joinMode === "invite_only" ? "Invite only" : "Continue to confirm"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation modal */}
      <AnimatePresence>
        {confirmOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
            onClick={() => !submitting && setConfirmOpen(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-[#EEF0F2] bg-white shadow-2xl"
            >
              <div className="border-b border-[#F3F4F6] px-5 py-4">
                <h2 className="text-[17px] font-bold text-[#111827]">Confirm join</h2>
                <p className="mt-1 text-[12.5px] text-[#6B7280]">
                  Review the campaign before you apply.
                </p>
              </div>
              <div className="space-y-4 px-5 py-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                    Campaign
                  </p>
                  <p className="mt-0.5 text-[15px] font-bold text-[#111827]">
                    {campaign.title}
                  </p>
                  <p className="text-[12px] text-[#6B7280]">
                    {campaign.vendor?.business_name}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FFF8F5] px-3 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">
                    Reward
                  </p>
                  <p className="mt-0.5 text-[18px] font-bold text-[#111827]">
                    {getCampaignRewardLine(campaign, formatMoney)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                    Requirements
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {reqLines.map((line) => (
                      <li
                        key={line}
                        className="flex items-center gap-2 text-[12.5px] text-[#374151]"
                      >
                        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-[#FF5A1F]" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                    Expected completion
                  </p>
                  <p className="mt-1 text-[13px] text-[#374151]">
                    {campaign.ends_at
                      ? new Date(campaign.ends_at).toLocaleString()
                      : "As agreed in the brief after approval"}
                  </p>
                </div>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-3">
                  <input
                    type="checkbox"
                    checked={understood}
                    onChange={(e) => setUnderstood(e.target.checked)}
                    className="mt-0.5 rounded border-[#D1D5DB]"
                  />
                  <span className="text-[13px] font-medium text-[#111827]">
                    I understand the campaign requirements.
                  </span>
                </label>
              </div>
              <div className="flex gap-2 border-t border-[#F3F4F6] px-5 py-4">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setConfirmOpen(false)}
                  className="h-11 flex-1 rounded-full border border-[#E5E7EB] text-[13px] font-semibold text-[#374151]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!understood || submitting}
                  onClick={() => void handleSubmit()}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#FF5A1F] text-[13px] font-bold text-white disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Join campaign
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
