/** Numbers for the Sparkthunder Admin Launcher desktop app: a small per-store snapshot. Pure, so it can be tested without a database. */
export type StatsOrder = { id: string; number: string; store_id: string; status: string; total_pence: number; refunded_card_pence: number | null; created_at: string };
export type OpenOrder = { store_id: string; status: string };
export type StoreStats = {
  storeId: string;
  name: string;
  /** Orders placed in the last 24 hours, not counting cancelled ones. */
  orders24h: number;
  /** Card revenue kept (after refunds) in the last 24 hours, in pence. */
  revenue24hPence: number;
  orders7d: number;
  revenue7dPence: number;
  /** Paid orders still waiting to be shipped, whenever they were placed. */
  toShip: number;
  /** Orders flagged as needing attention, whenever they were placed. */
  attention: number;
  /** The newest order in the last 7 days, if any. */
  latest: { id: string; number: string; totalPence: number; createdAt: string } | null;
};

const DAY = 86_400_000;

export function launcherStats(stores: { id: string; name: string }[], recent: StatsOrder[], open: OpenOrder[], now: number): StoreStats[] {
  return stores.map((s) => {
    const mine = recent.filter((o) => o.store_id === s.id && o.status !== "cancelled");
    const kept = (o: StatsOrder) => Math.max(0, o.total_pence - (o.refunded_card_pence ?? 0));
    const day = mine.filter((o) => now - Date.parse(o.created_at) <= DAY);
    const week = mine.filter((o) => now - Date.parse(o.created_at) <= 7 * DAY);
    const newest = [...week].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
    return {
      storeId: s.id,
      name: s.name,
      orders24h: day.length,
      revenue24hPence: day.reduce((n, o) => n + kept(o), 0),
      orders7d: week.length,
      revenue7dPence: week.reduce((n, o) => n + kept(o), 0),
      toShip: open.filter((o) => o.store_id === s.id && o.status === "paid").length,
      attention: open.filter((o) => o.store_id === s.id && o.status === "attention").length,
      latest: newest ? { id: newest.id, number: newest.number, totalPence: newest.total_pence, createdAt: newest.created_at } : null,
    };
  });
}
