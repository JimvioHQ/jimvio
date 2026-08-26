"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { beginPasswordRecovery } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { isSafeInternalPath } from "@/lib/auth/safe-path";
import type { AuthChangeEvent } from "@supabase/supabase-js";

function parseHash(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

export function AuthCompleteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    let cancelled = false;
    const hash = parseHash();
    const err = hash.get("error") || searchParams.get("error");
    const errCode = hash.get("error_code") || searchParams.get("error_code");
    const nextRaw = searchParams.get("next") ?? "/dashboard";
    const next = isSafeInternalPath(nextRaw) && nextRaw !== "/reset-password"
      ? nextRaw
      : "/dashboard";

    if (err === "access_denied" || errCode === "otp_expired") {
      const looksLikeReset = hash.get("type") === "recovery" || searchParams.get("type") === "recovery";
      if (looksLikeReset) {
        router.replace("/reset-password?error=link_expired");
      } else {
        router.replace("/verify?status=expired");
      }
      return;
    }

    (async () => {
      const supabase = createClient();
      let recoveryHandled = false;

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent) => {
        if (cancelled || recoveryHandled) return;
        if (event === "PASSWORD_RECOVERY") {
          recoveryHandled = true;
          const marked = await beginPasswordRecovery();
          if (cancelled) return;
          router.replace(marked.ok ? "/reset-password" : "/reset-password?error=link_expired");
          return;
        }
        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          return;
        }
      });

      const marked = await beginPasswordRecovery();
      if (cancelled) {
        subscription.unsubscribe();
        return;
      }
      if (marked.ok) {
        recoveryHandled = true;
        router.replace("/reset-password");
        subscription.unsubscribe();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) {
        subscription.unsubscribe();
        return;
      }
      if (user) {
        router.replace(next);
        subscription.unsubscribe();
        return;
      }

      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) {
        subscription.unsubscribe();
        return;
      }
      setMessage("We could not finish sign-in from this link.");
      subscription.unsubscribe();
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="w-full text-center py-10">
      <p className="text-[14px] font-medium text-zinc-500 mb-6">{message}</p>
      <Link href="/login" className="text-sm font-bold text-orange-600">
        Back to sign in
      </Link>
    </div>
  );
}
