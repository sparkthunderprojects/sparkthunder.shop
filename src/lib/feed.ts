import { getAllProducts, getFranchises } from "@/lib/catalog";
import { characterName, characterSlugs } from "@/lib/characters";
import { productImagePath } from "@/lib/card";
import { BRAND_TOKEN, ORIGIN_TOKEN, absoluteUrl } from "@/lib/site";

export type FeedProduct = {
  slug: string; name: string; url: string; image: string; pricePence: number; price: string; comparePricePence: number | null;
  inStock: boolean; isNew: boolean; franchise: { slug: string; name: string };
};
export type Feed = {
  shop: { name: string; url: string };
  franchise: { slug: string; name: string; accent: string; url: string } | null;
  character: { slug: string; name: string; url: string } | null;
  products: FeedProduct[];
};

const gbp = (p: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
const clean = (v: string | null | undefined, max = 40) => (v ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, max);

/** Public product feed for universe websites. `ref` becomes utm_source so each site's clicks are identifiable in analytics. */
export async function buildFeed(q: { character?: string | null; franchise?: string | null; category?: string | null; limit?: number; sort?: string | null; inStockOnly?: boolean; ref?: string | null }): Promise<Feed> {
  const [products, franchises] = await Promise.all([getAllProducts(), getFranchises()]);
  const fr = new Map(franchises.map((f) => [f.slug, f]));
  const wanted = clean(q.franchise) && clean(q.franchise) !== "all" ? clean(q.franchise) : null;
  const franchise = wanted ? fr.get(wanted) ?? null : null;
  const char = clean(q.character, 60) || null;
  const ref = clean(q.ref) || wanted || "universe-site";
  const limit = Math.min(24, Math.max(1, Math.floor(q.limit ?? 8) || 8));

  let list = products.filter((p) => (!wanted || p.franchiseSlug === wanted) && (!char || characterSlugs(p).includes(char)) && (!q.category || p.categorySlug === clean(q.category)) && (!q.inStockOnly || p.inStock));
  list = [...list].sort((a, b) => (q.sort === "featured" ? Number(b.isFeatured) - Number(a.isFeatured) : 0) || b.createdAt.localeCompare(a.createdAt));

  const utm = `utm_source=${ref}&utm_medium=universe-site&utm_campaign=latest-products`;
  return {
    shop: { name: BRAND_TOKEN, url: ORIGIN_TOKEN },
    franchise: franchise ? { slug: franchise.slug, name: franchise.name, accent: franchise.accent, url: `${absoluteUrl(`/franchises/${franchise.slug}`)}?${utm}` } : null,
    character: char ? { slug: char, name: characterName(char), url: `${absoluteUrl(`/characters/${char}`)}?${utm}` } : null,
    products: list.slice(0, limit).map((p) => {
      const img = productImagePath(p);
      return {
        slug: p.slug, name: p.name, url: `${absoluteUrl(`/products/${p.slug}`)}?${utm}`, image: img.startsWith("http") ? img : absoluteUrl(img),
        pricePence: p.pricePence, price: gbp(p.pricePence), comparePricePence: p.comparePricePence ?? null, inStock: p.inStock, isNew: p.isNew,
        franchise: { slug: p.franchiseSlug, name: fr.get(p.franchiseSlug)?.name ?? p.franchiseSlug },
      };
    }),
  };
}
