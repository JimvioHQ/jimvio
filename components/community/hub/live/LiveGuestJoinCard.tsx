"use client";

import Link from "next/link";
import { JimvioLogo } from "@/components/ui/logo";
import { GoogleAuthButton } from "@/components/auth/google-button";
import { cn } from "@/lib/utils";
import type { LiveGuestPreview } from "@/lib/live/guest-join";
import { buildLiveSessionPath } from "@/lib/live/guest-join";
import { FOCUS_RING } from "./studio-ui";

function guestErrorMessage(code: string | null): string | null {
  switch (code) {
    case "expired":
      return "That sign-in link expired. Continue with Google or log in to your account.";
    case "google":
      return "Google sign-in didn’t complete. Try again or log in to your account.";
    case "auth":
      return "Sign-in didn’t complete. Try Google or log in to your account.";
    default:
      return null;
  }
}

export function LiveGuestJoinCard({
  sessionId,
  preview,
  initialError,
  loadingPreview,
  overlay = false,
  continueWatching = false,
}: {
  sessionId: string;
  preview: LiveGuestPreview | null;
  initialError?: string | null;
  loadingPreview?: boolean;
  /** Render as a sheet/modal over the still-active Live preview. */
  overlay?: boolean;
  /** Copy for the 5-second preview auth gate. */
  continueWatching?: boolean;
}) {
  const returnPath = buildLiveSessionPath(sessionId);
  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;
  const displayError = guestErrorMessage(initialError ?? null);

  const title = preview?.title?.trim() || "Live room";
  const hostLine = preview?.hostName ? `Hosted by ${preview.hostName}` : null;
  const restricted = preview && !preview.canGuestJoin;
  const restrictedMessage =
    preview?.message || "This Live isn’t open for guest join right now.";

  const heading = restricted
    ? "This Live is restricted"
    : continueWatching
      ? "Continue watching"
      : "Join this Live";

  const support = restricted
    ? restrictedMessage
    : continueWatching
      ? "Sign in to keep watching and join the conversation."
      : "Continue with Google to enter, or log in to your Jimvio account.";

  const card = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-guest-join-title"
      className={cn(
        "relative z-10 w-full max-w-[420px] rounded-[24px] border border-white/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-8",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200"
      )}
    >
      <div className="flex flex-col items-center text-center">
        <JimvioLogo variant="full" size="sm" href="/" className="!text-[#111827]" />
        {loadingPreview ? (
          <p className="mt-6 text-[13px] text-neutral-500">Loading Live…</p>
        ) : (
          <>
            <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#FF5A1F]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#FF5A1F]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F]" aria-hidden />
              Live
            </p>
            <h1
              id="live-guest-join-title"
              className="mt-3 text-[22px] font-bold tracking-[-0.03em] text-[#111827] sm:text-[24px]"
            >
              {heading}
            </h1>
            <p className="mt-1.5 line-clamp-2 text-[14px] font-medium text-neutral-800">
              {title}
            </p>
            {hostLine ? (
              <p className="mt-1 text-[12px] text-neutral-500">{hostLine}</p>
            ) : null}
            <p className="mt-3 max-w-[34ch] text-[13px] leading-relaxed text-neutral-500">
              {support}
            </p>
          </>
        )}
      </div>

      {displayError ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left text-[12px] leading-relaxed text-red-700"
        >
          {displayError}
        </div>
      ) : null}

      {!restricted ? (
        <div className="mt-6 space-y-4">
          <GoogleAuthButton
            next={returnPath}
            errorReturn={returnPath}
            disabled={loadingPreview}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-60"
          />

          <div className="flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-neutral-200" />
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400">
              or
            </span>
            <span className="h-px flex-1 bg-neutral-200" />
          </div>

          <Link
            href={loginHref}
            className={cn(
              "inline-flex h-12 w-full items-center justify-center rounded-full text-[14px] font-semibold text-neutral-800 hover:bg-neutral-50",
              FOCUS_RING
            )}
          >
            Log in to your account
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <Link
            href="/"
            className={cn(
              "inline-flex h-12 w-full items-center justify-center rounded-full bg-neutral-900 text-[14px] font-semibold text-white",
              FOCUS_RING
            )}
          >
            Back to Jimvio
          </Link>
        </div>
      )}

      <p className="mt-6 text-center text-[11px] leading-relaxed text-neutral-400">
        By continuing you agree to Jimvio’s terms.
      </p>
    </div>
  );

  if (overlay) {
    return (
      <div className="pointer-events-none absolute inset-0 z-[50] flex items-end justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 sm:items-center sm:pb-8">
        <div
          className="pointer-events-none absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          aria-hidden
        />
        <div className="pointer-events-auto relative w-full max-w-[420px]">{card}</div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full items-end justify-center overflow-x-hidden bg-[#0B0B0C] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 sm:items-center sm:pb-8">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,90,31,0.18),_transparent_55%),linear-gradient(180deg,#141416_0%,#0B0B0C_60%)]"
        aria-hidden
      />
      {card}
    </div>
  );
}
