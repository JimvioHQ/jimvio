export const runtime = "nodejs";

const ALLOWED_HOSTS = [
  "download-only-api.cjdropshipping.com",
  "video-cf.cjdropshipping.com",
  "cf.cjdropshipping.com",
];

export async function GET(req: Request): Promise<Response> {
  const rawUrl = new URL(req.url).searchParams.get("url");
  if (!rawUrl) {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return Response.json({ error: "Invalid url" }, { status: 400 });
  }

  if (
    !ALLOWED_HOSTS.some(
      (host) => target.hostname === host || target.hostname.endsWith(`.${host}`),
    )
  ) {
    return Response.json({ error: "URL not allowed" }, { status: 403 });
  }

  const upstream = await fetch(target.toString(), {
    headers: {
      Referer: "https://developers.cjdropshipping.com/",
    },
  });

  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: `Upstream ${upstream.status}` }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "video/mp4";

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
    },
  });
}
