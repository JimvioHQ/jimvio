"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FieldInput } from "@/components/ui/field-input";
import { resetPassword } from "@/lib/auth/actions";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await resetPassword(formData);
      if (result?.error) setError(result.error);
      if (result?.success) setSuccess(result.success);
    });
  }

  if (success) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-success-light)] flex items-center justify-center mx-auto mb-6 ring-4 ring-[var(--color-success)]/20">
          <CheckCircle className="h-8 w-8 text-[var(--color-success)]" />
        </div>
        <h2 className="text-2xl font-black text-[var(--color-text-primary)] mb-3 tracking-tight">Email sent!</h2>
        <p className="text-[var(--color-text-muted)] mb-6">{success}</p>
        <Link href="/login">
          <Button className="w-full h-12 rounded-full bg-[var(--color-text-primary)] hover:bg-[var(--color-text-secondary)] text-[var(--color-bg)] font-bold text-[14px] shadow-none transition-all">
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-text-primary)] mb-2">Reset password</h1>
        <p className="text-[14px] font-medium text-[var(--color-text-muted)]">We&apos;ll send you a reset link to your email</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email address" required icon={<Mail className="h-5 w-5" />}>
          <FieldInput
            name="email"
            type="email"
            placeholder="you@example.com"
            disabled={isPending}
          />
        </Field>
        {error && (
          <div role="alert" className="p-3.5 rounded-sm text-[13px] font-semibold bg-[var(--color-danger-light)] text-[var(--color-danger)] flex items-center justify-center text-center">
            {error}
          </div>
        )}
        <Button
          type="submit"
          className="w-full h-12 rounded-full bg-[var(--color-text-primary)] hover:bg-[var(--color-text-secondary)] text-[var(--color-bg)] font-bold text-[14px] shadow-none transition-all"
          disabled={isPending}
        >
          {isPending ? "Sending…" : "Send Reset Link"}
        </Button>
      </form>
      <div className="mt-6 text-center">
        <Link href="/login" className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-accent)] flex items-center justify-center gap-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}
