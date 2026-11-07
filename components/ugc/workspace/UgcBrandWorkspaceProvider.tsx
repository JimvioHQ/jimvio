"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BrandRole } from "@/lib/ugc/enterprise/permissions";
import { withBrandQuery, readBrandIdForUser, writeBrandIdForUser } from "@/lib/ugc/client/with-brand-query";
import { clearAllUgcTenantClientState } from "@/lib/ugc/client/tenant-storage";

export type UgcWorkspace = {
  id: string;
  name: string;
  logo: string | null;
  slug: string | null;
  role: BrandRole;
};

type Ctx = {
  userId: string | null;
  workspaces: UgcWorkspace[];
  brandId: string | null;
  role: BrandRole | null;
  loading: boolean;
  /** True once workspaces loaded and an authorized brandId is selected (or none available). */
  brandReady: boolean;
  error: string | null;
  setBrandId: (id: string) => void;
  ugcFetch: (input: string, init?: RequestInit) => Promise<Response>;
};

const UgcBrandWorkspaceContext = createContext<Ctx | null>(null);

export function UgcBrandWorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlBrandId = searchParams.get("brandId") ?? searchParams.get("brand_id");

  const [userId, setUserId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<UgcWorkspace[]>([]);
  const [brandId, setBrandIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/ugc/workspaces", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Forbidden");
        if (cancelled) return;
        const nextUserId = typeof json.userId === "string" ? json.userId : null;
        // Account switch in the same browser: wipe all prior UGC tenant cache.
        if (
          previousUserId.current &&
          nextUserId &&
          previousUserId.current !== nextUserId
        ) {
          clearAllUgcTenantClientState();
        }
        previousUserId.current = nextUserId;
        setUserId(nextUserId);
        setWorkspaces(Array.isArray(json.data) ? (json.data as UgcWorkspace[]) : []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load workspaces");
          setUserId(null);
          setWorkspaces([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const stored = userId ? readBrandIdForUser(userId) : null;
    const preferred = urlBrandId || stored;
    const allowed =
      preferred && workspaces.some((w) => w.id === preferred)
        ? preferred
        : workspaces[0]?.id ?? null;
    if (allowed !== brandId) setBrandIdState(allowed);
    if (allowed && userId) writeBrandIdForUser(userId, allowed);

    const unauthorized = Boolean(urlBrandId && allowed && urlBrandId !== allowed);
    const missingOnBrand =
      pathname.startsWith("/ugc/campaign-center") && Boolean(allowed) && !urlBrandId;
    if ((unauthorized || missingOnBrand) && allowed) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("brandId", allowed);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  }, [loading, workspaces, urlBrandId, pathname, searchParams, brandId, router, userId]);

  const setBrandId = useCallback(
    (id: string) => {
      if (!workspaces.some((w) => w.id === id)) return;
      setBrandIdState(id);
      if (userId) writeBrandIdForUser(userId, id);
      const params = new URLSearchParams(searchParams.toString());
      params.set("brandId", id);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams, workspaces, userId],
  );

  const brandReady = !loading && (workspaces.length === 0 || brandId != null);

  const ugcFetch = useCallback(
    (input: string, init?: RequestInit) => {
      // Always attach the authorized brandId when available — never invent one.
      return fetch(withBrandQuery(input, brandId), init);
    },
    [brandId],
  );

  const role = workspaces.find((w) => w.id === brandId)?.role ?? null;

  const value = useMemo<Ctx>(
    () => ({
      userId,
      workspaces,
      brandId,
      role,
      loading,
      brandReady,
      error,
      setBrandId,
      ugcFetch,
    }),
    [userId, workspaces, brandId, role, loading, brandReady, error, setBrandId, ugcFetch],
  );

  return (
    <UgcBrandWorkspaceContext.Provider value={value}>{children}</UgcBrandWorkspaceContext.Provider>
  );
}

export function useUgcBrandWorkspace() {
  const ctx = useContext(UgcBrandWorkspaceContext);
  if (!ctx) {
    throw new Error("useUgcBrandWorkspace must be used within UgcBrandWorkspaceProvider");
  }
  return ctx;
}

/** Optional hook for pages that may render outside the brand provider. */
export function useOptionalUgcBrandWorkspace() {
  return useContext(UgcBrandWorkspaceContext);
}
