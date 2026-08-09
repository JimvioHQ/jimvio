"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WorkspaceHome } from "@/components/jimvio-os";

/**
 * Authenticated Home entry (URL remains /dashboard for deep-link compatibility).
 * Not presented as a "Dashboard" product — calm workspace home only.
 */
export default function HomePage() {
  const [name, setName] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) setName(undefined);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const display =
        profile?.full_name?.trim() ||
        profile?.email?.split("@")[0] ||
        user.email?.split("@")[0] ||
        undefined;
      setName(display);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-full bg-[var(--color-bg)] px-2 py-4 sm:px-0 sm:py-6">
      <WorkspaceHome name={name} />
    </div>
  );
}
