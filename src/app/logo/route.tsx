import { ImageResponse } from "next/og";

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0b12", color: "#c9a227", fontSize: 300, fontWeight: 800 }}>
        S
      </div>
    ),
    { width: 512, height: 512, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } },
  );
}
