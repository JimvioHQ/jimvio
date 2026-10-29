"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  platform: string;
  handle: string | null;
  url: string | null;
  verify_code: string | null;
  verify_checked_at: string | null;
  pageUrl: string | null;
  profile?: { full_name?: string | null; username?: string | null } | null;
};

/** Reviewers confirm the code is in the account's bio, then approve. */
export default function AdminSocialVerificationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/social-verifications", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setRows(Array.isArray(json.data) ? json.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, approve: boolean) {
    setBusy(id);
    const res = await fetch("/api/admin/social-verifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, approve }),
    });
    setBusy(null);
    if (!res.ok) {
      toast.error("Could not save the decision.");
      return;
    }
    toast.success(approve ? "Account verified." : "Request declined.");
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Identity</p>
        <h1 className="text-[22px] font-semibold text-[var(--color-text-primary)]">Social account verification</h1>
        <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
          Open the profile, confirm the code is in its bio, then approve. Decline if the code is missing.
        </p>
      </div>
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-[#FF5A1F]" />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-[var(--color-border)] p-6 text-center text-[13px] text-[var(--color-text-muted)]">
          Nothing waiting for review.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                  {r.profile?.full_name ?? "Member"}{" "}
                  <span className="font-normal text-[var(--color-text-muted)]">@{r.profile?.username ?? "—"}</span>
                </p>
                <p className="text-[12.5px] capitalize text-[var(--color-text-secondary)]">
                  {r.platform} · {r.handle || r.url}
                </p>
                <p className="mt-1 text-[12.5px]">
                  Code to find: <span className="rounded bg-black/5 px-1.5 py-0.5 font-mono font-bold">{r.verify_code}</span>
                </p>
              </div>
              {r.pageUrl ? (
                <a
                  href={r.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 text-[12px] font-semibold"
                >
                  Open profile <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => void decide(r.id, false)}
                className="h-9 rounded-md border border-rose-200 px-3 text-[12px] font-semibold text-rose-700"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => void decide(r.id, true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12px] font-semibold text-white"
              >
                <BadgeCheck className="h-3.5 w-3.5" /> Approve
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
