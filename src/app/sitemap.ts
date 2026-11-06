import type { MetadataRoute } from "next";
import { getAllProducts, getCategories, getCollections, getFranchises } from "@/lib/catalog";
import { franchiseSeo, categorySeo, productSeo } from "@/lib/seo/effective";
import { LEGAL_PAGES, absoluteUrl } from "@/lib/site";

export const revalidate = 3600;
const LEGAL_UPDATED = "2026-11-04";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [franchises, categories, products, collections] = await Promise.all([getFranchises(), getCategories(), getAllProducts(), getCollections()]);
  const latest = products.reduce((m, p) => (p.createdAt > m ? p.createdAt : m), "2026-01-01");
  return [
    { url: absoluteUrl("/"), lastModified: latest, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/franchises"), lastModified: latest, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/new"), lastModified: latest, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/shop"), lastModified: latest, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/collections"), lastModified: latest, changeFrequency: "weekly", priority: 0.7 },
    ...collections.map((c) => ({ url: absoluteUrl(`/collections/${c.slug}`), lastModified: latest, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: absoluteUrl("/gift-cards"), lastModified: latest, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/gifts"), lastModified: latest, changeFrequency: "weekly", priority: 0.7 },
    ...LEGAL_PAGES.map((l) => ({ url: absoluteUrl(l.href), lastModified: LEGAL_UPDATED, changeFrequency: "yearly" as const, priority: 0.2 })),
    ...franchises.filter((f) => !franchiseSeo(f).noindex).map((f) => ({ url: absoluteUrl(`/franchises/${f.slug}`), lastModified: f.updatedAt ?? latest, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...categories.filter((c) => !categorySeo(c).noindex).map((c) => ({ url: absoluteUrl(`/categories/${c.slug}`), lastModified: c.updatedAt ?? latest, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.filter((p) => !productSeo(p, null).noindex).map((p) => ({
      url: absoluteUrl(`/products/${p.slug}`),
      lastModified: p.updatedAt ?? p.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: p.images.length ? p.images.map((src) => (src.startsWith("http") ? src : absoluteUrl(src))) : [absoluteUrl(`/art/${p.slug}`)],
    })),
  ];
}
