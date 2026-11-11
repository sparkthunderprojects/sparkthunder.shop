import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db/clients";

const product = (slug: string, pricePence: number, categorySlug: string) => ({ slug, name: slug, sku: slug, pricePence, franchiseSlug: "k", categorySlug, images: [], inStock: true, trackStock: false, variants: [], stockQty: 0 });
vi.mock("@/lib/catalog", () => ({ getAllProducts: async () => [product("tee", 2000, "apparel"), product("mug", 1000, "mugs"), product("poster", 800, "prints")] }));
vi.mock("@/lib/store", () => ({ getStore: async () => ({ name: "Shop" }) }));
vi.mock("@/lib/commerce", async () => {
  const cfg = await vi.importActual<typeof import("@/lib/commerce-config")>("@/lib/commerce-config");
  const commerce = cfg.normaliseCommerce({
    shippingCountries: ["GB"], freeShippingPence: null,
    shippingZones: [{ name: "UK", countries: ["GB"], firstItemPence: 0, extraItemPence: 0, freeOverPence: null, bands: [{ upToGrams: 500, pence: 350 }, { upToGrams: 1000, pence: 450 }, { upToGrams: 2000, pence: 600 }], extraPerKgPence: 200 }],
    weights: { defaultGrams: 300, byCategory: { mugs: 450 }, byProduct: { tee: 220 } },
  });
  return { ...cfg, getCommerce: async () => commerce };
});

import { createFakeClient } from "@/lib/db/fake";
import { buildPlan } from "@/lib/shop/plan";

describe("checkout prices delivery by weight", () => {
  let db: Db;
  const g = globalThis as unknown as { __sparkFake?: unknown };
  beforeEach(() => { g.__sparkFake = undefined; db = createFakeClient() as unknown as Db; });
  const ship = async (cart: { slug: string; qty: number }[]) => { const r = await buildPlan(db, cart, null); if (!r.ok) throw new Error(r.error); return r.snapshot.shippingPence; };
  it("uses the product's own weight, then the category's, then the default", async () => {
    expect(await ship([{ slug: "tee", qty: 1 }])).toBe(350);                              // 220 g
    expect(await ship([{ slug: "tee", qty: 2 }, { slug: "mug", qty: 1 }])).toBe(450);     // 440 + 450 = 890 g
    expect(await ship([{ slug: "poster", qty: 1 }])).toBe(350);                           // default 300 g
    expect(await ship([{ slug: "mug", qty: 5 }])).toBe(800);                              // 2250 g: 600 + one started kg over at 200
  });
});
