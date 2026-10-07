"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, MailWarning, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FieldInput } from "@/components/ui/field-input";
import { resendSignUpConfirmation } from "@/lib/auth/actions";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";

const COPY: Record<
  string,
  { title: string; body: string; icon: "ok" | "warn" | "info" }
> = {
  email_verified: {
    title: "Email verified",
    body: "Your email is confirmed. You can sign in and continue.",
    icon: "ok",
  },
  already_verified: {
    title: "Already verified",
    body: "This email is already verified. You can sign in.",
    icon: "info",
  },
  expired: {
    title: "Link expired",
    body: "This confirmation link has expired. Request a new one below.",
    icon: "warn",
  },
  invalid: {
    title: "Link invalid",
    body: "This confirmation link is invalid. Try again with a new email.",
    icon: "warn",
  },
};

export function VerifyEmailClient({
  merchantMode = false,
}: {
  /** When true, never show platform marketing CTAs. */
  merchantMode?: boolean;
} = {}) {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "expired";
  const next = searchParams.get("next") ?? "";
  const copy = COPY[status] ?? COPY.invalid;
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [pending, startTransition] = useTransition();
  const showResend =
    status === "expired" || status === "invalid" || status === "try_again";
  const coolingDown = Date.now() < cooldownUntil;

  const loginHref = next
    ? `/login?next=${encodeURIComponent(next)}`
    : "/login";
  const continueHref =
    status === "email_verified"
      ? next && next.startsWith("/")
        ? next
        : merchantMode
          ? "/"
          : "/"
      : loginHref;

  return (
    <div className="w-full text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-sm bg-green-50 ring-4 ring-green-50">
        {copy.icon === "ok" ? (
          <CheckCircle className="h-8 w-8 text-green-500" />
        ) : copy.icon === "info" ? (
          <ShieldCheck className="h-8 w-8 text-orange-500" />
        ) : (
          <MailWarning className="h-8 w-8 text-amber-500" />
        )}
      </div>
      <h1 className="mb-2 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
        {copy.title}
      </h1>
      <p className="mx-auto mb-8 max-w-sm text-[14px] font-medium text-zinc-500">
        {copy.body}
      </p>

      {showResend && (
        <form
          className="mb-6 space-y-4 text-left"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setNotice(null);
            if (coolingDown) {
              setError("Please wait a moment before requesting another email.");
              return;
            }
            if (!captcha) {
              setError("Please complete the security check.");
              return;
            }
            const fd = new FormData(e.currentTarget);
            fd.set("captchaToken", captcha);
            if (next) fd.set("next", next);
            startTransition(async () => {
              const res = await resendSignUpConfirmation(fd);
              if (res.error) {
                setError(res.error);
                setCooldownUntil(Date.now() + 30_000);
              } else {
                setNotice(
                  res.success ??
                    "Confirmation email sent. Check your inbox and spam folder.",
                );
                setCooldownUntil(Date.now() + 45_000);
              }
              setCaptcha(null);
            });
          }}
        >
          <Field label="Email address">
            <FieldInput
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              disabled={pending}
            />
          </Field>
          <TurnstileWidget
            onToken={setCaptcha}
            className="flex justify-center"
          />
          {notice && (
            <p className="text-center text-[13px] font-medium text-emerald-600">
              {notice}
            </p>
          )}
          {error && (
            <p className="text-center text-[13px] font-medium text-red-600">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="h-12 w-full rounded-sm"
            disabled={pending || coolingDown || !captcha}
          >
            {pending
              ? "Sending…"
              : coolingDown
                ? "Please wait…"
                : "Resend confirmation email"}
          </Button>
        </form>
      )}

      <Link href={continueHref}>
        <Button className="h-12 w-full rounded-sm bg-zinc-900 text-[14px] font-bold text-white hover:bg-zinc-800">
          {status === "email_verified" ? "Continue" : "Back to sign in"}
        </Button>
      </Link>
    </div>
  );
}
