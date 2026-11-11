import { getAllProducts, getCategories, getCollections, getFranchises } from "@/lib/catalog";

/** Every product, franchise, category and collection page that currently exists on this store. */
export async function livePaths(): Promise<Set<string>> {
  const [p, f, c, col] = await Promise.all([getAllProducts(), getFranchises(), getCategories(), getCollections()]);
  return new Set([...p.map((x) => `/products/${x.slug}`), ...f.map((x) => `/franchises/${x.slug}`), ...c.map((x) => `/categories/${x.slug}`), ...col.map((x) => `/collections/${x.slug}`)]);
}
