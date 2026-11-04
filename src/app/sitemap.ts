import type { MetadataRoute } from "next";
import { getAllProducts, getCategories, getFranchises } from "@/lib/catalog";
import { LEGAL_PAGES, absoluteUrl } from "@/lib/site";

export const revalidate = 3600;
const LEGAL_UPDATED = "2026-11-04";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [franchises, categories, products] = await Promise.all([getFranchises(), getCategories(), getAllProducts()]);
  const latest = products.reduce((m, p) => (p.createdAt > m ? p.createdAt : m), "2026-01-01");
  return [
    { url: absoluteUrl("/"), lastModified: latest, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/franchises"), lastModified: latest, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/new"), lastModified: latest, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/shop"), lastModified: latest, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/gifts"), lastModified: latest, changeFrequency: "weekly", priority: 0.7 },
    ...LEGAL_PAGES.map((l) => ({ url: absoluteUrl(l.href), lastModified: LEGAL_UPDATED, changeFrequency: "yearly" as const, priority: 0.2 })),
    ...franchises.map((f) => ({ url: absoluteUrl(`/franchises/${f.slug}`), lastModified: latest, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...categories.map((c) => ({ url: absoluteUrl(`/categories/${c.slug}`), lastModified: latest, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({
      url: absoluteUrl(`/products/${p.slug}`),
      lastModified: p.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: [p.images[0] ? (p.images[0].startsWith("http") ? p.images[0] : absoluteUrl(p.images[0])) : absoluteUrl(`/art/${p.slug}`)],
    })),
  ];
}
