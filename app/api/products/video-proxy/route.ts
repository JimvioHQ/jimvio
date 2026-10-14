import {
  isStreamableVideoStatus,
  parseProductVideoProxyTarget,
  videoProxyResponseHeaders,
  videoProxyUpstreamHeaders,
} from "@/lib/media/video-proxy";

export const runtime = "nodejs";

async function proxyProductVideo(req: Request): Promise<Response> {
  const rawUrl = new URL(req.url).searchParams.get("url");
  const target = parseProductVideoProxyTarget(rawUrl);
  if (!rawUrl) {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }
  if (!target) {
    return Response.json({ error: "URL not allowed" }, { status: 403 });
  }

  const upstream = await fetch(target.toString(), {
    method: req.method === "HEAD" ? "HEAD" : "GET",
    headers: videoProxyUpstreamHeaders(req.headers.get("range")),
  });

  if (!isStreamableVideoStatus(upstream.status) || (upstream.status !== 416 && !upstream.body && req.method !== "HEAD")) {
    return Response.json({ error: "Video unavailable" }, { status: 502 });
  }

  return new Response(req.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: videoProxyResponseHeaders(upstream.headers, upstream.status),
  });
}

export function GET(req: Request): Promise<Response> {
  return proxyProductVideo(req);
}

export function HEAD(req: Request): Promise<Response> {
  return proxyProductVideo(req);
}
