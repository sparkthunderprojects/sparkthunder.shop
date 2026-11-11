export type ProductRowLike = { slug: string; sku: string; name: string; franchise_slug: string; category_slug: string; price_pence: number; compare_price_pence: number | null; short_description: string; description: string; images: string[] | null; in_stock: boolean; published?: boolean; track_stock?: boolean; stock_qty?: number; variants?: unknown[] | null; tags?: string[] | null; created_at: string; updated_at?: string };

export const publicProduct = (p: ProductRowLike) => ({
  slug: p.slug, sku: p.sku, name: p.name, franchise: p.franchise_slug, category: p.category_slug, price_pence: p.price_pence, compare_price_pence: p.compare_price_pence ?? null,
  short_description: p.short_description, description: p.description, images: p.images ?? [], in_stock: p.in_stock, published: p.published ?? true,
  track_stock: p.track_stock ?? false, stock_qty: p.stock_qty ?? 0, variants: p.variants ?? [], tags: p.tags ?? [], created_at: p.created_at, updated_at: p.updated_at ?? p.created_at,
});

/** Check a product change from the API. Only price, stock and visibility can be changed this way; anything else is refused, not ignored. */
export function applyProductPatch(body: unknown): { ok: true; update: Record<string, unknown> } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Send a JSON object, e.g. {\"stock_qty\": 10}." };
  const b = body as Record<string, unknown>, update: Record<string, unknown> = {};
  for (const k of Object.keys(b)) if (!["price_pence", "stock_qty", "in_stock", "published"].includes(k)) return { ok: false, error: `"${k}" cannot be changed through the API. You can change: price_pence, stock_qty, in_stock, published.` };
  if ("price_pence" in b) { const n = b.price_pence; if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 10_000_000) return { ok: false, error: "price_pence must be a whole number of pence, 0 or more." }; update.price_pence = n; }
  if ("stock_qty" in b) { const n = b.stock_qty; if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 1_000_000) return { ok: false, error: "stock_qty must be a whole number, 0 or more." }; update.stock_qty = n; }
  for (const k of ["in_stock", "published"]) if (k in b) { if (typeof b[k] !== "boolean") return { ok: false, error: `${k} must be true or false.` }; update[k] = b[k]; }
  if (!Object.keys(update).length) return { ok: false, error: "Nothing to change." };
  return { ok: true, update };
}
