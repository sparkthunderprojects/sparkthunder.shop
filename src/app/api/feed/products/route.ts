import { buildFeed } from "@/lib/feed";

const CORS = {
  "Access-Control-Allow-Origin": "*", // public catalogue data, read-only
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * GET /api/feed/products?character=character-slug&franchise=knightverge&limit=4&sort=new|featured&category=apparel&instock=1&ref=knightverge-com
 * Public, cached JSON of the latest products for universe websites.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const feed = await buildFeed({ character: sp.get("character"), franchise: sp.get("franchise"), category: sp.get("category"), limit: Number(sp.get("limit")) || 8, sort: sp.get("sort"), inStockOnly: sp.get("instock") === "1", ref: sp.get("ref") });
  return Response.json(feed, { headers: { ...CORS, "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}
