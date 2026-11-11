import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db/clients";
import type { PromotionRow } from "@/lib/promotions";

const product = (slug: string, pricePence: number, franchiseSlug = "knightverge", categorySlug = "apparel") => ({ slug, name: slug, sku: slug, pricePence, franchiseSlug, categorySlug, images: [], inStock: true, trackStock: false, variants: [], stockQty: 0 });
vi.mock("@/lib/catalog", () => ({ getAllProducts: async () => [product("tee", 2000), product("mug", 1000, "knightverge", "mugs"), product("cap", 1500, "occult", "apparel")] }));
vi.mock("@/lib/store", () => ({ getStore: async () => ({ name: "Shop" }) }));
vi.mock("@/lib/commerce", async () => ({ ...(await vi.importActual<object>("@/lib/commerce-config")), getCommerce: async () => ({ ...(await vi.importActual<{ DEFAULT_COMMERCE: object }>("@/lib/commerce-config")).DEFAULT_COMMERCE, shippingFlatPence: 399, freeShippingPence: null, shippingCountries: ["GB"], shippingZones: [] }) }));

import { createFakeClient } from "@/lib/db/fake";
import { bestPromotions, combineOffers, promotionAmount } from "@/lib/promotions";
import { buildPlan } from "@/lib/shop/plan";

const promo = (o: Partial<PromotionRow>): PromotionRow => ({ id: "p", name: "Offer", kind: "percent", value: 10, buy_qty: 0, get_qty: 0, min_spend_pence: 0, franchise_slug: "", category_slug: "", stacks_with_codes: false, active: true, starts_at: null, expires_at: null, ...o });
const L = (unitPence: number, qty: number, franchiseSlug = "k", categorySlug = "a") => ({ franchiseSlug, categorySlug, unitPence, qty });

describe("offer maths", () => {
  it("percent off, with a minimum spend and a category filter", () => {
    expect(promotionAmount(promo({ value: 10 }), [L(2000, 2)])).toBe(400);
    expect(promotionAmount(promo({ value: 10, min_spend_pence: 5000 }), [L(2000, 2)])).toBe(0);
    expect(promotionAmount(promo({ value: 50, category_slug: "mugs" }), [L(2000, 1, "k", "a"), L(1000, 1, "k", "mugs")])).toBe(500);
  });
  it("buy 2 get 1 free takes off the cheapest item in each group of three", () => {
    const b2g1 = promo({ kind: "buy_x_get_y", buy_qty: 2, get_qty: 1, value: 100 });
    expect(promotionAmount(b2g1, [L(2000, 2)])).toBe(0);
    expect(promotionAmount(b2g1, [L(2000, 2), L(1000, 1)])).toBe(1000);
    expect(promotionAmount(b2g1, [L(2000, 3), L(1000, 3)])).toBe(2000 + 1000); // two groups: (20,20,20) free 20; (10,10,10) free 10
    expect(promotionAmount(promo({ kind: "buy_x_get_y", buy_qty: 1, get_qty: 1, value: 50 }), [L(1000, 2)])).toBe(500);
  });
  it("picks the best offer, honours dates and the active flag, and free delivery by spend", () => {
    const now = Date.parse("2026-11-10T12:00:00Z");
    const r = bestPromotions([promo({ id: "a", name: "10%", value: 10 }), promo({ id: "b", name: "20%", value: 20 }), promo({ id: "c", name: "ended", value: 90, expires_at: "2026-11-01T00:00:00Z" }), promo({ id: "d", name: "off", value: 90, active: false }),
      promo({ id: "f", name: "Free delivery over £30", kind: "free_shipping", min_spend_pence: 3000 })], [L(2000, 2)], now);
    expect(r.promo).toMatchObject({ name: "20%", amountPence: 800 });
    expect(r.freeShipping?.name).toBe("Free delivery over £30");
    expect(bestPromotions([promo({ kind: "free_shipping", min_spend_pence: 9000 })], [L(2000, 2)], now).freeShipping).toBeNull();
  });
  it("combines an offer with a code: stack, or the bigger one", () => {
    expect(combineOffers(500, true, 300, 4000)).toEqual({ promoPence: 500, codePence: 300 });
    expect(combineOffers(500, true, 9000, 4000)).toEqual({ promoPence: 500, codePence: 3500 });
    expect(combineOffers(500, false, 300, 4000)).toEqual({ promoPence: 500, codePence: 0 });
    expect(combineOffers(500, false, 800, 4000)).toEqual({ promoPence: 0, codePence: 800 });
    expect(combineOffers(0, false, 800, 4000)).toEqual({ promoPence: 0, codePence: 800 });
  });
});

describe("checkout applies automatic offers", () => {
  let db: Db;
  const g = globalThis as unknown as { __sparkFake?: unknown };
  beforeEach(async () => { g.__sparkFake = undefined; db = createFakeClient() as unknown as Db; });
  const add = (o: Partial<PromotionRow>) => db.from("promotions").insert({ ...promo(o), id: crypto.randomUUID() });

  it("takes the offer off the total, records it, and can waive delivery", async () => {
    await add({ name: "Buy 2 get 1 free", kind: "buy_x_get_y", buy_qty: 2, get_qty: 1, value: 100 });
    await add({ name: "Free delivery", kind: "free_shipping" });
    const r = await buildPlan(db, [{ slug: "tee", qty: 2 }, { slug: "mug", qty: 1 }], null);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.snapshot.promotion).toMatchObject({ name: "Buy 2 get 1 free", appliedPence: 1000 });
    expect(r.snapshot.shippingPence).toBe(0);
    expect(r.snapshot.totalPence).toBe(5000 - 1000);
  });
  it("charges delivery and takes nothing off when no offer applies", async () => {
    await add({ name: "Big spender", value: 10, min_spend_pence: 100000 });
    const r = await buildPlan(db, [{ slug: "tee", qty: 1 }], null);
    expect(r.ok && r.snapshot.promotion).toBeNull();
    expect(r.ok && r.snapshot.totalPence).toBe(2000 + 399);
  });
  it("ignores another store's offers and switched-off offers", async () => {
    await add({ active: false, value: 50 });
    const r = await buildPlan(db, [{ slug: "tee", qty: 1 }], null);
    expect(r.ok && r.snapshot.promotion).toBeNull();
  });
});
