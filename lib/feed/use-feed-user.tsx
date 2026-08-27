"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, User } from "@supabase/supabase-js";
import {
  type FeedAuthInitial,
  type FeedUser,
  toDisplayName,
} from "@/lib/feed/feed-user";

export type { FeedAuthInitial, FeedUser };

const FeedAuthInitialContext = createContext<FeedAuthInitial | null>(null);

export function FeedAuthProvider({
  initial,
  children,
}: {
  initial: FeedAuthInitial;
  children: ReactNode;
}) {
  return (
    <FeedAuthInitialContext.Provider value={initial}>
      {children}
    </FeedAuthInitialContext.Provider>
  );
}

export function useFeedUser() {
  const initial = useContext(FeedAuthInitialContext);
  const [user, setUser] = useState<FeedUser | null>(initial?.user ?? null);
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(initial?.isAuthenticated),
  );
  const [isLoading, setIsLoading] = useState(initial == null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const serverAuthenticated = Boolean(initial?.isAuthenticated);

    async function applyAuthUser(
      authUser: User | null,
      allowDowngrade: boolean,
    ) {
      if (cancelled) return;

      if (!authUser) {
        if (allowDowngrade || !serverAuthenticated) {
          setIsAuthenticated(false);
          setUser(null);
        }
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
        id: authUser.id,
        displayName: toDisplayName(fullName, username),
        fullName,
        username,
        avatarUrl: profile?.avatar_url ?? null,
      });
      setIsLoading(false);
    }

    void supabase.auth.getUser().then(({ data: { user: authUser } }: { data: { user: User | null } }) => {
      void applyAuthUser(authUser, false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_OUT") {
        void applyAuthUser(null, true);
        return;
      }
      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        void supabase.auth.getUser().then(({ data: { user: authUser } }: { data: { user: User | null } }) => {
          void applyAuthUser(authUser, false);
        });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [initial?.isAuthenticated]);

  return { user, isLoading, isAuthenticated };
}
