import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Jimvio — creator commerce";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 72, background: "#111111", color: "#ffffff" }}>
      <div style={{ display: "flex", color: "#fd5000", fontSize: 32, fontWeight: 700, letterSpacing: 3 }}>JIMVIO</div>
      <div style={{ display: "flex", marginTop: 28, fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>Creator commerce,<br />built to move.</div>
      <div style={{ display: "flex", marginTop: 30, color: "#c6c6c6", fontSize: 28 }}>Create, connect, and sell in one place.</div>
    </div>,
    size,
  );
}
