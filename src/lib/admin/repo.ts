import type { Db } from "@/lib/db/clients";
import {
  categoryFromRow, categoryToRow, franchiseFromRow, franchiseToRow, productFromRow, productToRow,
  type CategoryRow, type FranchiseRow, type ProductRow,
} from "@/lib/db/mappers";
import type { Category, Franchise, Product } from "@/lib/types";

export type MediaItem = { id: string; path: string; url: string; alt: string; width: number | null; height: number | null; bytes: number | null; created_at: string };
export type RedirectRow = { id: number; from_path: string; to_path: string; status: number; note: string; created_at: string };

const fail = (what: string, e: { message: string } | null) => { if (e) throw new Error(`${what}: ${e.message}`); };

export async function listProducts(db: Db): Promise<Product[]> {
  const { data, error } = await db.from("products").select("*").order("created_at", { ascending: false });
  fail("Could not load products", error);
  return (data as ProductRow[]).map(productFromRow);
}
export async function getProductRaw(db: Db, slug: string): Promise<Product | null> {
  const { data, error } = await db.from("products").select("*").eq("slug", slug).maybeSingle();
  fail("Could not load the product", error);
  return data ? productFromRow(data as ProductRow) : null;
}
export async function listFranchises(db: Db): Promise<Franchise[]> {
  const { data, error } = await db.from("franchises").select("*").order("sort_order");
  fail("Could not load franchises", error);
  return (data as FranchiseRow[]).map(franchiseFromRow);
}
export async function listCategories(db: Db): Promise<Category[]> {
  const { data, error } = await db.from("categories").select("*").order("sort_order");
  fail("Could not load categories", error);
  return (data as CategoryRow[]).map(categoryFromRow);
}

/** Insert (originalSlug null) or update a product. `inStock` is stored as given; stock tracking overrides it on read. */
export async function writeProduct(db: Db, p: Product, originalSlug: string | null) {
  const row = productToRow(p);
  if (originalSlug === null) {
    const { error } = await db.from("products").insert(row);
    fail("Could not create the product", error);
    // A product deleted earlier leaves a redirect from its address; a new product on the same address must not be hidden behind it.
    await db.from("redirects").delete().eq("from_path", `/products/${p.slug}`);
  } else {
    const { created_at: _keep, ...patch } = row;
    void _keep;
    const { error } = await db.from("products").update(patch).eq("slug", originalSlug);
    fail("Could not save the product", error);
  }
}
export async function writeFranchise(db: Db, f: Franchise, originalSlug: string | null) {
  const row = franchiseToRow(f);
  const { error } = originalSlug === null ? await db.from("franchises").insert(row) : await db.from("franchises").update(row).eq("slug", originalSlug);
  fail("Could not save the franchise", error);
}
export async function writeCategory(db: Db, c: Category, originalSlug: string | null) {
  const row = categoryToRow(c);
  const { error } = originalSlug === null ? await db.from("categories").insert(row) : await db.from("categories").update(row).eq("slug", originalSlug);
  fail("Could not save the category", error);
}

export async function deleteRow(db: Db, table: "products" | "franchises" | "categories", slug: string) {
  const { error } = await db.from(table).delete().eq("slug", slug);
  fail("Could not delete", error);
}
export async function patchProducts(db: Db, slugs: string[], patch: Record<string, unknown>) {
  if (slugs.length === 0) return;
  const { error } = await db.from("products").update(patch).in("slug", slugs);
  fail("Could not update the products", error);
}

// ---- media
export async function listMedia(db: Db): Promise<MediaItem[]> {
  const { data, error } = await db.from("media").select("*").order("created_at", { ascending: false });
  fail("Could not load the media library", error);
  return data as MediaItem[];
}
export async function insertMedia(db: Db, m: Omit<MediaItem, "id" | "created_at">): Promise<MediaItem> {
  const { data, error } = await db.from("media").insert(m).select("*").single();
  fail("Could not record the upload", error);
  return data as MediaItem;
}
export async function updateMediaAlt(db: Db, id: string, alt: string) {
  const { error } = await db.from("media").update({ alt }).eq("id", id);
  fail("Could not save the alt text", error);
}
export async function removeMedia(db: Db, id: string) {
  const { data } = await db.from("media").select("path").eq("id", id).maybeSingle();
  if (data) await db.storage.from("product-images").remove([(data as { path: string }).path]);
  const { error } = await db.from("media").delete().eq("id", id);
  fail("Could not delete the image", error);
}

// ---- redirects
export async function listRedirects(db: Db): Promise<RedirectRow[]> {
  const { data, error } = await db.from("redirects").select("*").order("created_at", { ascending: false });
  fail("Could not load redirects", error);
  return data as RedirectRow[];
}
export async function addRedirect(db: Db, r: { from_path: string; to_path: string; status?: number; note?: string }) {
  // Never leave a redirect pointing back at the page it now lives on, and collapse chains.
  await db.from("redirects").delete().eq("from_path", r.to_path);
  await db.from("redirects").update({ to_path: r.to_path }).eq("to_path", r.from_path);
  const { error } = await db.from("redirects").upsert({ status: 301, note: "", ...r }, { onConflict: "from_path" });
  fail("Could not save the redirect", error);
}
export async function removeRedirect(db: Db, id: number) {
  const { error } = await db.from("redirects").delete().eq("id", id);
  fail("Could not delete the redirect", error);
}

// ---- settings
export type SiteSettings = {
  defaultDescription: string; defaultOgImage: string; twitterHandle: string; sameAs: string[];
  googleVerification: string; bingVerification: string; contactEmail: string;
};
export const DEFAULT_SETTINGS: SiteSettings = { defaultDescription: "", defaultOgImage: "", twitterHandle: "", sameAs: [], googleVerification: "", bingVerification: "", contactEmail: "" };

export async function readSettings(db: Db): Promise<SiteSettings> {
  const { data } = await db.from("settings").select("*").eq("key", "site").maybeSingle();
  return { ...DEFAULT_SETTINGS, ...((data as { value?: Partial<SiteSettings> } | null)?.value ?? {}) };
}
export async function writeSettings(db: Db, value: SiteSettings) {
  const { error } = await db.from("settings").upsert({ key: "site", value }, { onConflict: "key" });
  fail("Could not save the settings", error);
}

export async function counts(db: Db) {
  const [media, redirects, subs] = await Promise.all([
    db.from("media").select("*", { count: "exact", head: true }),
    db.from("redirects").select("*", { count: "exact", head: true }),
    db.from("subscribers").select("*", { count: "exact", head: true }),
  ]);
  return { media: media.count ?? 0, redirects: redirects.count ?? 0, subscribers: subs.count ?? 0 };
}
