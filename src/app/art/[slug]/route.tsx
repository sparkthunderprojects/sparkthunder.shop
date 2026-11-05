import { ImageResponse } from "next/og";
import { getFranchise, getProduct } from "@/lib/catalog";
import { darkWorld } from "@/lib/theme";

/** Franchise-coloured placeholder artwork (PNG) for products without uploaded photography. */
function mix(hex: string, base: string, t: number) {
  const n = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = n(hex), b = n(base);
  return "#" + a.map((v, i) => Math.round(v * t + b[i] * (1 - t)).toString(16).padStart(2, "0")).join("");
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return new Response("Not found", { status: 404 });
  const franchise = await getFranchise(product.franchiseSlug);
  const accent = franchise?.accent ?? "#c9a227";
  const bg = darkWorld(accent);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: `linear-gradient(145deg, ${mix(accent, bg, 0.32)} 0%, ${bg} 62%)`, color: "#f5f5f5", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 170px 210px 170px", width: "100%", height: "100%" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: "#ffffff99", marginBottom: 20 }}>{franchise?.name ?? "Sparkthunder"}</div>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3 }}>{product.name}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 1200, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } },
  );
}
