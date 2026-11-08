import type { OrderRow } from "@/lib/shop/fulfil";

export type SnapshotLite = { created_at: string; fulfilled_at: string | null };
export type OrderLite = Pick<OrderRow, "status" | "total_pence" | "discount_pence" | "email" | "items" | "created_at" | "refunded_card_pence" | "fulfilled_at">;

export type SalesSummary = {
  orders: number; units: number;
  /** Card money taken, before refunds. */
  gross: number; refunded: number;
  /** Card money kept: gross minus refunds. */
  revenue: number;
  aov: number; discounts: number;
  repeatPct: number;
  started: number; completed: number;
  /** Share of started checkouts that were paid. Null when there is nothing to measure yet. */
  completionPct: number | null;
};

const COUNT_AFTER = 40 * 60_000; // a checkout older than this that was never paid is abandoned (its stock hold has ended)

/**
 * Sales figures for the orders created on or after `since`. Cancelled orders (fully refunded before shipping) are left out of
 * the order count but their refunds are not hidden: refunds are subtracted from the period the ORDER was placed in.
 * Checkout completion compares checkouts started (a basket sent to Stripe) with those that were paid; checkouts still open
 * (younger than 40 minutes) are not counted either way.
 */
export function summariseSales(allOrders: OrderLite[], snapshots: SnapshotLite[], since: number, now = Date.now()): SalesSummary {
  const live = allOrders.filter((o) => o.status !== "cancelled");
  const orders = live.filter((o) => Date.parse(o.created_at) >= since);
  const inPeriod = allOrders.filter((o) => Date.parse(o.created_at) >= since);
  const gross = inPeriod.reduce((n, o) => n + o.total_pence, 0);
  const refunded = inPeriod.reduce((n, o) => n + (o.refunded_card_pence ?? 0), 0);
  const revenue = gross - refunded;
  const counted = new Map<string, number>();
  for (const o of live) counted.set(o.email.toLowerCase(), (counted.get(o.email.toLowerCase()) ?? 0) + 1);
  const buyers = new Set(orders.map((o) => o.email.toLowerCase()));
  let repeat = 0; for (const b of buyers) if ((counted.get(b) ?? 0) > 1) repeat++;
  const snaps = snapshots.filter((s) => Date.parse(s.created_at) >= since && (s.fulfilled_at || now - Date.parse(s.created_at) > COUNT_AFTER));
  const completed = snaps.filter((s) => s.fulfilled_at).length;
  return {
    orders: orders.length,
    units: orders.reduce((n, o) => n + o.items.reduce((m, l) => m + l.qty, 0), 0),
    gross, refunded, revenue,
    aov: orders.length ? Math.round(revenue / orders.length) : 0,
    discounts: orders.reduce((n, o) => n + (o.discount_pence ?? 0), 0),
    repeatPct: buyers.size ? Math.round((repeat / buyers.size) * 100) : 0,
    started: snaps.length, completed,
    completionPct: snaps.length ? Math.round((completed / snaps.length) * 100) : null,
  };
}

export type StoreOverview = { storeId: string; orders: number; revenue: number; refunded: number; attention: number; unfinished: number };

/** One row per store for the owner's all-stores view (last `days` days), busiest first. Stores with no orders still appear. */
export function overviewByStore(storeIds: string[], orders: (OrderLite & { store_id: string })[], days: number, now = Date.now()): StoreOverview[] {
  const since = now - days * 86_400_000;
  const rows = storeIds.map((storeId): StoreOverview => {
    const mine = orders.filter((o) => o.store_id === storeId);
    const recent = mine.filter((o) => Date.parse(o.created_at) >= since);
    const refunded = recent.reduce((n, o) => n + (o.refunded_card_pence ?? 0), 0);
    return {
      storeId,
      orders: recent.filter((o) => o.status !== "cancelled").length,
      revenue: recent.reduce((n, o) => n + o.total_pence, 0) - refunded,
      refunded,
      attention: mine.filter((o) => o.status === "attention").length,
      unfinished: mine.filter((o) => !o.fulfilled_at && now - Date.parse(o.created_at) > 3 * 60_000).length,
    };
  });
  return rows.sort((a, b) => b.revenue - a.revenue || a.storeId.localeCompare(b.storeId));
}
