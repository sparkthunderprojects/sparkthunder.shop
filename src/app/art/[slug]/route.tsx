import { ImageResponse } from "next/og";
import { getFranchise, getProduct } from "@/lib/catalog";

/** Branded placeholder artwork (PNG) for products without uploaded photography. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return new Response("Not found", { status: 404 });
  const franchise = await getFranchise(product.franchiseSlug);
  const accent = franchise?.accent ?? "#c9a227";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: 72,
          background: `linear-gradient(135deg, #0b0b12 0%, #171726 55%, ${accent}55 100%)`,
          color: "#f5f5f7", fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, letterSpacing: 8, color: accent, textTransform: "uppercase" }}>
          {franchise?.name ?? "Sparkthunder"}
        </div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}>{product.name}</div>
        <div style={{ display: "flex", fontSize: 30, color: "#a1a1b5" }}>Official Sparkthunder merchandise</div>
      </div>
    ),
    { width: 1200, height: 1200, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } },
  );
}
