import { describe, expect, it } from "vitest";
import { launcherStats, type StatsOrder } from "@/lib/admin/launcher-stats";

const NOW = Date.parse("2026-11-20T12:00:00Z");
const ago = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const o = (n: number, store: string, over: Partial<StatsOrder> = {}): StatsOrder => ({ id: `id${n}`, number: `SPK-${n}`, store_id: store, status: "paid", total_pence: 1000, refunded_card_pence: 0, created_at: ago(1), ...over });
const stores = [{ id: "a", name: "Store A" }, { id: "b", name: "Store B" }];

describe("launcherStats", () => {
  it("keeps each store's numbers separate and counts windows correctly", () => {
    const s = launcherStats(stores, [o(1, "a"), o(2, "a", { created_at: ago(30), total_pence: 2500 }), o(3, "b", { created_at: ago(24 * 9) })], [], NOW);
    expect(s[0]).toMatchObject({ storeId: "a", orders24h: 1, revenue24hPence: 1000, orders7d: 2, revenue7dPence: 3500 });
    expect(s[1]).toMatchObject({ storeId: "b", orders24h: 0, orders7d: 0, revenue7dPence: 0, latest: null });
  });
  it("leaves out cancelled orders and takes refunds off the revenue", () => {
    const s = launcherStats(stores, [o(1, "a", { status: "cancelled" }), o(2, "a", { total_pence: 5000, refunded_card_pence: 1200 })], [], NOW);
    expect(s[0].orders24h).toBe(1);
    expect(s[0].revenue24hPence).toBe(3800);
  });
  it("counts open orders per store regardless of age and reports the newest order", () => {
    const s = launcherStats(stores, [o(1, "a", { created_at: ago(5) }), o(2, "a", { created_at: ago(2) })], [{ store_id: "a", status: "paid" }, { store_id: "a", status: "paid" }, { store_id: "a", status: "attention" }, { store_id: "b", status: "paid" }], NOW);
    expect(s[0]).toMatchObject({ toShip: 2, attention: 1 });
    expect(s[0].latest?.number).toBe("SPK-2");
    expect(s[1]).toMatchObject({ toShip: 1, attention: 0 });
  });
});
