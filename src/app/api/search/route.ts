import { getAllProducts, getCategories, getFranchises, getProducts } from "@/lib/catalog";
import { productImagePath } from "@/lib/card";
import { correctQuery } from "@/lib/search-fuzzy";

/** Instant-search data for the search drop-down: matching products, quick links and type-ahead phrases. Small, cacheable JSON. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  const empty = { products: [], links: [], suggest: [], total: 0, corrected: null };
  if (q.length < 2) return Response.json(empty);

  const needle = q.toLowerCase();
  const [firstMatches, all, franchises, categories] = await Promise.all([getProducts({ q }), getAllProducts(), getFranchises(), getCategories()]);
  let matches = firstMatches;
  // Nothing matched? Try fixing small typos against the shop's own words.
  let corrected: string | null = null;
  if (matches.length === 0) {
    corrected = correctQuery(q, all, franchises, categories);
    if (corrected) { matches = await getProducts({ q: corrected }); if (matches.length === 0) corrected = null; }
  }
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));

  const rank = (name: string) => {
    const n = name.toLowerCase();
    return n.startsWith(needle) ? 0 : n.split(/\s+/).some((w) => w.startsWith(needle)) ? 1 : n.includes(needle) ? 2 : 3;
  };

  const products = matches
    .map((p) => ({ p, score: rank(p.name) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)
    .map(({ p }) => ({
      slug: p.slug, name: p.name, pricePence: p.pricePence, image: productImagePath(p), franchise: nameBySlug[p.franchiseSlug] ?? "", inStock: p.inStock,
    }));

  const links = [
    ...franchises.filter((f) => f.name.toLowerCase().includes(needle)).map((f) => ({ label: f.name, href: `/franchises/${f.slug}`, kind: "Franchise" })),
    ...categories.filter((c) => c.name.toLowerCase().includes(needle)).map((c) => ({ label: c.name, href: `/categories/${c.slug}`, kind: "Type" })),
  ].slice(0, 4);

  // Type-ahead phrases: franchise, type and product names that start with, or contain a word starting with, what was typed.
  const phrases = [...franchises.map((f) => f.name), ...categories.map((c) => c.name), ...all.map((p) => p.name)];
  const suggest = [...new Set(phrases)]
    .map((s) => ({ s, score: rank(s) }))
    .filter((x) => x.score < 3)
    .sort((a, b) => a.score - b.score || a.s.length - b.s.length)
    .slice(0, 6)
    .map((x) => x.s);

  return Response.json({ products, links, suggest, total: matches.length, corrected }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
