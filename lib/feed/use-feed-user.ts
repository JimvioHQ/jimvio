"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type FeedUser = {
  displayName: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

function toDisplayName(fullName: string | null, username: string | null): string {
  const first = fullName?.trim().split(/\s+/)[0];
  if (first) return first;
  if (username) return username.replace(/_/g, " ");
  return "there";
}

export function useFeedUser() {
  const [user, setUser] = useState<FeedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!authUser) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url")
        .eq("id", authUser.id)
        .maybeSingle();

      if (cancelled) return;

      const fullName = profile?.full_name ?? null;
      const username = profile?.username ?? null;

      setUser({
        displayName: toDisplayName(fullName, username),
        fullName,
        username,
        avatarUrl: profile?.avatar_url ?? null,
      });
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, isLoading, isAuthenticated };
}
