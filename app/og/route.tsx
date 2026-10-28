import { ImageResponse } from "next/og";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

function clean(value: string | null, max: number): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Per-page Open Graph image (N-9). Every page gets a real 1200×630 preview
 * with its own title instead of a 512px app icon declared as 1200×630.
 * Usage: /og?title=Communities&subtitle=Spaces%20for%20creators
 */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = clean(searchParams.get("title"), 90) || "Jimvio";
  const subtitle =
    clean(searchParams.get("subtitle"), 140) || "Sell, promote, create and get paid — in one account.";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #111111 0%, #1c1410 100%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#fd5000",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            J
          </div>
          <div style={{ display: "flex", color: "#fd5000", fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>
            JIMVIO
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: title.length > 40 ? 58 : 72, fontWeight: 800, lineHeight: 1.05 }}>
            {title}
          </div>
          <div style={{ display: "flex", marginTop: 24, color: "#c6c6c6", fontSize: 30, lineHeight: 1.3 }}>
            {subtitle}
          </div>
        </div>
        <div style={{ display: "flex", color: "#8a8a8a", fontSize: 24 }}>jimvio.com</div>
      </div>
    ),
    {
      ...SIZE,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" },
    },
  );
}
