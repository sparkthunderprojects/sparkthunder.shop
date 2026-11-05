import { getAllProducts, getFranchises } from "@/lib/catalog";
import { toQuick } from "@/lib/card";

/** Resolves a list of product slugs (favourites, recently viewed) into small card data, in the order asked. */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("slugs") ?? "";
  const slugs = [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9-]{1,120}$/.test(s)))].slice(0, 40);
  if (slugs.length === 0) return Response.json({ products: [] });
  const [products, franchises] = await Promise.all([getAllProducts(), getFranchises()]);
  const names = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const out = slugs.map((s) => bySlug.get(s)).filter((p): p is NonNullable<typeof p> => Boolean(p)).map((p) => toQuick(p, names[p.franchiseSlug]));
  return Response.json({ products: out }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
