import { ImageResponse } from "next/og";
import { getFranchise, getProduct } from "@/lib/catalog";
import { darkWorld } from "@/lib/theme";

/** Franchise-coloured placeholder artwork (PNG) for products without uploaded photography. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return new Response("Not found", { status: 404 });
  const franchise = await getFranchise(product.franchiseSlug);
  const accent = franchise?.accent ?? "#c9a227";
  const bg = darkWorld(accent);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: bg, color: "#f4f2f8", fontFamily: "sans-serif" }}>
        <svg width="1200" height="1200" viewBox="0 0 1200 1200" style={{ position: "absolute", left: 0, top: 0 }}>
          <polygon points="1200,0 1200,1200 930,1200 990,980 900,820 980,620 890,430 960,230 900,0" fill={accent} opacity="0.35" />
          <polyline points="900,0 960,230 890,430 980,620 900,820 990,980 930,1200" fill="none" stroke="#FFD400" strokeWidth="10" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 80, width: "78%", height: "100%" }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "#FFD400", marginBottom: 24 }}>{franchise?.name ?? "Sparkthunder"}</div>
          <div style={{ display: "flex", fontSize: 118, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>{product.name}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 1200, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } },
  );
}
