"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  LogIn,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { IdentitySocialAccount, IdentitySocialPlatform } from "@/lib/identity/types";
import { SocialPlatformIcon, SOCIAL_PLATFORM_LABEL } from "@/components/identity/SocialPlatformIcon";
import { publicProfileUrl } from "@/lib/identity/social-verification";

const OAUTH: Partial<Record<IdentitySocialPlatform, true>> = { youtube: true, tiktok: true };

const BIO_HELP: Partial<Record<IdentitySocialPlatform, string>> = {
  instagram: "Open Instagram → your profile → Edit profile → Bio.",
  facebook: "Open Facebook → your profile → Edit details → Bio / Intro.",
  x: "Open X → your profile → Edit profile → Bio.",
  threads: "Open Threads → your profile → Edit profile → Bio.",
  linkedin: "Open LinkedIn → your profile → Edit intro → Headline or About.",
  pinterest: "Open Pinterest → Edit profile → About.",
  snapchat: "Open Snapchat → your Public Profile → Edit → Bio.",
};

type Phase = "account" | "code" | "verifying" | "verified" | "failed" | "review";

function StepDot({ n, state }: { n: number; state: "done" | "current" | "todo" }) {
  return (
    <span
      className={
        state === "done"
          ? "grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-white"
          : state === "current"
            ? "grid h-7 w-7 place-items-center rounded-full bg-[#FF5A1F] text-[12px] font-bold text-white"
            : "grid h-7 w-7 place-items-center rounded-full bg-[#F3F4F6] text-[12px] font-bold text-[#9CA3AF]"
      }
    >
      {state === "done" ? <Check className="h-4 w-4" /> : n}
    </span>
  );
}

/**
 * Step-by-step proof that a social account belongs to this person:
 * official login for YouTube/TikTok, a bio code for the rest.
 */
