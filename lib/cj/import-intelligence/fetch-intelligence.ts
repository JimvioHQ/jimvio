import type { CJIntelligencePayload } from "./enrichment-types";
import {
  getCachedIntelligence,
  setCachedIntelligence,
} from "./enrichment-cache";

export async function fetchCJIntelligence(
  pid: string
): Promise<CJIntelligencePayload | null> {
  const cached = getCachedIntelligence(pid);
  if (cached) return cached;

  try {
    const res = await fetch(
      `/api/cj/products/${encodeURIComponent(pid)}?intelligence=1`,
      { priority: "low" } as RequestInit
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.intelligence) return null;
    const data = json.intelligence as CJIntelligencePayload;
    setCachedIntelligence(data);
    return data;
  } catch {
    return null;
  }
}
