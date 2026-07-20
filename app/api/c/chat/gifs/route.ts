import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TenorMediaFormat = { url?: string; dims?: number[]; size?: number };
type TenorResult = {
  id: string;
  content_description?: string;
  media_formats?: Record<string, TenorMediaFormat>;
};

export type GifResult = {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
};

function mapTenorResult(r: TenorResult): GifResult | null {
  const formats = r.media_formats ?? {};
  const full = formats.gif ?? formats.mediumgif ?? formats.tinygif;
  const preview = formats.tinygif ?? formats.nanogif ?? full;
  if (!full?.url || !preview?.url) return null;
  return {
    id: r.id,
    title: r.content_description || "GIF",
    url: full.url,
    previewUrl: preview.url,
    width: full.dims?.[0] ?? 220,
    height: full.dims?.[1] ?? 220,
  };
}

/** GET — Tenor GIF search proxy. Query: ?q=&limit= (falls back to empty results if TENOR_API_KEY is unset). */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(30, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  const apiKey = process.env.TENOR_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ results: [], enabled: false });
  }

  const endpoint = new URL(q ? "https://tenor.googleapis.com/v2/search" : "https://tenor.googleapis.com/v2/featured");
  endpoint.searchParams.set("key", apiKey);
  endpoint.searchParams.set("client_key", "jimvio_community");
  endpoint.searchParams.set("limit", String(limit));
  endpoint.searchParams.set("media_filter", "gif,tinygif,mediumgif");
  endpoint.searchParams.set("contentfilter", "medium");
  if (q) endpoint.searchParams.set("q", q);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(endpoint.toString(), { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ results: [], enabled: true, warning: `Tenor error ${res.status}` });
    }

    const data = (await res.json()) as { results?: TenorResult[] };
    const results = (data.results ?? [])
      .map(mapTenorResult)
      .filter((r): r is GifResult => r !== null);

    return NextResponse.json({ results, enabled: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tenor request failed";
    return NextResponse.json({ results: [], enabled: true, warning: message });
  }
}
