import { withBundleStock } from "@/lib/catalog";
import type { Db } from "@/lib/db/clients";
import { productFromRow, type ProductRow } from "@/lib/db/mappers";
import { backInStockEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { ORIGIN_TOKEN } from "@/lib/site";
import type { Product } from "@/lib/types";

export type AlertRow = { id: string; product_slug: string; variant: string; email: string; created_at: string; notified_at: string | null };

/** Is this product (or this one option of it) available to buy right now? */
export function isAvailable(p: Product, variant: string): boolean {
  if (!p.inStock) return false;
  if (!variant) return true;
  const v = (p.variants ?? []).find((x) => x.name === variant);
  if (!v) return false;
  return !p.trackStock || v.stockQty > 0;
}

/**
 * Email everyone who asked to be told about something that is available again, then mark them notified.
 * Safe to run any time (after a stock edit, or from the admin button): it only sends to people whose item is
 * in stock right now, and a failed email stays pending so it is retried next time.
 */
export async function notifyBackInStock(db: Db): Promise<{ sent: number; failed: number; firstError?: string }> {
  const { data: alertData } = await db.from("stock_alerts").select("*");
  const pending = ((alertData ?? []) as AlertRow[]).filter((a) => !a.notified_at);
  if (!pending.length) return { sent: 0, failed: 0 };
  const slugs = [...new Set(pending.map((a) => a.product_slug))];
  const { data: prodData } = await db.from("products").select("*");
  const all = withBundleStock(((prodData ?? []) as ProductRow[]).map(productFromRow));
  const by = new Map(all.map((p) => [p.slug, p]));
  let sent = 0, failed = 0, firstError: string | undefined;
  for (const slug of slugs) {
    const p = by.get(slug);
    if (!p || p.published === false) continue;
    for (const a of pending.filter((x) => x.product_slug === slug)) {
      if (!isAvailable(p, a.variant)) continue;
      const res = await sendEmail({ to: a.email, ...backInStockEmail({ name: p.name, variant: a.variant, url: `${ORIGIN_TOKEN}/products/${p.slug}?utm_source=back-in-stock&utm_medium=email` }) });
      if (res.ok) { sent++; await db.from("stock_alerts").update({ notified_at: new Date().toISOString() }).eq("id", a.id); }
      else { failed++; firstError ??= res.error; }
    }
  }
  return { sent, failed, firstError };
}
