"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CheckCircle2, FileText, Fingerprint, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import type { IdentityVerificationRequest, IdentityVerificationRequestType } from "@/lib/identity/types";
import { IdentityButton, IdentityCard, IdentityEmptyState, IdentityPill } from "@/components/identity/identity-ui";

const TYPE_META: Record<IdentityVerificationRequestType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  identity: { label: "Identity", icon: Fingerprint },
  documents: { label: "Documents", icon: FileText },
  social: { label: "Social accounts", icon: BadgeCheck },
  trust: { label: "Trust score", icon: ShieldCheck },
  level: { label: "Creator level", icon: ShieldCheck },
};

export function IdentityAdminVerifyClient() {
  const [requests, setRequests] = useState<IdentityVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/identity/admin/verify?status=pending");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load queue");
      setRequests(json.requests ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, decision: "approved" | "rejected") {
    setBusyId(id);
    try {
      const res = await fetch("/api/identity/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit decision");
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success(decision === "approved" ? "Approved" : "Rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit decision");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Admin</p>
        <h1 className="font-[var(--font-identity-serif)] text-[24px] font-medium tracking-tight text-[#161512]">
          Identity verification queue
        </h1>
        <p className="mt-1 text-[13px] text-[#8B8579]">
          {requests.length} pending request{requests.length === 1 ? "" : "s"}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#FF5A1F]" />
        </div>
      ) : requests.length === 0 ? (
        <IdentityEmptyState icon={<ShieldCheck className="h-6 w-6" />} title="Queue is empty" description="No pending identity verification requests." />
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const meta = TYPE_META[req.requestType];
            const Icon = meta.icon;
            const name = req.user?.fullName || req.user?.username || "Jimvio member";
            return (
              <IdentityCard key={req.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FF5A1F] text-[13px] font-semibold text-white">
                    {req.user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={req.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      getInitials(name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        {req.user?.username ? (
                          <Link href={`/u/${req.user.username}`} className="text-[13.5px] font-semibold text-[#1C1B19] hover:underline">
                            {name}
                          </Link>
                        ) : (
                          <p className="text-[13.5px] font-semibold text-[#1C1B19]">{name}</p>
                        )}
                        <p className="text-[11.5px] text-[#9A9388]">{req.user?.email}</p>
                      </div>
                      <IdentityPill tone="accent" icon={<Icon className="h-3 w-3" />}>
                        {meta.label}
                      </IdentityPill>
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#B9B3A6]">
                      Requested {new Date(req.createdAt).toLocaleDateString()}
                    </p>

                    <div className="mt-3 flex gap-2">
                      <IdentityButton size="sm" onClick={() => decide(req.id, "approved")} loading={busyId === req.id}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </IdentityButton>
                      <IdentityButton
                        size="sm"
                        variant="outline"
                        onClick={() => decide(req.id, "rejected")}
                        loading={busyId === req.id}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </IdentityButton>
                    </div>
                  </div>
                </div>
              </IdentityCard>
            );
          })}
        </div>
      )}
    </div>
  );
}