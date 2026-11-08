import type { Db } from "@/lib/db/clients";
import type { Snapshot } from "./types";

/** How long a checkout holds its items. Stripe's payment page is set to expire a little sooner, so a held item can never be paid for after its hold ends. */
export const HOLD_MINUTES = 35;
export const STRIPE_SESSION_MINUTES = 32;

export type StockItem = { key: string; slug: string; variant: string; qty: number; label: string };

/** What a basket takes off stock: each product line, with bundles expanded into the products inside them. */
export async function stockItems(db: Db, lines: Snapshot["lines"]): Promise<StockItem[]> {
  const out: StockItem[] = [];
  for (const [li, line] of lines.entries()) {
    if (line.type !== "product") continue;
    const { data } = await db.from("products").select("bundle_items").eq("slug", line.slug).maybeSingle();
    const items = (data as { bundle_items: { slug: string; qty: number }[] | null } | null)?.bundle_items ?? [];
    if (items.length) for (const it of items) out.push({ key: `${li}:${it.slug}:`, slug: it.slug, variant: "", qty: it.qty * line.qty, label: `${line.name} (contains ${it.slug})` });
    else out.push({ key: `${li}:${line.slug}:${line.variant ?? ""}`, slug: line.slug, variant: line.variant ?? "", qty: line.qty, label: line.name });
  }
  return out;
}

export type HoldResult = { ok: true } | { ok: false; message: string };

/** Hold the basket's tracked stock for one checkout. All or nothing. */
export async function holdStock(db: Db, storeId: string, key: string, items: StockItem[]): Promise<HoldResult> {
  if (!items.length) return { ok: true };
  const { data, error } = await db.rpc("reserve_stock", { p_store: storeId, p_key: key, p_items: items.map((i) => ({ slug: i.slug, variant: i.variant, qty: i.qty })), p_minutes: HOLD_MINUTES });
  if (error) throw new Error(`Could not hold stock: ${error.message}. Run the latest supabase/admin.sql.`);
  const r = data as { ok: boolean; short?: { slug: string; variant: string; wanted: number; available: number }[] };
  if (r.ok) return { ok: true };
  const parts = (r.short ?? []).map((s) => {
    const name = items.find((i) => i.slug === s.slug && i.variant === s.variant)?.label ?? s.slug;
    return s.available > 0 ? `${name}: only ${s.available} left` : `${name}: none left right now`;
  });
  return { ok: false, message: `Sorry, we can not hold everything in your basket. ${parts.join("; ")}. Other shoppers may be checking out with the last ones, so it is worth trying again in a few minutes.` };
}

/** Give a checkout's stock back. Safe to call any number of times, and never throws. */
export async function releaseStock(db: Db, storeId: string, key: string | undefined) {
  if (!key) return;
  try { await db.rpc("release_stock", { p_store: storeId, p_key: key }); } catch { /* the hold expires by itself */ }
}
