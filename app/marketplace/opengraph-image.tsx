import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Jimvio Marketplace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function MarketplaceOpenGraphImage() {
  return new ImageResponse(
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 72, background: "#151515", color: "white" }}>
      <div style={{ display: "flex", color: "#fd5000", fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>JIMVIO MARKETPLACE</div>
      <div style={{ display: "flex", marginTop: 28, fontSize: 66, fontWeight: 700 }}>Discover what creators<br />are building.</div>
      <div style={{ display: "flex", marginTop: 28, color: "#d0d0d0", fontSize: 28 }}>Products, experiences, and digital goods.</div>
    </div>,
    size,
  );
}
