import { describe, expect, it } from "vitest";
import type { OrderRow } from "@/lib/shop/fulfil";
import { filterOrders, orderValue, paymentKind } from "@/lib/orders-filter";

let n = 0;
const o = (x: Partial<OrderRow>): OrderRow => ({
  id: `id${++n}`, number: `SPK-${n}`, stripe_session_id: null, stripe_payment_intent: `pi_${n}`, status: "paid", email: `c${n}@x.com`, name: `Customer ${n}`, phone: "", shipping_address: { country: "GB", postal_code: "N1 1AA", city: "London" },
  items: [{ type: "product", slug: "tee", name: "Crest Tee", sku: "T1", unitPence: 2000, qty: 1, image: "" }], subtotal_pence: 2000, shipping_pence: 0, gift_card_pence: 0, total_pence: 2000, gift_card_code: "",
  tracking_carrier: "", tracking_number: "", notes: "", attention_reason: "", shipped_at: null, created_at: "2026-11-10T12:00:00Z", ...x,
}) as OrderRow;
const nums = (l: OrderRow[]) => l.map((x) => x.number);

describe("order search and filters", () => {
  const a = o({ number: "SPK-100", name: "Ada Lovelace", email: "ada@x.com", created_at: "2026-11-01T10:00:00Z" });
  const b = o({ number: "SPK-101", status: "shipped", tracking_number: "RM123", discount_code: "SAVE10", created_at: "2026-11-05T10:00:00Z", shipping_address: { country: "IE", postal_code: "D02" } });
  const c = o({ number: "SPK-102", status: "cancelled", total_pence: 0, gift_card_pence: 3000, created_at: "2026-11-09T10:00:00Z" });
  const d = o({ number: "SPK-103", status: "paid", items: [{ type: "gift", name: "Gift card", unitPence: 2500, qty: 1, gift: { recipientName: "", recipientEmail: "", senderName: "", message: "", theme: "" } }], created_at: "2026-11-11T10:00:00Z" });
  const all = [a, b, c, d];
  it("searches order number, name, email, tracking, code, postcode and item name, ignoring case", () => {
    expect(nums(filterOrders(all, { q: "ada" }))).toEqual(["SPK-100"]);
    expect(nums(filterOrders(all, { q: "spk-101" }))).toEqual(["SPK-101"]);
    expect(nums(filterOrders(all, { q: "rm123" }))).toEqual(["SPK-101"]);
    expect(nums(filterOrders(all, { q: "save10" }))).toEqual(["SPK-101"]);
    expect(nums(filterOrders(all, { q: "d02" }))).toEqual(["SPK-101"]);
    expect(nums(filterOrders(all, { q: "crest tee" }))).toEqual(["SPK-102", "SPK-101", "SPK-100"]);
  });
  it("filters by status, with 'waiting to ship' meaning paid orders that contain something to post", () => {
    expect(nums(filterOrders(all, { status: "shipped" }))).toEqual(["SPK-101"]);
    expect(nums(filterOrders(all, { status: "toship" }))).toEqual(["SPK-100"]);
    expect(nums(filterOrders(all, { status: "bogus" }))).toHaveLength(4);
  });
  it("filters by payment type, code use and country", () => {
    expect(paymentKind(c)).toBe("gift"); expect(paymentKind(a)).toBe("card"); expect(paymentKind(o({ total_pence: 500, gift_card_pence: 500 }))).toBe("mixed"); expect(paymentKind(o({ total_pence: 0 }))).toBe("free");
    expect(nums(filterOrders(all, { payment: "gift" }))).toEqual(["SPK-102"]);
    expect(nums(filterOrders(all, { discount: "1" }))).toEqual(["SPK-101"]);
    expect(nums(filterOrders(all, { country: "ie" }))).toEqual(["SPK-101"]);
  });
  it("filters by date range, including the whole of the last day", () => {
    expect(nums(filterOrders(all, { from: "2026-11-05", to: "2026-11-09" }))).toEqual(["SPK-102", "SPK-101"]);
    expect(nums(filterOrders(all, { from: "nonsense" }))).toHaveLength(4);
  });
  it("sorts newest, oldest or highest value (card plus gift card)", () => {
    expect(nums(filterOrders(all, {}))[0]).toBe("SPK-103");
    expect(nums(filterOrders(all, { sort: "oldest" }))[0]).toBe("SPK-100");
    expect(orderValue(c)).toBe(3000);
    expect(nums(filterOrders(all, { sort: "highest" }))[0]).toBe("SPK-102");
  });
});
