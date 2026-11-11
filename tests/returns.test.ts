import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/clients";
import { createFakeClient } from "@/lib/db/fake";
import { createReturn, returnEligibility } from "@/lib/returns";
import type { OrderRow } from "@/lib/shop/fulfil";

const g = globalThis as unknown as { __sparkFake?: unknown };
let db: Db;
const day = 86400_000;
const order = (o: Partial<OrderRow> = {}) => ({ id: "o1", number: "SPK-1", status: "shipped", email: "b@x.com", name: "Buyer", shipped_at: new Date(Date.now() - 3 * day).toISOString(), created_at: new Date(Date.now() - 6 * day).toISOString(),
  items: [{ type: "product", slug: "tee", name: "Tee (M)", sku: "T", unitPence: 2000, qty: 2, image: "" }, { type: "gift", name: "Gift card", unitPence: 1000, qty: 1, gift: {} }], ...o }) as unknown as OrderRow;

beforeEach(() => { g.__sparkFake = undefined; db = createFakeClient() as unknown as Db; });

describe("return eligibility", () => {
  it("only shipped orders inside the window, with products", () => {
    expect(returnEligibility(order(), 0).ok).toBe(true);
    expect(returnEligibility(order({ status: "paid" }), 0).ok).toBe(false);
    expect(returnEligibility(order({ status: "cancelled" }), 0).ok).toBe(false);
    expect(returnEligibility(order({ shipped_at: new Date(Date.now() - 45 * day).toISOString() }), 0).ok).toBe(false);
    expect(returnEligibility(order({ items: [{ type: "gift" } as never] }), 0).ok).toBe(false);
    expect(returnEligibility(order(), 1).ok).toBe(false);
  });
});

describe("createReturn", () => {
  it("records a request, capping quantities and ignoring gift cards and unknown lines", async () => {
    const r = await createReturn(db, order(), { items: [{ line: 0, qty: 5 }, { line: 1, qty: 1 }, { line: 9, qty: 1 }], reason: "Wrong size or fit", details: " too small " });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.row.items).toEqual([{ line: 0, name: "Tee (M)", qty: 2 }]);
    expect(r.row).toMatchObject({ status: "requested", order_number: "SPK-1", details: "too small" });
  });
  it("needs a real reason and at least one item", async () => {
    expect((await createReturn(db, order(), { items: [{ line: 0, qty: 1 }], reason: "because", details: "" })).ok).toBe(false);
    expect((await createReturn(db, order(), { items: [{ line: 0, qty: 0 }], reason: "Other", details: "" })).ok).toBe(false);
  });
  it("allows one open request per order, and a new one after it is closed", async () => {
    const first = await createReturn(db, order(), { items: [{ line: 0, qty: 1 }], reason: "Other", details: "" });
    expect(first.ok).toBe(true);
    expect((await createReturn(db, order(), { items: [{ line: 0, qty: 1 }], reason: "Other", details: "" })).ok).toBe(false);
    if (first.ok) await db.from("return_requests").update({ status: "rejected" }).eq("id", first.row.id);
    expect((await createReturn(db, order(), { items: [{ line: 0, qty: 1 }], reason: "Other", details: "" })).ok).toBe(true);
  });
});
