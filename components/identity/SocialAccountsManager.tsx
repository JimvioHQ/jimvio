"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Check, Clock, Copy, Loader2, LogIn, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { IdentitySocialAccount, IdentitySocialPlatform } from "@/lib/identity/types";
import { SocialPlatformIcon, SOCIAL_PLATFORM_LABEL } from "@/components/identity/SocialPlatformIcon";

const PLATFORMS: IdentitySocialPlatform[] = [
  "tiktok",
  "instagram",
  "youtube",
  "facebook",
  "x",
  "threads",
  "linkedin",
  "pinterest",
  "snapchat",
];

const OAUTH: Partial<Record<IdentitySocialPlatform, true>> = { youtube: true, tiktok: true };

function formatCount(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

/**
 * Social accounts with proof of ownership. YouTube and TikTok verify by
 * official login; other platforms by a one-time code placed in the bio.
 * Only verified accounts count on the profile and for campaigns.
 */
export function SocialAccountsManager({
  accounts,
  onChange,
}: {
  accounts: IdentitySocialAccount[];
  onChange: React.Dispatch<React.SetStateAction<IdentitySocialAccount[]>>;
}) {
  const [adding, setAdding] = useState<IdentitySocialPlatform | "">("");
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});

  const social = accounts.filter((a) => a.platform !== "website");
  const used = new Set(social.map((a) => a.platform));

  // Back from YouTube/TikTok login: finish the verification automatically.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("verify");
    if (p !== "youtube" && p !== "tiktok") return;
    params.delete("verify");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}#field-social`;
    window.history.replaceState(null, "", next);
    void connect(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function replace(account: IdentitySocialAccount) {
    onChange((prev) => [account, ...prev.filter((a) => a.id !== account.id && a.platform !== account.platform)]);
  }

  async function call(body: Record<string, unknown>) {
    const res = await fetch("/api/identity/social/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { res, json };
  }

  async function connect(platform: "youtube" | "tiktok") {
    setBusy(platform);
    try {
      const { res, json } = await call({ action: "connect", platform });
      if (res.ok && json.account) {
        const a = json.account as Record<string, unknown>;
        replace({
          id: String(a.id),
          platform,
          handle: (a.handle as string) ?? null,
          url: (a.url as string) ?? null,
          followers: Number(a.followers ?? 0),
          avgViews: Number(a.avg_views ?? 0),
          engagementRate: Number(a.engagement_rate ?? 0),
          isVerified: true,
          verificationMethod: "oauth",
          verifyStatus: "verified",
        });
        toast.success(json.message ?? "Verified");
        return;
      }
      if (json.needsConnect) {
        const back = `${window.location.pathname}?verify=${platform}`;
        window.location.href = `/api/integrations/${platform}/start?return=${encodeURIComponent(back)}`;
        return;
      }
      toast.error(json.error ?? "Could not verify.");
    } finally {
      setBusy(null);
    }
  }

  async function addAccount() {
    if (!adding) return;
    if (OAUTH[adding]) {
      await connect(adding as "youtube" | "tiktok");
      setAdding("");
      return;
    }
    const value = handle.trim();
    if (!value) {
      toast.error("Enter your handle or profile link.");
      return;
    }
    setBusy("add");
    try {
      const isUrl = /^https?:\/\//i.test(value) || value.includes(".");
      const res = await fetch("/api/identity/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: adding,
          handle: isUrl ? null : value.replace(/^@/, ""),
          url: isUrl ? value : null,
          followers: Math.max(0, Math.floor(Number(followers) || 0)),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add account");
      replace(json.account);
      setAdding("");
      setHandle("");
      setFollowers("");
      await getCode(json.account.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add account");
    } finally {
      setBusy(null);
    }
  }

  async function getCode(id: string) {
    setBusy(id);
    try {
      const { res, json } = await call({ action: "code", id });
      if (!res.ok) throw new Error(json.error ?? "Could not create a code");
      if (json.code) setCodes((c) => ({ ...c, [id]: json.code }));
      onChange((prev) => prev.map((a) => (a.id === id ? { ...a, verifyStatus: "code_issued" } : a)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create a code");
    } finally {
      setBusy(null);
    }
  }

  async function check(id: string) {
    setBusy(id);
    try {
      const { res, json } = await call({ action: "check", id });
      if (res.ok && json.status === "verified") {
        onChange((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isVerified: true, verifyStatus: "verified", verificationMethod: "bio_code" } : a)),
        );
        toast.success(json.message ?? "Verified");
      } else if (res.ok && json.status === "pending_review") {
        onChange((prev) => prev.map((a) => (a.id === id ? { ...a, verifyStatus: "pending_review" } : a)));
        toast.message(json.message ?? "Sent to a reviewer");
      } else {
        onChange((prev) => prev.map((a) => (a.id === id ? { ...a, verifyStatus: "failed" } : a)));
        toast.error(json.error ?? "Verification failed");
      }
    } finally {
      setBusy(null);
    }
  }

  async function review(id: string) {
    setBusy(id);
    try {
      const { res, json } = await call({ action: "review", id });
      if (!res.ok) throw new Error(json.error ?? "Could not send for review");
      onChange((prev) => prev.map((a) => (a.id === id ? { ...a, verifyStatus: "pending_review" } : a)));
      toast.success(json.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send for review");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this account from your profile?")) return;
    onChange((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/identity/social?id=${id}`, { method: "DELETE" }).catch(() => undefined);
  }

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 rounded-xl bg-[#F6F7F9] px-3 py-2 text-[12px] leading-relaxed text-[#4B5563]">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF5A1F]" aria-hidden="true" />
        Only accounts you prove are yours appear on your profile. YouTube and TikTok verify with their official login;
        others with a short code in your bio.
      </p>

      {social.length === 0 ? (
        <p className="text-[12.5px] text-[#6B7280]">No accounts yet. Add the ones you post on.</p>
      ) : (
        <ul className="space-y-2">
          {social.map((a) => {
            const status = a.isVerified ? "verified" : a.verifyStatus ?? "unverified";
            const code = codes[a.id];
            return (
              <li key={a.id} className="rounded-xl border border-[#E8E8E8] p-3">
                <div className="flex items-center gap-2.5">
                  <SocialPlatformIcon platform={a.platform} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#111827]">
                      {a.handle ? `@${a.handle.replace(/^@/, "")}` : a.url ?? SOCIAL_PLATFORM_LABEL[a.platform]}
                    </p>
                    <p className="text-[11.5px] text-[#6B7280]">
                      {SOCIAL_PLATFORM_LABEL[a.platform]}
                      {a.followers > 0 ? ` · ${formatCount(a.followers)} followers` : ""}
                    </p>
                  </div>
                  {status === "verified" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </span>
                  ) : status === "pending_review" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                      <Clock className="h-3 w-3" /> In review
                    </span>
                  ) : status === "failed" ? (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Failed</span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Not verified</span>
                  )}
                  <button type="button" aria-label="Remove" onClick={() => void remove(a.id)} className="rounded-lg p-1.5 text-[#9CA3AF] hover:bg-black/5 hover:text-rose-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {status !== "verified" && status !== "pending_review" ? (
                  OAUTH[a.platform] ? (
                    <button
                      type="button"
                      disabled={busy === a.platform}
                      onClick={() => void connect(a.platform as "youtube" | "tiktok")}
                      className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-full bg-[#111827] px-3.5 text-[12px] font-semibold text-white disabled:opacity-60"
                    >
                      {busy === a.platform ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
                      Verify with {SOCIAL_PLATFORM_LABEL[a.platform]} login
                    </button>
                  ) : code || status === "code_issued" || status === "failed" ? (
                    <div className="mt-2.5 space-y-2 rounded-lg bg-[#FFF7F2] p-2.5">
                      <p className="text-[12px] text-[#7C2D12]">
                        1. Copy this code. 2. Paste it anywhere in your {SOCIAL_PLATFORM_LABEL[a.platform]} bio and save. 3. Press
                        Verify — Jimvio checks your bio automatically in about 10 seconds.
                      </p>
                      {code ? (
                        <div className="flex items-center gap-2">
                          <code className="rounded-md bg-white px-2 py-1 font-mono text-[13px] font-bold text-[#111827]">{code}</code>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(code);
                              toast.success("Code copied");
                            }}
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#D6480F]"
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => void getCode(a.id)} className="text-[12px] font-semibold text-[#D6480F]">
                          Show my code
                        </button>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy === a.id}
                          onClick={() => void check(a.id)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#FF5A1F] px-3 text-[12px] font-semibold text-white disabled:opacity-60"
                        >
                          {busy === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          {busy === a.id ? "Verifying…" : "Verify"}
                        </button>
                        <button
                          type="button"
                          disabled={busy === a.id}
                          onClick={() => void review(a.id)}
                          className="inline-flex h-8 items-center rounded-full border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-[#374151]"
                        >
                          Ask a reviewer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === a.id}
                      onClick={() => void getCode(a.id)}
                      className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-full bg-[#111827] px-3.5 text-[12px] font-semibold text-white"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Verify this account
                    </button>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-xl border border-dashed border-[#D1D5DB] p-3">
        <p className="mb-2 text-[12px] font-semibold text-[#374151]">Add an account</p>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.filter((p) => !used.has(p)).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAdding(p)}
              aria-pressed={adding === p}
              className={
                adding === p
                  ? "inline-flex items-center gap-1.5 rounded-full bg-[#111827] px-2.5 py-1 text-[12px] font-semibold text-white"
                  : "inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] px-2.5 py-1 text-[12px] text-[#374151] hover:border-[#9CA3AF]"
              }
            >
              <SocialPlatformIcon platform={p} className="h-4 w-4" bare />
              {SOCIAL_PLATFORM_LABEL[p]}
            </button>
          ))}
        </div>
        {adding ? (
          OAUTH[adding] ? (
            <button
              type="button"
              disabled={busy === adding}
              onClick={() => void addAccount()}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white"
            >
              {busy === adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Connect and verify {SOCIAL_PLATFORM_LABEL[adding]}
            </button>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_110px_auto]">
              <input
                className="h-10 rounded-xl border border-[#E5E7EB] px-3 text-[13px] outline-none focus:border-[#FF5A1F]"
                placeholder={`@handle or ${SOCIAL_PLATFORM_LABEL[adding]} profile link`}
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
              <input
                className="h-10 rounded-xl border border-[#E5E7EB] px-3 text-[13px] outline-none focus:border-[#FF5A1F]"
                placeholder="Followers"
                inputMode="numeric"
                value={followers}
                onChange={(e) => setFollowers(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
              />
              <button
                type="button"
                disabled={busy === "add"}
                onClick={() => void addAccount()}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white"
              >
                {busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Add & verify
              </button>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
