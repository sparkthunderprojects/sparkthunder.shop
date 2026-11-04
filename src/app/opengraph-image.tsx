import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name} - official merchandise`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg,#0b0b12 0%,#1b1b30 60%,#c9a22744 100%)", color: "#f5f5f7" }}>
        <div style={{ display: "flex", fontSize: 40, letterSpacing: 10, color: "#c9a227" }}>SPARKTHUNDER</div>
        <div style={{ display: "flex", fontSize: 110, fontWeight: 800, marginTop: 20 }}>The Official Shop</div>
        <div style={{ display: "flex", fontSize: 38, color: "#a1a1b5", marginTop: 20 }}>Knightverge · Grim Gala · and more</div>
      </div>
    ),
    size,
  );
}
