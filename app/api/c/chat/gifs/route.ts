import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type GiphyImage = {
  url?: string;
  width?: string;
  height?: string;
};

type GiphyResult = {
  id: string;
  title?: string;
  images?: {
    original?: GiphyImage;
    fixed_width_small?: GiphyImage;
    downsized_medium?: GiphyImage;
  };
};

export type GifResult = {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
};

function positiveDimension(value?: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 220;
}

function mapGiphyResult(gif: GiphyResult): GifResult | null {
  const images = gif.images ?? {};
  const full = images.original ?? images.downsized_medium;
  const preview = images.fixed_width_small ?? images.downsized_medium ?? full;
  if (!full?.url || !preview?.url) return null;

  return {
    id: gif.id,
    title: gif.title?.trim() || "GIF",
    url: full.url,
    previewUrl: preview.url,
    width: positiveDimension(full.width),
    height: positiveDimension(full.height),
  };
}

/** Authenticated GIPHY search/trending proxy. Query: ?q=&limit=. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const requestedLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(30, Math.max(1, requestedLimit))
    : 20;

  const apiKey = process.env.GIPHY_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ results: [], enabled: false });

  const endpoint = new URL(
    q ? "https://api.giphy.com/v1/gifs/search" : "https://api.giphy.com/v1/gifs/trending"
  );
  endpoint.searchParams.set("api_key", apiKey);
  endpoint.searchParams.set("limit", String(limit));
  endpoint.searchParams.set("rating", "pg-13");
  endpoint.searchParams.set("lang", "en");
  if (q) endpoint.searchParams.set("q", q);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(endpoint.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({
        results: [],
        enabled: true,
        warning: `GIPHY error ${res.status}`,
      });
    }

    const data = (await res.json()) as { data?: GiphyResult[] };
    const results = (data.data ?? [])
      .map(mapGiphyResult)
      .filter((gif): gif is GifResult => gif !== null);

    return NextResponse.json({ results, enabled: true });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "GIPHY request timed out"
        : error instanceof Error
          ? error.message
          : "GIPHY request failed";
    return NextResponse.json({ results: [], enabled: true, warning: message });
  } finally {
    clearTimeout(timeout);
  }
}
