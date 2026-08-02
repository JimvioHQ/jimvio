"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Copy, Eye, FileStack, Loader2, Pause, Play, Plus, Upload, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill, SectionCard } from "@/components/ugc/campaign-detail/campaign-detail-ui";
import type { UGCCampaign } from "@/types/ugc";

type Props = {
  campaignId: string;
};

function statusTone(status: UGCCampaign["status"]) {
  if (status === "active") return "success";
  if (status === "draft") return "warning";
  if (status === "paused") return "info";
  if (status === "completed") return "neutral";
  if (status === "cancelled") return "danger";
  return "neutral";
}

export default function CampaignManagementClient({ campaignId }: Props) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [increaseOpen, setIncreaseOpen] = useState(false);
  const [increaseAmount, setIncreaseAmount] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ugc/campaigns/${campaignId}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load campaign");
      setCampaign(json.campaign ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy("patch");
      try {
        const res = await fetch(`/api/ugc/campaigns/${campaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Update failed");
        toast.success("Campaign updated");
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Update failed");
      } finally {
        setBusy(null);
      }
    },
    [campaignId, load],
  );

  const duplicate = useCallback(async () => {
    if (!campaign) return;
    setBusy("duplicate");
    try {
      const res = await fetch(`/api/ugc/campaigns/${campaignId}/duplicate`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Duplicate failed");
      toast.success("Campaign duplicated as draft");
      router.push(json.redirectTo || `/ugc/campaign-center/create?duplicate=${json.campaign?.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Duplicate failed");
    } finally {
      setBusy(null);
    }
  }, [campaign, campaignId, router]);

  const saveAsTemplate = useCallback(async () => {
    if (!campaign) return;
    const name = window.prompt("Template name", `${campaign.title} template`);
    if (!name?.trim()) return;
    setBusy("template");
    try {
      const res = await fetch("/api/ugc/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          campaign_id: campaignId,
          description: campaign.description,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save template");
      toast.success("Saved as template");
      router.push("/ugc/campaign-center/templates");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save template");
    } finally {
      setBusy(null);
    }
  }, [campaign, campaignId, router]);

  const archive = useCallback(() => {
    void patch({ status: "cancelled" });
  }, [patch]);

  const doIncrease = useCallback(() => {
    const n = Number(increaseAmount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a valid budget amount");
      return;
    }
    setIncreaseOpen(false);
    setIncreaseAmount("");
    void patch({ total_budget: n });
  }, [increaseAmount, patch]);

  const managementDisabled = loading || !campaign || busy != null;

  const canPause = campaign?.status === "active";
  const canResume = campaign?.status === "paused";

  const draftFundLink = campaign?.status === "draft" ? `/ugc/campaign-center/${campaign.id}/fund` : null;

  const infoPills = useMemo(() => {
    if (!campaign) return [];
    return [
      { label: `${campaign.submission_count ?? 0} submissions`, tone: "neutral" as const },
      { label: `${campaign.approved_count ?? 0} approvals`, tone: "neutral" as const },
      { label: `${campaign.total_views_tracked ?? 0} views`, tone: "neutral" as const },
      { label: `Budget ${Number(campaign.total_budget ?? 0).toLocaleString()} RWF`, tone: "brand" as const },
    ];
  }, [campaign]);

  return (
    <SectionCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">Campaign Management</p>
          <h2 className="mt-1 text-[18px] font-bold text-[#111827] truncate">{campaign?.title ?? "Loading…"}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {campaign ? <Pill tone={statusTone(campaign.status)}>{campaign.status}</Pill> : null}
            {draftFundLink ? (
              <Pill tone="brand">Pending Funding</Pill>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-xl">
            <Link href={`/ugc/${campaignId}`}>
              <Eye className="mr-2 h-4 w-4" />
              View public page
            </Link>
          </Button>
        </div>
      </div>

      {campaign ? (
        <div className="flex flex-wrap items-center gap-2">
          {infoPills.map((p) => (
            <Pill key={p.label} tone={p.tone}>
              {p.label}
            </Pill>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {canPause ? (
          <Button
            disabled={managementDisabled}
            className="rounded-xl bg-amber-600 hover:bg-amber-500"
            onClick={() => void patch({ status: "paused" })}
          >
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
        ) : null}
        {canResume ? (
          <Button
            disabled={managementDisabled}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500"
            onClick={() => void patch({ status: "active" })}
          >
            <Play className="mr-2 h-4 w-4" />
            Resume
          </Button>
        ) : null}
        <Button disabled={managementDisabled} variant="outline" className="rounded-xl" onClick={() => void duplicate()}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </Button>
        <Button
          disabled={managementDisabled}
          variant="outline"
          className="rounded-xl"
          onClick={() => void saveAsTemplate()}
        >
          <FileStack className="mr-2 h-4 w-4" />
          Save as template
        </Button>
        <Button
          disabled={managementDisabled}
          variant="destructive"
          className="rounded-xl"
          onClick={() => {
            if (!confirm(`Archive "${campaign?.title}"?`)) return;
            archive();
          }}
        >
          <Archive className="mr-2 h-4 w-4" />
          Archive
        </Button>

        <Button
          disabled={managementDisabled}
          variant="outline"
          className="rounded-xl"
          onClick={() => setIncreaseOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Increase budget
        </Button>

        <Button asChild disabled={managementDisabled} size="sm" variant="outline" className="rounded-xl">
          <Link href={`/ugc/campaign-center/${campaignId}/participants`}>
            <Users className="mr-2 h-4 w-4" />
            View participants
          </Link>
        </Button>

        <Button asChild disabled={managementDisabled} size="sm" variant="outline" className="rounded-xl">
          <Link href={`/ugc/campaign-center/${campaignId}/funding`}>
            <Wallet className="mr-2 h-4 w-4" />
            Funding history
          </Link>
        </Button>

        <Button asChild disabled={managementDisabled} size="sm" variant="outline" className="rounded-xl">
          <Link href={`/ugc/campaign-center/${campaignId}/payments`}>
            <Wallet className="mr-2 h-4 w-4" />
            Payment history
          </Link>
        </Button>

        <Button asChild disabled={managementDisabled} size="sm" variant="outline" className="rounded-xl">
          <Link href="/ugc/campaign-center/analytics">
            <Eye className="mr-2 h-4 w-4" />
            View analytics
          </Link>
        </Button>

        {draftFundLink ? (
          <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F] hover:bg-[#E54E18]">
            <Link href={draftFundLink}>
              <Upload className="mr-2 h-4 w-4" />
              Fund & activate
            </Link>
          </Button>
        ) : null}
      </div>

      {increaseOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[24px] border border-[#EEF0F2] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-[#111827]">Increase campaign budget</h3>
                <p className="mt-1 text-[13px] text-[#6B7280]">
                  Updates `total_budget` for this campaign (used for future payout calculations).
                </p>
              </div>
              <button
                type="button"
                className="h-9 w-9 rounded-full border border-[#E5E7EB] hover:bg-[#F9FAFB]"
                aria-label="Close"
                onClick={() => setIncreaseOpen(false)}
              >
                <span className="mx-auto block h-4 w-4 text-center leading-9 text-[#6B7280]">×</span>
              </button>
            </div>

            <label className="mt-4 block text-[12px] font-semibold text-[#374151]">
              New total budget (RWF)
              <input
                value={increaseAmount}
                onChange={(e) => setIncreaseAmount(e.target.value)}
                inputMode="numeric"
                className="mt-2 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm"
                placeholder={`${campaign?.total_budget ?? 0}`}
              />
            </label>

            <div className="mt-4 flex gap-3">
              <Button variant="outline" className="rounded-xl flex-1" onClick={() => setIncreaseOpen(false)} disabled={busy != null}>
                Cancel
              </Button>
              <Button className="rounded-xl flex-1 bg-[#FF5A1F] hover:bg-[#E54E18]" onClick={() => doIncrease()} disabled={busy != null}>
                {busy === "patch" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update budget
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

