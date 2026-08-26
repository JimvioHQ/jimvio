"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, MailWarning, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FieldInput } from "@/components/ui/field-input";
import { resendSignUpConfirmation } from "@/lib/auth/actions";

const COPY: Record<
  string,
  { title: string; body: string; icon: "ok" | "warn" | "info" }
> = {
  email_verified: {
    title: "Email verified",
    body: "Your email is confirmed. You can continue to Jimvio.",
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

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "expired";
  const copy = COPY[status] ?? COPY.invalid;
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const showResend = status === "expired" || status === "invalid" || status === "try_again";

  return (
    <div className="w-full text-center">
      <div className="w-16 h-16 rounded-sm bg-green-50 flex items-center justify-center mx-auto mb-6 ring-4 ring-green-50">
        {copy.icon === "ok" ? (
          <CheckCircle className="h-8 w-8 text-green-500" />
        ) : copy.icon === "info" ? (
          <ShieldCheck className="h-8 w-8 text-orange-500" />
        ) : (
          <MailWarning className="h-8 w-8 text-amber-500" />
        )}
      </div>
      <h1 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">
        {copy.title}
      </h1>
      <p className="text-[14px] font-medium text-zinc-500 mb-8 max-w-sm mx-auto">{copy.body}</p>

      {showResend && (
        <form
          className="space-y-4 text-left mb-6"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await resendSignUpConfirmation(fd);
              setNotice(res.success ?? res.error ?? "Try again.");
            });
          }}
        >
          <Field label="Email address">
            <FieldInput name="email" type="email" required placeholder="you@example.com" disabled={pending} />
          </Field>
          {notice && <p className="text-[13px] font-medium text-emerald-600 text-center">{notice}</p>}
          <Button type="submit" className="w-full h-12 rounded-sm" disabled={pending}>
            {pending ? "Sending…" : "Try again"}
          </Button>
        </form>
      )}

      <Link href={status === "email_verified" ? "/dashboard" : "/login"}>
        <Button className="w-full h-12 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[14px]">
          {status === "email_verified" ? "Continue" : "Back to sign in"}
        </Button>
      </Link>
    </div>
  );
}
