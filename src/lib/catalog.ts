import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { seedCatalog } from "@/data/seed";
import type { Catalog, Category, Franchise, Product } from "@/lib/types";

export const CATALOG_TAG = "catalog";

type FranchiseRow = {
  slug: string; name: string; tagline: string; description: string; accent: string; sort_order: number;
};
type CategoryRow = { slug: string; name: string; description: string; sort_order: number };
type ProductRow = {
  slug: string; sku: string; name: string; franchise_slug: string; category_slug: string;
  price_pence: number; compare_price_pence: number | null; short_description: string;
  description: string; details: string[] | null; images: string[] | null;
  in_stock: boolean; is_new: boolean; is_featured: boolean; created_at: string;
};

async function loadFromSupabase(): Promise<Catalog | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
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
    franchises: (f.data as FranchiseRow[]).map<Franchise>((r) => ({
      slug: r.slug, name: r.name, tagline: r.tagline, description: r.description,
      accent: r.accent, sortOrder: r.sort_order,
    })),
    categories: (c.data as CategoryRow[]).map<Category>((r) => ({
      slug: r.slug, name: r.name, description: r.description, sortOrder: r.sort_order,
    })),
    products: (p.data as ProductRow[]).map<Product>((r) => ({
      slug: r.slug, sku: r.sku, name: r.name, franchiseSlug: r.franchise_slug,
      categorySlug: r.category_slug, pricePence: r.price_pence,
      comparePricePence: r.compare_price_pence ?? undefined,
      shortDescription: r.short_description, description: r.description,
      details: r.details ?? [], images: r.images ?? [], inStock: r.in_stock,
      isNew: r.is_new, isFeatured: r.is_featured, createdAt: r.created_at,
    })),
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
