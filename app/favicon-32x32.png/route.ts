export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const source = new URL("/api/site-icons/favicon-32", request.url);
  const response = await fetch(source, { cache: "no-store" });
  if (!response.ok) return new Response(null, { status: response.status });
  return new Response(response.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