export function SocialConnectFlow({
  platform,
  initial,
  initialCode,
}: {
  platform: IdentitySocialPlatform;
  initial: IdentitySocialAccount | null;
  initialCode: string | null;
}) {
  const router = useRouter();
  const label = SOCIAL_PLATFORM_LABEL[platform];
  const oauth = Boolean(OAUTH[platform]);
  const [account, setAccount] = useState<IdentitySocialAccount | null>(initial);
  const [handle, setHandle] = useState(initial?.handle ?? initial?.url ?? "");
  const [code, setCode] = useState<string | null>(initialCode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(() => {
    if (initial?.isVerified) return "verified";
    if (initial?.verifyStatus === "pending_review") return "review";
    if (initial && initialCode) return "code";
    return "account";
  });
  const autoRan = useRef(false);

  async function call(body: Record<string, unknown>) {
    const res = await fetch("/api/identity/social/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { res, json: await res.json().catch(() => ({})) };
  }

  async function connect() {
    setBusy(true);
    setMessage(null);
    setPhase("verifying");
    try {
      const { res, json } = await call({ action: "connect", platform });
      if (res.ok) {
        setPhase("verified");
        setMessage(json.message ?? `${label} verified.`);
        return;
      }
      if (json.needsConnect) {
        const back = `/settings/profile/social/${platform}?verify=1`;
        window.location.href = `/api/integrations/${platform}/start?return=${encodeURIComponent(back)}`;
        return;
      }
      setPhase("failed");
      setMessage(json.error ?? "Could not verify.");
    } finally {
      setBusy(false);
    }
  }

  // Back from the official login: finish automatically.
  useEffect(() => {
    if (!oauth || autoRan.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("verify") === "1") {
      autoRan.current = true;
      window.history.replaceState(null, "", `/settings/profile/social/${platform}`);
      void connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveAccount() {
    const value = handle.trim();
    if (!value) return toast.error(`Enter your ${label} handle or profile link.`);
    setBusy(true);
    setMessage(null);
    try {
      const isUrl = /^https?:\/\//i.test(value) || value.includes("/") || value.includes(".com");
      const res = await fetch("/api/identity/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, handle: isUrl ? null : value.replace(/^@/, ""), url: isUrl ? value : null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save the account.");
      setAccount(json.account);
      const issued = await call({ action: "code", id: json.account.id });
      if (!issued.res.ok) throw new Error(issued.json.error ?? "Could not create a code.");
      setCode(issued.json.code ?? null);
      setPhase("code");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const [unreachable, setUnreachable] = useState(false);

  async function verifyCode() {
    if (!account) return;
    setBusy(true);
    setMessage(null);
    setPhase("verifying");
    try {
      const { res, json } = await call({ action: "check", id: account.id });
      if (res.ok && json.status === "verified") {
        setPhase("verified");
        setMessage(json.message);
      } else if (res.ok && json.status === "pending_review") {
        setPhase("review");
        setMessage(json.message);
      } else {
        setPhase("failed");
        setMessage(json.error ?? "Verification failed.");
        setUnreachable(Boolean(json.unreachable));
      }
    } finally {
      setBusy(false);
    }
  }

  async function askReviewer() {
    if (!account) return;
    setBusy(true);
    try {
      const { res, json } = await call({ action: "review", id: account.id });
      if (res.ok) {
        setPhase("review");
        setMessage(json.message);
      } else toast.error(json.error ?? "Could not send for review.");
    } finally {
      setBusy(false);
    }
  }

  const profileLink = publicProfileUrl(platform, account?.handle ?? null, account?.url ?? null);
  const step = phase === "account" ? 1 : phase === "code" || phase === "failed" ? 2 : 3;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href="/settings/profile#field-social" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6B7280] hover:text-[#111827]">
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </Link>

      <div className="flex items-center gap-3">
        <SocialPlatformIcon platform={platform} className="h-12 w-12" />
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">Verify your {label}</h1>
          <p className="text-[13px] text-[#6B7280]">
            {oauth
              ? `Sign in with ${label} so Jimvio knows the account is yours. Your real followers come with it.`
              : `Prove the account is yours with a short code in your ${label} bio. It takes about a minute.`}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-[#E8E8E8] bg-white p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] sm:p-6">
        {phase === "verified" ? (
          <div className="space-y-4 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-white">
              <BadgeCheck className="h-7 w-7" />
            </span>
            <div>
              <p className="text-[18px] font-bold text-[#111827]">{label} verified</p>
              <p className="mt-1 text-[13px] text-[#6B7280]">{message ?? "It now shows on your profile with a verified badge."}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/settings/profile#field-social")}
              className="h-11 w-full rounded-full bg-[#111827] text-[14px] font-semibold text-white"
            >
              Back to profile
            </button>
          </div>
        ) : phase === "review" ? (
          <div className="space-y-4 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sky-600 text-white">
              <Clock className="h-7 w-7" />
            </span>
            <div>
              <p className="text-[18px] font-bold text-[#111827]">Sent to a Jimvio reviewer</p>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                {message ?? "Keep the code in your bio until it's approved. You'll get a notification."}
              </p>
            </div>
            {code ? <code className="inline-block rounded-lg bg-[#F3F4F6] px-3 py-1.5 font-mono text-[15px] font-bold">{code}</code> : null}
            <button
              type="button"
              onClick={() => router.push("/settings/profile#field-social")}
              className="h-11 w-full rounded-full bg-[#111827] text-[14px] font-semibold text-white"
            >
              Back to profile
            </button>
          </div>
        ) : oauth ? (
          <div className="space-y-4">
            <ol className="space-y-3 text-[13.5px] text-[#374151]">
              <li className="flex gap-3">
                <StepDot n={1} state={phase === "verifying" ? "done" : "current"} /> Press the button and sign in to {label}.
              </li>
              <li className="flex gap-3">
                <StepDot n={2} state="todo" /> Allow Jimvio to read your channel or account.
              </li>
              <li className="flex gap-3">
                <StepDot n={3} state="todo" /> You come back here verified, with your real followers.
              </li>
            </ol>
            {phase === "failed" && message ? (
              <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {message}
              </p>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void connect()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF5A1F] text-[14px] font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {busy ? "Verifying…" : `Continue with ${label}`}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <StepDot n={1} state={step > 1 ? "done" : "current"} />
              <span className="h-px flex-1 bg-[#E5E7EB]" />
              <StepDot n={2} state={step > 2 ? "done" : step === 2 ? "current" : "todo"} />
              <span className="h-px flex-1 bg-[#E5E7EB]" />
              <StepDot n={3} state={step === 3 ? "current" : "todo"} />
            </div>

            {phase === "account" ? (
              <div className="space-y-3">
                <p className="text-[14px] font-semibold text-[#111827]">Which {label} account is yours?</p>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder={`@handle or ${label} profile link`}
                  className="h-12 w-full rounded-xl border border-[#E5E7EB] px-4 text-[14px] outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/15"
                  autoFocus
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveAccount()}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF5A1F] text-[14px] font-bold text-white disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Continue
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-[14px] font-semibold text-[#111827]">Add this code to your {label} bio</p>
                  <p className="mt-0.5 text-[12.5px] text-[#6B7280]">{BIO_HELP[platform] ?? "Open your profile and edit the bio."} Save, then come back.</p>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-[#FFD0BA] bg-[#FFF7F2] px-4 py-3">
                  <code className="font-mono text-[20px] font-bold tracking-wider text-[#111827]">{code ?? "…"}</code>
                  {code ? (
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(code);
                        toast.success("Code copied");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#D6480F] shadow-sm"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                  ) : null}
                </div>
                {profileLink ? (
                  <a
                    href={profileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#111827] hover:underline"
                  >
                    Open my {label} profile <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
                {phase === "failed" && message ? (
                  <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {message}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={busy || !code}
                  onClick={() => void verifyCode()}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF5A1F] text-[14px] font-bold text-white disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {busy ? "Checking your bio… (about 10 seconds)" : phase === "failed" ? "Verify again" : "Verify"}
                </button>
                {phase === "failed" && unreachable ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void askReviewer()}
                    className="w-full text-[12.5px] font-semibold text-[#D6480F] hover:underline"
                  >
                    Still not working? Ask Jimvio to check by hand
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setPhase("account");
                    setMessage(null);
                  }}
                  className="w-full text-[12.5px] font-medium text-[#6B7280] hover:underline"
                >
                  Use a different account
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <p className="text-center text-[11.5px] text-[#9CA3AF]">
        Jimvio never posts for you and never sees your password.
      </p>
    </div>
  );
}
