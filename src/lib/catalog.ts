import { unstable_cache } from "next/cache";
import { publicClient } from "@/lib/db/clients";
import { categoryFromRow, franchiseFromRow, productFromRow, type CategoryRow, type FranchiseRow, type ProductRow } from "@/lib/db/mappers";
import { seedCatalog } from "@/data/seed";
import type { Catalog, Product } from "@/lib/types";

export const CATALOG_TAG = "catalog";

async function loadFromSupabase(): Promise<Catalog | null> {
  const supabase = publicClient();
  if (!supabase) return null;
  const [f, c, p] = await Promise.all([
    supabase.from("franchises").select("*").order("sort_order"),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("products").select("*").eq("published", true).order("created_at", { ascending: false }),
  ]);
  if (f.error || c.error || p.error) {
    console.error("[catalog] Supabase error, falling back to seed:", f.error ?? c.error ?? p.error);
    return null;
  }
  return {
    franchises: (f.data as FranchiseRow[]).map(franchiseFromRow),
    categories: (c.data as CategoryRow[]).map(categoryFromRow),
    products: (p.data as ProductRow[]).map(productFromRow),
  };
}

/** One cached read of the whole catalogue (revalidates every 5 min or via /api/revalidate). */
const loadCatalog = unstable_cache(
  async (): Promise<Catalog> => (await loadFromSupabase()) ?? seedCatalog,
  ["catalog-v1"],
  { tags: [CATALOG_TAG], revalidate: 300 },
);

export async function getFranchises() {
  return (await loadCatalog()).franchises;
}
export async function getFranchise(slug: string) {
  return (await getFranchises()).find((f) => f.slug === slug) ?? null;
}
export async function getCategories() {
  return (await loadCatalog()).categories;
}
export async function getCategory(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}
export async function getAllProducts() {
  return (await loadCatalog()).products;
}
export async function getProduct(slug: string) {
  return (await getAllProducts()).find((p) => p.slug === slug) ?? null;
}

export async function getProducts(filter: { franchise?: string; category?: string; q?: string; onlyNew?: boolean } = {}) {
  const q = filter.q?.trim().toLowerCase();
  return (await getAllProducts()).filter((p) => {
    if (filter.franchise && p.franchiseSlug !== filter.franchise) return false;
    if (filter.category && p.categorySlug !== filter.category) return false;
    if (filter.onlyNew && !p.isNew) return false;
    if (q && !`${p.name} ${p.shortDescription} ${p.sku}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export async function getFeaturedProducts(limit = 8) {
  return (await getAllProducts()).filter((p) => p.isFeatured).slice(0, limit);
}

export async function getRelatedProducts(product: Product, limit = 4) {
  const all = await getAllProducts();
  const scored = all
    .filter((p) => p.slug !== product.slug)
    .map((p) => ({
      p,
      score: (p.franchiseSlug === product.franchiseSlug ? 2 : 0) + (p.categorySlug === product.categorySlug ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.p);
}

export type PublicSettings = { defaultDescription: string; defaultOgImage: string; twitterHandle: string; sameAs: string[]; googleVerification: string; bingVerification: string };
const EMPTY_SETTINGS: PublicSettings = { defaultDescription: "", defaultOgImage: "", twitterHandle: "", sameAs: [], googleVerification: "", bingVerification: "" };

/** Admin-managed site settings (verification tokens, sameAs profiles, defaults). Cached; busted by the "settings" tag. */
export const getSiteSettings = unstable_cache(
  async (): Promise<PublicSettings> => {
    const db = publicClient();
    if (!db) return EMPTY_SETTINGS;
    const { data } = await db.from("settings").select("value").eq("key", "site").maybeSingle();
    return { ...EMPTY_SETTINGS, ...((data as { value?: Partial<PublicSettings> } | null)?.value ?? {}) };
  },
  ["site-settings-v1"],
  { tags: ["settings"], revalidate: 600 },
);
