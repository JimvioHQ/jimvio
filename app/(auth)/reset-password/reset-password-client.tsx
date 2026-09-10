"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { beginPasswordRecovery, completePasswordReset, hasPasswordRecoverySession } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/field";
import { FieldInput } from "@/components/ui/field-input";
import { validateNewPassword, PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import type { AuthChangeEvent } from "@supabase/supabase-js";

function parseHashParams(): {
  error: string | null;
  error_code: string | null;
  error_description: string | null;
} {
  if (typeof window === "undefined") {
    return { error: null, error_code: null, error_description: null };
  }
  const h = window.location.hash?.replace(/^#/, "") ?? "";
  if (!h) return { error: null, error_code: null, error_description: null };
  const q = new URLSearchParams(h);
  return {
    error: q.get("error"),
    error_code: q.get("error_code"),
    error_description: q.get("error_description"),
  };
}

export function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");

  const queryError = searchParams.get("error");
  const queryErrorCode = searchParams.get("error_code");
  const queryErrorDesc = searchParams.get("error_description");

  useEffect(() => {
    const hash = parseHashParams();
    const err = queryError || hash.error;
    const errCode = queryErrorCode || hash.error_code;
    const errDesc = queryErrorDesc || hash.error_description;

    if (err === "link_expired" || err === "access_denied" || errCode === "otp_expired") {
      setLinkError("Reset link expired. Request a new one.");
      return;
    }
    if (errCode || (err && err !== "link_expired")) {
      setLinkError("This link is invalid. Request a new reset email.");
      return;
    }
    void errDesc;

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent) => {
        if (cancelled) return;
        if (event === "PASSWORD_RECOVERY") {
          const marked = await beginPasswordRecovery();
          if (!cancelled && marked.ok) setReady(true);
        }
      });

      if (await hasPasswordRecoverySession()) {
        if (!cancelled) setReady(true);
        subscription.unsubscribe();
        return;
      }

      await new Promise((r) => setTimeout(r, 700));
      if (cancelled) {
        subscription.unsubscribe();
        return;
      }
      if (await hasPasswordRecoverySession()) {
        setReady(true);
        subscription.unsubscribe();
        return;
      }
      subscription.unsubscribe();
      setLinkError("Reset link expired. Request a new one.");
    })();

    return () => {
      cancelled = true;
    };
  }, [queryError, queryErrorCode, queryErrorDesc]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const p1 = (formData.get("password") as string) || "";
    const p2 = (formData.get("password_confirm") as string) || "";
    const invalid = validateNewPassword(p1);
    if (invalid) {
      setFormError(invalid);
      return;
    }
    if (p1 !== p2) {
      setFormError("Passwords do not match.");
      return;
    }
    startTransition(async () => {
      const result = await completePasswordReset(formData);
      if (result?.error) setFormError(result.error);
      else setDone(true);
    });
  }

  if (done) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 rounded-sm bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">Password updated</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">You can sign in with your new password.</p>
        <Link href="/login?status=password_updated">
          <Button className="w-full" size="lg">
            Sign in
          </Button>
        </Link>
      </div>
    );
  }

  if (linkError && !ready) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-3xl font-black text-[var(--color-text-primary)] mb-2">Link expired</h1>
        <p className="text-[var(--color-text-secondary)] mb-6">{linkError}</p>
        <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3 text-sm text-[var(--color-text-muted)] mb-6">
          Reset links are single-use and time-limited. Use <strong className="text-[var(--color-text-primary)]">Forgot password</strong>{" "}
          to get a fresh email.
        </div>
        <Link href="/forgot-password">
          <Button className="w-full mb-4" size="lg">
            Request new reset link
          </Button>
        </Link>
        <Link href="/login" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] flex items-center justify-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Sign In
        </Link>
      </div>
    );
  }

  if (!ready && !linkError) {
    return (
      <div className="animate-fade-in text-center py-8">
        <p className="text-[var(--color-text-secondary)] text-sm">Verifying reset link…</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[var(--color-text-primary)] mb-2">Set new password</h1>
        <p className="text-[var(--color-text-secondary)]">Choose a strong password for your account.</p>
      </div>
      <form method="post" action="/reset-password" onSubmit={handleSubmit} className="space-y-5">
        <Field label="New password" required icon={<KeyRound className="h-4 w-4" />}>
          <FieldInput
            name="password"
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            className="pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1"
            aria-label={showPw ? "Hide password" : "Show password"}
            aria-pressed={showPw}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </Field>
        <PasswordRequirements password={password} />
        <Field label="Confirm password" required icon={<KeyRound className="h-4 w-4" />}>
          <FieldInput
            name="password_confirm"
            type={showConfirm ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1"
            aria-label={showConfirm ? "Hide password" : "Show password"}
            aria-pressed={showConfirm}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </Field>

        {formError && (
          <div role="alert" className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {formError}
          </div>
        )}
        <Button type="submit" className="w-full" size="lg" loading={isPending} disabled={isPending}>
          Update password
        </Button>
      </form>
      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] flex items-center justify-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}
