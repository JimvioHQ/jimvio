"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BrandRole } from "@/lib/ugc/enterprise/permissions";
import { readStoredBrandId, withBrandQuery, writeStoredBrandId } from "@/lib/ugc/client/with-brand-query";

export type UgcWorkspace = {
  id: string;
  name: string;
  logo: string | null;
  slug: string | null;
  role: BrandRole;
};

type Ctx = {
  workspaces: UgcWorkspace[];
  brandId: string | null;
  role: BrandRole | null;
  loading: boolean;
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

  const [workspaces, setWorkspaces] = useState<UgcWorkspace[]>([]);
  const [brandId, setBrandIdState] = useState<string | null>(urlBrandId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setWorkspaces(Array.isArray(json.data) ? (json.data as UgcWorkspace[]) : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load workspaces");
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
    const stored = readStoredBrandId();
    const preferred = urlBrandId || stored;
    const allowed =
      preferred && workspaces.some((w) => w.id === preferred) ? preferred : workspaces[0]?.id ?? null;
    if (allowed !== brandId) setBrandIdState(allowed);
    if (allowed) writeStoredBrandId(allowed);

    const unauthorized = Boolean(urlBrandId && allowed && urlBrandId !== allowed);
    const missingOnBrand =
      pathname.startsWith("/ugc/campaign-center") && Boolean(allowed) && !urlBrandId;
    if ((unauthorized || missingOnBrand) && allowed) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("brandId", allowed);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  }, [loading, workspaces, urlBrandId, pathname, searchParams, brandId, router]);

  const setBrandId = useCallback(
    (id: string) => {
      if (!workspaces.some((w) => w.id === id)) return;
      setBrandIdState(id);
      writeStoredBrandId(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set("brandId", id);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams, workspaces],
  );

  const ugcFetch = useCallback(
    (input: string, init?: RequestInit) => fetch(withBrandQuery(input, brandId), init),
    [brandId],
  );

  const role = workspaces.find((w) => w.id === brandId)?.role ?? null;

  const value = useMemo<Ctx>(
    () => ({ workspaces, brandId, role, loading, error, setBrandId, ugcFetch }),
    [workspaces, brandId, role, loading, error, setBrandId, ugcFetch],
  );

  return (
    <UgcBrandWorkspaceContext.Provider value={value}>{children}</UgcBrandWorkspaceContext.Provider>
  );
}

export function useUgcBrandWorkspace() {
  const ctx = useContext(UgcBrandWorkspaceContext);
  if (!ctx) {
    return {
      workspaces: [] as UgcWorkspace[],
      brandId: null as string | null,
      role: null as BrandRole | null,
      loading: false,
      error: null as string | null,
      setBrandId: (_id: string) => {},
      ugcFetch: (input: string, init?: RequestInit) => fetch(input, init),
    };
  }
  return ctx;
}
