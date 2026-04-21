"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

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

  const queryError = searchParams.get("error");
  const queryErrorCode = searchParams.get("error_code");
  const queryErrorDesc = searchParams.get("error_description");

  useEffect(() => {
    const hash = parseHashParams();
    const err = queryError || hash.error;
    const errCode = queryErrorCode || hash.error_code;
    const errDesc = queryErrorDesc || hash.error_description;

    if (err === "access_denied" || errCode === "otp_expired") {
      setLinkError(
        "This password reset link has expired or was already used. Request a new link below."
      );
      return;
    }
    if (errCode || err) {
      setLinkError(
        (errDesc && decodeURIComponent(errDesc.replace(/\+/g, " "))) ||
          "This link is invalid. Request a new reset email."
      );
      return;
    }

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setReady(true);
        return;
      }
      await new Promise((r) => setTimeout(r, 150));
      const { data: { session: s2 } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (s2) {
        setReady(true);
        return;
      }
      await new Promise((r) => setTimeout(r, 400));
      const { data: { session: s3 } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (s3) {
        setReady(true);
        return;
      }
      setLinkError(
        "We could not verify your reset session. Open the link from your latest email, or request a new reset link."
      );
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
    if (p1.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (p1 !== p2) {
      setFormError("Passwords do not match.");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: p1 });
      if (error) setFormError(error.message);
      else setDone(true);
    });
  }

  if (done) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 rounded-none bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">Password updated</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">You can sign in with your new password.</p>
        <Link href="/login">
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
        <div className="rounded-none border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3 text-sm text-[var(--color-text-muted)] mb-6">
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
        <p className="text-[var(--color-text-secondary)] text-sm">Verifying reset linkâ€¦</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[var(--color-text-primary)] mb-2">Set new password</h1>
        <p className="text-[var(--color-text-secondary)]">Choose a strong password for your account.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          name="password"
          type="password"
          label="New password"
          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
          icon={<KeyRound className="h-4 w-4" />}
          autoComplete="new-password"
          required
          minLength={8}
        />
        <Input
          name="password_confirm"
          type="password"
          label="Confirm password"
          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
          icon={<KeyRound className="h-4 w-4" />}
          autoComplete="new-password"
          required
          minLength={8}
        />
        {formError && (
          <div className="rounded-none border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {formError}
          </div>
        )}
        <Button type="submit" className="w-full" size="lg" loading={isPending}>
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

