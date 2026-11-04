import { getCategories, getFranchises, getProducts } from "@/lib/catalog";
import { productImagePath } from "@/lib/card";

/** Instant-search suggestions for the header search box. Small, cacheable JSON. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  const empty = { products: [], links: [] };
  if (q.length < 2) return Response.json(empty);

  const needle = q.toLowerCase();
  const [products, franchises, categories] = await Promise.all([getProducts({ q }), getFranchises(), getCategories()]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));

  const ranked = products
    .map((p) => ({ p, score: p.name.toLowerCase().startsWith(needle) ? 0 : p.name.toLowerCase().includes(needle) ? 1 : 2 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 6)
    .map(({ p }) => ({
      slug: p.slug, name: p.name, pricePence: p.pricePence, image: productImagePath(p), franchise: nameBySlug[p.franchiseSlug] ?? "",
    }));

  const links = [
    ...franchises.filter((f) => f.name.toLowerCase().includes(needle)).map((f) => ({ label: f.name, href: `/franchises/${f.slug}`, kind: "Franchise" })),
    ...categories.filter((c) => c.name.toLowerCase().includes(needle)).map((c) => ({ label: c.name, href: `/categories/${c.slug}`, kind: "Type" })),
  ].slice(0, 4);

  return Response.json({ products: ranked, links }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
