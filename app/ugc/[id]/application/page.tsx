"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { JoinCampaignGateLink } from "@/components/ugc/join/JoinCampaignGateLink";

type ApplicationState = {
  status: string | null;
  applicationStatus: string | null;
  participant: {
    review_feedback?: string | null;
    eligibility_score?: number | null;
    joined_at?: string;
    reviewed_at?: string | null;
  } | null;
};

export default function CampaignApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ApplicationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ugc/campaigns/${id}/participant`);
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      if (json.status === "accepted") {
        router.replace(`/ugc/${id}/`);
        return;
      }
      if (!json.status) {
        router.replace(`/ugc/${id}/join`);
        return;
      }
      setData(json);
    } catch {
      toast.error("Could not load application");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const withdraw = async () => {
    setWithdrawing(true);
    try {
      const res = await fetch(`/api/ugc/campaigns/${id}/application/withdraw`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? "Withdraw failed");
        return;
      }
      toast.success("Application withdrawn");
      router.push(`/ugc/${id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
      </div>
    );
  }

  if (!data) return null;

  const status = data.status ?? "pending";
  const isPending = status === "pending" || status === "waitlisted";
  const isRejected = status === "rejected";

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-6">
      <div className="mx-auto max-w-lg space-y-5">
        <Link href={`/ugc/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#6B7280]">
          <ArrowLeft className="h-4 w-4" />
          Campaign
        </Link>

        <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-6 text-center">
          <div
            className={cn(
              "mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl",
              isPending ? "bg-amber-50" : isRejected ? "bg-rose-50" : "bg-[#F3F4F6]",
            )}
          >
            {isPending ? (
              <Clock className="h-7 w-7 text-amber-600" />
            ) : isRejected ? (
              <XCircle className="h-7 w-7 text-rose-600" />
            ) : (
              <CheckCircle className="h-7 w-7 text-[#6B7280]" />
            )}
          </div>
          <h1 className="text-xl font-bold text-[#111827]">
            {status === "waitlisted"
              ? "On the waitlist"
              : isPending
                ? "Application under review"
                : isRejected
                  ? "Application not approved"
                  : "Application status"}
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            {status === "waitlisted"
              ? "We'll notify you if a spot opens."
              : isPending
                ? "The brand is reviewing your application. You'll be notified when there's an update."
                : isRejected
                  ? data.participant?.review_feedback ??
                    "You may apply again if the campaign is still open."
                  : `Status: ${status}`}
          </p>

          {data.participant?.eligibility_score != null ? (
            <p className="mt-3 text-[12px] text-[#9CA3AF]">
              Eligibility score: {data.participant.eligibility_score}%
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2">
            {isRejected ? (
              <Button asChild className="h-11 rounded-xl bg-[#FF5A1F]">
                <JoinCampaignGateLink href={`/ugc/${id}/join`}>Apply again</JoinCampaignGateLink>
              </Button>
            ) : null}
            {isPending || status === "waitlisted" ? (
              <Button
                variant="outline"
                onClick={withdraw}
                disabled={withdrawing}
                className="h-11 rounded-xl"
              >
                {withdrawing ? "Withdrawing…" : "Withdraw application"}
              </Button>
            ) : null}
            <Button asChild variant="ghost" className="h-11 rounded-xl">
              <Link href="/ugc">Browse campaigns</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
