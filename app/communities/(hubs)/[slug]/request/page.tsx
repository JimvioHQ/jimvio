"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Private-community "Request to join" target.
 * Submits a join request (approval required) via the existing join API.
 */
export default function CommunityJoinRequestPage() {
  const params = useParams();
  const router = useRouter();
  const slug =
    typeof params.slug === "string"
      ? params.slug
      : Array.isArray(params.slug)
        ? params.slug[0]
        : "";

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/communities/${slug}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          pending?: boolean;
        };
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 401) {
            router.replace(`/login?next=${encodeURIComponent(`/communities/${slug}/request`)}`);
            return;
          }
          setStatus("error");
          setMessage(data.error || "Could not submit join request");
          return;
        }
        setStatus("ok");
        setMessage(
          data.pending
            ? "Request sent. The owner will review it."
            : "You are in."
        );
        router.replace(`/communities/${slug}`);
        router.refresh();
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Could not submit join request");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
      {status === "loading" && (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-muted)]">Submitting join request…</p>
        </>
      )}
      {status === "ok" && (
        <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
      )}
      {status === "error" && (
        <>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {message ?? "Join request failed"}
          </p>
          <Link
            href={`/communities/${slug}`}
            className="text-sm font-semibold text-[#fd5000] hover:underline"
          >
            Back to community
          </Link>
        </>
      )}
    </div>
  );
}
