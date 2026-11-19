import { describe, expect, it } from "vitest";
import { buildAnalytics, buildOverview, netValue } from "@/lib/analytics";
import type { OrderRow } from "@/lib/shop/fulfil";

let n = 0;
const order = (o: Partial<OrderRow> & { email: string; at: string }): OrderRow => ({
  id: `o${++n}`, number: `SPK-${n}`, name: "N", phone: "", status: "paid", total_pence: 1000, gift_card_pence: 0, discount_pence: 0, discount_code: null,
  shipping_address: { country: "GB" }, items: [{ type: "product", slug: "a", name: "A", sku: "A", unitPence: 1000, qty: 1, image: "" }], created_at: o.at, ...o,
} as unknown as OrderRow);
const now = Date.parse("2026-11-12T12:00:00Z");

describe("analytics", () => {
  it("net value is card plus gift minus refunds", () => {
    expect(netValue(order({ email: "a@x.com", at: "2026-11-01T10:00:00Z", total_pence: 800, gift_card_pence: 200, refunded_card_pence: 300, refunded_gift_pence: 100 }))).toBe(600);
  });
  const orders = [
    order({ email: "a@x.com", at: "2026-09-02T10:00:00Z" }),
    order({ email: "A@x.com", at: "2026-10-05T10:00:00Z", discount_code: "save", discount_pence: 100, shipping_address: { country: "DE" } }),
    order({ email: "b@x.com", at: "2026-10-06T23:00:00Z", status: "cancelled" }),
    order({ email: "c@x.com", at: "2026-11-02T10:00:00Z", total_pence: 0, gift_card_pence: 500 }),
  ];
  const a = buildAnalytics(orders, { since: Date.parse("2026-10-01T00:00:00Z"), nowMs: now, franchiseOf: new Map([["a", "Knightverge"]]) });
  it("ignores cancelled orders and respects the period", () => { expect(a.orders).toBe(2); expect(a.value).toBe(1500); expect(a.aov).toBe(750); });
  it("splits new and returning customers, matching emails case-insensitively", () => { expect(a.newVsReturning.new.orders).toBe(1); expect(a.newVsReturning.returning.orders).toBe(1); });
  it("groups by country, franchise, code and payment", () => {
    expect(a.byCountry.map((c) => c.label).sort()).toEqual(["DE", "GB"]);
    expect(a.byFranchise[0]).toMatchObject({ label: "Knightverge", units: 2, orders: 2 });
    expect(a.codes).toEqual([{ code: "SAVE", orders: 1, discountPence: 100, value: 1000 }]);
    expect(a.payment.find((p) => p.kind === "gift")?.orders).toBe(1);
  });
  it("builds cohorts from first orders", () => {
    const sep = a.cohorts.find((c) => c.month === "2026-09")!;
    expect(sep.size).toBe(1); expect(sep.active.slice(0, 3)).toEqual([1, 1, 0]);
    expect(a.cohorts.find((c) => c.month === "2026-11")!.active).toEqual([1]);
  });
  it("handles no orders", () => { const e = buildAnalytics([], { nowMs: now }); expect(e.orders).toBe(0); expect(e.cohorts).toEqual([]); });
});

describe("overview", () => {
  const list = [
    order({ email: "a@x.com", at: "2026-10-20T10:00:00Z" }),
    order({ email: "a@x.com", at: "2026-11-05T10:00:00Z" }),
    order({ email: "b@x.com", at: "2026-11-06T10:00:00Z", status: "cancelled" }),
  ];
  const ov = buildOverview(list, { since: Date.parse("2026-11-01T00:00:00Z"), until: Date.parse("2026-11-12T00:00:00Z"), compare: true });
  it("totals this period and the one before it", () => {
    expect(ov.now.orders).toBe(1); expect(ov.now.value).toBe(1000); expect(ov.before?.orders).toBe(0);
    expect(ov.now.newCustomers).toBe(0); expect(ov.days).toHaveLength(11); expect(ov.days.find((d) => d.day === "2026-11-05")?.orders).toBe(1);
    expect(ov.products[0].units).toBe(1);
  });
});


import { buildHeatmap } from "@/lib/analytics";
describe("heatmap", () => {
  it("counts orders by weekday (Monday first) and hour", () => {
    const g = buildHeatmap([order({ email: "a@x.com", at: "2026-11-09T14:30:00Z" }), order({ email: "b@x.com", at: "2026-11-15T00:10:00Z" })], 0, Infinity);
    expect(g[0][14]).toBe(1); expect(g[6][0]).toBe(1);
  });
});
