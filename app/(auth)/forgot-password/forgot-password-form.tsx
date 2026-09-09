"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/lib/auth/actions";
import { Field } from "@/components/ui/field";
import { FieldInput } from "@/components/ui/field-input";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!captchaToken) {
      setError("Please complete the CAPTCHA challenge.");
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set("captchaToken", captchaToken);
    startTransition(async () => {
      const result = await resetPassword(formData);
      if (result?.error) {
        setError(result.error);
        setCaptchaToken(null);
      }
      if (result?.success) setSuccess(result.success);
    });
  }

  if (success) {
    return (
      <div className="w-full text-center animate-fade-in">
        <div className="w-16 h-16 rounded-sm bg-green-50 flex items-center justify-center mx-auto mb-6 ring-4 ring-green-50">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">
          Check your email
        </h2>
        <p className="text-[14px] font-medium text-zinc-500 mb-8 max-w-sm mx-auto">{success}</p>
        <Link href="/login">
          <Button className="w-full h-12 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[14px] shadow-none">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-3 mb-10">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
          Forgot password?
        </h1>
        <p className="text-[14px] font-medium text-zinc-500">
          Enter your email and we&apos;ll send a reset link if an account exists.
        </p>
      </div>
      <form method="post" action="/forgot-password" onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email address" required icon={<Mail className="h-5 w-5" />}>
          <FieldInput
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            required
            disabled={isPending}
          />
        </Field>
        {error && (
          <div role="alert" className="p-3.5 rounded-sm text-[13px] font-semibold bg-red-50 text-red-600 text-center">
            {error}
          </div>
        )}
        <TurnstileWidget onToken={setCaptchaToken} className="flex justify-center" />
        <Button
          type="submit"
          className="w-full h-12 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[14px] shadow-none"
          disabled={isPending || !captchaToken}
        >
          {isPending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-zinc-500 hover:text-orange-600 flex items-center justify-center gap-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
