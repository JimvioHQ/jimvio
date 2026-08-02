"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { IdentityProfilePayload } from "@/lib/identity/types";
import { IdentityProfileView } from "@/components/identity/IdentityProfileView";
import { IdentityEmptyState } from "@/components/identity/identity-ui";

/**
 * Client-side fallback for the public profile page — used only if the
 * server-side resolver (`@/lib/identity/resolve`) is temporarily unavailable.
 */
export function IdentityPublicProfileClient({ username }: { username: string }) {
  const [payload, setPayload] = useState<IdentityProfilePayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    fetch(`/api/identity/${encodeURIComponent(username)}`)
      .then(async (res) => {
        if (!active) return;
        if (res.status === 404) return setStatus("not-found");
        if (!res.ok) return setStatus("error");
        const data = (await res.json()) as IdentityProfilePayload;
        setPayload(data);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [username]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#FF5A1F]" />
      </div>
    );
  }

  if (status === "not-found" || (status === "ready" && !payload)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24">
        <IdentityEmptyState title="Profile not found" description="This Jimvio identity profile doesn't exist." />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24">
        <IdentityEmptyState title="Couldn't load this profile" description="Please try again in a moment." />
      </div>
    );
  }

  return <IdentityProfileView payload={payload as IdentityProfilePayload} />;
}
