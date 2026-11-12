import { describe, expect, it } from "vitest";
import { buildCustomers, cleanTags, customerId, inSegment, matchesSearch, type OrderForCustomer } from "@/lib/customers";

const NOW = Date.parse("2026-11-12T12:00:00Z"), D = 86_400_000;
const ago = (d: number) => new Date(NOW - d * D).toISOString();
const order = (o: Partial<OrderForCustomer>): OrderForCustomer => ({ id: crypto.randomUUID(), number: "SPK-1", email: "a@x.com", name: "Ada", phone: "", shipping_address: null, status: "shipped", total_pence: 5000, created_at: ago(10), ...o });
const build = (o: Partial<Parameters<typeof buildCustomers>[0]>) => buildCustomers({ orders: [], subscribers: [], points: [], returns: [], reviews: [], notes: [], ...o });

describe("building the customer list", () => {
  it("joins orders by email regardless of case, and sums spend, orders and average", () => {
    const [c] = build({ orders: [order({ total_pence: 3000, created_at: ago(40) }), order({ email: "A@X.com", total_pence: 5000, created_at: ago(5) })] });
    expect(c.orders).toBe(2); expect(c.spendPence).toBe(8000); expect(c.aovPence).toBe(4000);
    expect(c.firstOrderAt).toBe(ago(40)); expect(c.lastOrderAt).toBe(ago(5));
  });
  it("takes refunds off spend, and leaves cancelled orders out of the counts but still lists them", () => {
    const [c] = build({ orders: [order({ total_pence: 5000, refunded_card_pence: 1500, refunded_gift_pence: 500 }), order({ status: "cancelled", total_pence: 9000 })] });
    expect(c.spendPence).toBe(3000); expect(c.orders).toBe(1); expect(c.orderList).toHaveLength(2);
  });
  it("uses the latest order's name, phone and address", () => {
    const [c] = build({ orders: [order({ name: "Old", created_at: ago(30), phone: "1" }), order({ name: "New", created_at: ago(2), phone: "2", shipping_address: { country: "IE" } })] });
    expect(c.name).toBe("New"); expect(c.phone).toBe("2"); expect(c.address?.country).toBe("IE");
  });
  it("includes people who only subscribed, reviewed or returned, with points and the owner's notes", () => {
    const list = build({ subscribers: ["fan@x.com"], reviews: ["r@x.com"], returns: ["r@x.com"], points: [{ email: "fan@x.com", points: 30 }, { email: "fan@x.com", points: -10 }], notes: [{ email: "fan@x.com", tags: ["vip"], notes: "Loves tees" }] });
    const fan = list.find((c) => c.email === "fan@x.com")!, r = list.find((c) => c.email === "r@x.com")!;
    expect(fan.subscribed).toBe(true); expect(fan.points).toBe(20); expect(fan.tags).toEqual(["vip"]); expect(fan.notes).toBe("Loves tees");
    expect(r.reviews).toBe(1); expect(r.returns).toBe(1); expect(fan.orders).toBe(0);
  });
  it("ignores notes for people who are not customers", () => { expect(build({ notes: [{ email: "ghost@x.com", tags: ["x"], notes: "" }] })).toHaveLength(0); });
});

describe("groups", () => {
  const c = (o: Partial<OrderForCustomer>[], extra: Partial<Parameters<typeof buildCustomers>[0]> = {}) => build({ orders: o.map((x) => order(x)), ...extra })[0];
  it("repeat, big spenders, new, lapsed, never ordered and subscribers", () => {
    expect(inSegment(c([{}, { created_at: ago(3) }]), "repeat", NOW)).toBe(true);
    expect(inSegment(c([{ total_pence: 12000 }]), "big", NOW)).toBe(true);
    expect(inSegment(c([{ total_pence: 9000 }]), "big", NOW)).toBe(false);
    expect(inSegment(c([{ created_at: ago(5) }]), "new", NOW)).toBe(true);
    expect(inSegment(c([{ created_at: ago(5) }, { created_at: ago(200) }]), "new", NOW)).toBe(false);
    expect(inSegment(c([{ created_at: ago(120) }]), "lapsed", NOW)).toBe(true);
    expect(inSegment(c([{ created_at: ago(20) }]), "lapsed", NOW)).toBe(false);
    expect(inSegment(c([], { subscribers: ["a@x.com"] }), "never", NOW)).toBe(true);
    expect(inSegment(c([], { subscribers: ["a@x.com"] }), "subscribed", NOW)).toBe(true);
    expect(inSegment(c([{ status: "cancelled" }]), "lapsed", NOW)).toBe(false);
  });
});

describe("search, tags and ids", () => {
  it("finds by name, email, phone, tag or order number", () => {
    const x = build({ orders: [order({ number: "SPK-77", phone: "07123" })], notes: [{ email: "a@x.com", tags: ["vip"], notes: "" }] })[0];
    for (const q of ["ada", "A@X", "07123", "vip", "spk-77"]) expect(matchesSearch(x, q)).toBe(true);
    expect(matchesSearch(x, "zzz")).toBe(false);
  });
  it("cleans tags", () => { expect(cleanTags(" VIP, press kit,vip,, ")).toEqual(["vip", "press-kit"]); });
  it("ids are stable, case-insensitive and do not contain the address", () => {
    expect(customerId("A@x.com")).toBe(customerId(" a@X.com ")); expect(customerId("a@x.com")).toHaveLength(16); expect(customerId("a@x.com")).not.toContain("x.com");
  });
});
