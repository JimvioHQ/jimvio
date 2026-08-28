"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
  UGCStatusPill,
} from "@/components/ugc/workspace/UGCPageShell";
import {
  EnterpriseOutlineButton,
  EnterprisePrimaryButton,
  cardClass,
  fieldClass,
} from "./enterprise-ui";
import { useUgcBrandWorkspace } from "@/components/ugc/workspace/UgcBrandWorkspaceProvider";
import { useLocale } from "@/context/LocaleContext";

type Member = {
  id: string;
  role: string;
  status: string;
  profile?: {
    email?: string | null;
    username?: string | null;
    full_name?: string | null;
  } | null;
};

const ROLES = ["manager", "reviewer", "finance", "viewer"] as const;

export function BrandTeamPage() {
  const { ugcFetch } = useUgcBrandWorkspace();
  const { t } = useLocale();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("viewer");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ugcFetch("/api/ugc/team", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setError("Brand account required to manage team.");
        setMembers([]);
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Failed to load team");
      setMembers(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, [ugcFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async () => {
    if (!email.trim()) {
      toast.error("Enter an email");
      return;
    }
    setBusy(true);
    try {
      const res = await ugcFetch("/api/ugc/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Invite failed");
      toast.success("Member invited");
      setEmail("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this member?")) return;
    setBusy(true);
    try {
      const res = await ugcFetch(`/api/ugc/team/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Revoke failed");
      toast.success("Member revoked");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <UGCPageShell
      titleKey="team"
      subtitleKey="teamSubtitle"
    >
      <div className={`${cardClass} grid gap-3 sm:grid-cols-[1fr_160px_auto]`}>
        <label className="text-[12px] font-semibold text-[#374151]">
          Email
          <input
            className={fieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@brand.com"
          />
        </label>
        <label className="text-[12px] font-semibold text-[#374151]">
          Role
          <select className={fieldClass} value={role} onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <EnterprisePrimaryButton onClick={() => void invite()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Invite
          </EnterprisePrimaryButton>
        </div>
      </div>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && members.length === 0 ? (
        <UGCPageEmpty title={t("emptyTeam")} description={t("inviteMember")} />
      ) : null}

      {!loading && !error && members.length > 0 ? (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className={`${cardClass} flex flex-wrap items-center justify-between gap-3`}>
              <div>
                <p className="text-sm font-bold text-[#111827]">
                  {m.profile?.full_name || m.profile?.username || m.profile?.email || "Member"}
                </p>
                <p className="text-[12px] text-[#6B7280]">{m.profile?.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <UGCStatusPill status={m.status} />
                  <span className="rounded-full border border-[#E5E7EB] px-2 py-0.5 text-[10px] font-bold uppercase text-[#374151]">
                    {m.role}
                  </span>
                </div>
              </div>
              <EnterpriseOutlineButton onClick={() => void revoke(m.id)} disabled={busy}>
                Revoke
              </EnterpriseOutlineButton>
            </div>
          ))}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
