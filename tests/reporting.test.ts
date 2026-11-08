import { describe, expect, it } from "vitest";
import { overviewByStore, summariseSales, type OrderLite } from "@/lib/admin/reporting";

const NOW = Date.parse("2026-11-08T12:00:00Z");
const day = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
const min = (n: number) => new Date(NOW - n * 60_000).toISOString();
const o = (p: Partial<OrderLite>): OrderLite => ({ status: "paid", total_pence: 1000, discount_pence: 0, email: "a@x.com", items: [{ type: "product", slug: "t", name: "T", sku: "T", unitPence: 1000, qty: 1, image: "" }], created_at: day(1), refunded_card_pence: 0, fulfilled_at: day(1), ...p });

describe("summariseSales", () => {
  it("adds up revenue, orders, units and average order", () => {
    const s = summariseSales([o({ total_pence: 3000 }), o({ total_pence: 1000, email: "b@x.com" })], [], NOW - 30 * 86_400_000, NOW);
    expect(s).toMatchObject({ orders: 2, gross: 4000, revenue: 4000, aov: 2000, units: 2 });
  });
  it("subtracts refunds from the period the order was placed in", () => {
    const s = summariseSales([o({ total_pence: 5000, refunded_card_pence: 2000 }), o({ total_pence: 1000, created_at: day(60), refunded_card_pence: 1000 })], [], NOW - 30 * 86_400_000, NOW);
    expect(s).toMatchObject({ gross: 5000, refunded: 2000, revenue: 3000, orders: 1, aov: 3000 });
  });
  it("leaves cancelled orders out of the count but keeps their refund visible", () => {
    const s = summariseSales([o({ total_pence: 4000, status: "cancelled", refunded_card_pence: 4000 }), o({ total_pence: 1000 })], [], 0, NOW);
    expect(s).toMatchObject({ orders: 1, gross: 5000, refunded: 4000, revenue: 1000 });
  });
  it("measures repeat customers", () => {
    const s = summariseSales([o({ email: "a@x.com" }), o({ email: "A@x.com", created_at: day(40) }), o({ email: "b@x.com" })], [], NOW - 30 * 86_400_000, NOW);
    expect(s.repeatPct).toBe(50);
  });
  it("measures checkout completion, ignoring checkouts still open", () => {
    const snaps = [{ created_at: day(2), fulfilled_at: day(2) }, { created_at: day(2), fulfilled_at: null }, { created_at: day(3), fulfilled_at: null }, { created_at: day(4), fulfilled_at: day(4) }, { created_at: min(10), fulfilled_at: null }];
    const s = summariseSales([], snaps, 0, NOW);
    expect(s).toMatchObject({ started: 4, completed: 2, completionPct: 50 });
  });
  it("says nothing rather than inventing a rate when there are no checkouts", () => {
    expect(summariseSales([], [], 0, NOW).completionPct).toBeNull();
    expect(summariseSales([], [], 0, NOW).aov).toBe(0);
  });
});

describe("overviewByStore", () => {
  it("gives one row per store, busiest first, including quiet stores", () => {
    const rows = overviewByStore(["a", "b", "c"], [{ ...o({ total_pence: 500 }), store_id: "b" }, { ...o({ total_pence: 900 }), store_id: "a" }, { ...o({ total_pence: 900, created_at: day(80) }), store_id: "c" }], 30, NOW);
    expect(rows.map((r) => r.storeId)).toEqual(["a", "b", "c"]);
    expect(rows[2]).toMatchObject({ orders: 0, revenue: 0 });
  });
  it("counts problems per store and keeps stores apart", () => {
    const rows = overviewByStore(["a", "b"], [{ ...o({ status: "attention" }), store_id: "a" }, { ...o({ fulfilled_at: null, created_at: min(30) }), store_id: "a" }, { ...o({}), store_id: "b" }], 30, NOW);
    expect(rows.find((r) => r.storeId === "a")).toMatchObject({ attention: 1, unfinished: 1 });
    expect(rows.find((r) => r.storeId === "b")).toMatchObject({ attention: 0, unfinished: 0 });
  });
});
