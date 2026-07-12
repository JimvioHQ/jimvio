"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { UGCCampaign } from "@/types/ugc";
import type { ApplicationField, JoinConfig, JoinEligibilityResult, UGCJoinMode } from "@/lib/ugc/join-engine";
import { DEFAULT_TERMS } from "@/lib/ugc/join-engine";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ugc/campaign-detail/campaign-detail-ui";

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
  const needsApplication = ctx?.joinMode === "application" || ctx?.joinMode === "hybrid";

  const requiredFieldsMet = useMemo(() => {
    return fields
      .filter((f) => f.required)
      .every((f) => (form[f.id] ?? "").trim().length > 0);
  }, [fields, form]);

  const canSubmit =
    allTermsAccepted &&
    !ctx?.eligibility?.blocked &&
    (!needsApplication || requiredFieldsMet);

  const handleSubmit = async () => {
    if (!canSubmit) return;
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
      toast.success(json.message ?? "Success");
      router.push(json.redirectTo ?? `/ugc/${id}/dashboard`);
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

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <div className="border-b border-[#EEF0F2] bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href={`/ugc/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#6B7280]">
            <ArrowLeft className="h-4 w-4" />
            Campaign
          </Link>
          <span className="rounded-full bg-[#FFF4EF] px-2.5 py-1 text-[11px] font-bold text-[#FF5A1F]">
            {modeLabel}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-5">
          <h1 className="text-xl font-bold text-[#111827]">{campaign.title}</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {formatMoney(campaign.rate_per_1k_views, "USD")} / 1K views ·{" "}
            {campaign.vendor?.business_name}
          </p>
        </div>

        <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-5">
          <h2 className="text-[15px] font-bold text-[#111827]">Eligibility</h2>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-2xl font-bold text-[#FF5A1F]">{ctx.eligibility.score}%</span>
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
          {ctx.eligibility.blockReason ? (
            <p className="mt-2 text-sm text-rose-600">{ctx.eligibility.blockReason}</p>
          ) : null}
          <ul className="mt-3 space-y-1.5">
            {ctx.eligibility.reasons.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-[12px] text-[#4B5563]">
                <CheckCircle className={cn("h-3.5 w-3.5", r.met ? "text-emerald-500" : "text-[#D1D5DB]")} />
                {r.label}
              </li>
            ))}
          </ul>
        </div>

        {needsApplication && fields.length > 0 ? (
          <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-5">
            <h2 className="text-[15px] font-bold text-[#111827]">Application</h2>
            <div className="mt-4 space-y-3">
              {fields.map((field) => (
                <FieldInput
                  key={field.id}
                  field={field}
                  value={form[field.id] ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, [field.id]: v }))}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-5">
          <h2 className="text-[15px] font-bold text-[#111827]">Terms &amp; agreements</h2>
          <div className="mt-3 space-y-2">
            {terms.map((term) => (
              <label key={term} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#EEF0F2] p-3">
                <input
                  type="checkbox"
                  checked={Boolean(termsAccepted[term])}
                  onChange={(e) =>
                    setTermsAccepted((t) => ({ ...t, [term]: e.target.checked }))
                  }
                  className="mt-0.5"
                />
                <span className="text-[13px] text-[#374151]">I agree to the {term}</span>
              </label>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="h-12 w-full rounded-2xl bg-[#FF5A1F] text-base font-bold hover:bg-[#E54E18]"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : ctx.joinMode === "instant" ? (
            "Join campaign"
          ) : (
            "Submit application"
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
          <ShieldCheck className="h-4 w-4 text-[#FF5A1F]" />
          Secure · Escrow protected · Fraud monitored
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ApplicationField;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = (
    <span className="text-[12px] font-semibold text-[#374151]">
      {field.label}
      {field.required ? <span className="text-rose-500"> *</span> : null}
    </span>
  );

  if (field.type === "long_text") {
    return (
      <label className="block space-y-1">
        {label}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={field.placeholder}
          className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
        />
      </label>
    );
  }

  return (
    <label className="block space-y-1">
      {label}
      <input
        type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
      />
    </label>
  );
}
