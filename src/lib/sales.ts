import { unstable_cache } from "next/cache";
import { serviceClient } from "@/lib/db/clients";
import { currentStoreId } from "@/lib/db/stores";
import type { OrderRow } from "@/lib/shop/fulfil";
import type { Product } from "@/lib/types";

export type SalesStats = {
  /** Units sold per product over the last 90 days. */
  units: Record<string, number>;
  /** For each product, the other products most often in the same order (best first). */
  together: Record<string, string[]>;
};

const EMPTY: SalesStats = { units: {}, together: {} };
export const BEST_SELLER_COUNT = 3;
export const BEST_SELLER_MIN_UNITS = 3;

/** Real sales, read with the server key (orders are private) and cached for an hour. Nothing here is invented: no sales, no badge. */
export const getSalesStats = async (): Promise<SalesStats> => getSalesStatsFor(await currentStoreId());
const getSalesStatsFor = (storeId: string) => unstable_cache(
  async (): Promise<SalesStats> => {
    const db = serviceClient(storeId);
    if (!db) return EMPTY;
    const { data, error } = await db.from("orders").select("*");
    if (error || !data) return EMPTY;
    const since = Date.now() - 90 * 86400000;
    const units: Record<string, number> = {};
    const pairs: Record<string, Record<string, number>> = {};
    for (const o of data as OrderRow[]) {
      if (o.status === "cancelled" || new Date(o.created_at).getTime() < since) continue;
      const slugs = [...new Set(o.items.filter((l) => l.type === "product").map((l) => (l as { slug: string }).slug))];
      for (const l of o.items) if (l.type === "product") units[l.slug] = (units[l.slug] ?? 0) + l.qty;
      for (const a of slugs) for (const b of slugs) if (a !== b) { (pairs[a] ??= {})[b] = (pairs[a][b] ?? 0) + 1; }
    }
    const together: Record<string, string[]> = {};
    for (const [a, m] of Object.entries(pairs)) together[a] = Object.entries(m).sort((x, y) => y[1] - x[1]).map(([s]) => s).slice(0, 6);
    return { units, together };
  },
  ["sales-stats-v2", storeId],
  { tags: ["catalog", "sales"], revalidate: 3600 },
)();

export function withBestSellers(products: Product[], stats: SalesStats): Product[] {
  const top = new Set(
    Object.entries(stats.units).filter(([, n]) => n >= BEST_SELLER_MIN_UNITS).sort((a, b) => b[1] - a[1]).slice(0, BEST_SELLER_COUNT).map(([s]) => s),
  );
  return top.size ? products.map((p) => (top.has(p.slug) ? { ...p, bestSeller: true } : p)) : products;
}
