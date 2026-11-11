import { describe, expect, it } from "vitest";
import { normaliseCommerce, normaliseZones, quoteShipping } from "@/lib/commerce-config";

const base = { shippingZones: [], shippingFlatPence: 399, freeShippingPence: 5000, shippingCountries: ["GB"] };
const zones = normaliseZones([
  { name: "UK", countries: ["gb", "GB"], firstItemPence: 399, extraItemPence: 100, freeOverPence: 6000 },
  { name: "Europe", countries: ["IE", "FR", "GB"], firstItemPence: 799, extraItemPence: 250, freeOverPence: null },
  { name: "Empty", countries: ["zzz"], firstItemPence: 1, extraItemPence: 1, freeOverPence: null },
]);

describe("shipping quotes", () => {
  it("keeps the old flat rate when there are no zones", () => {
    expect(quoteShipping(base, "GB", 3, 2000)).toMatchObject({ ok: true, pence: 399 });
    expect(quoteShipping(base, "GB", 3, 5000)).toMatchObject({ ok: true, pence: 0 });
    expect(quoteShipping(base, "FR", 1, 2000).ok).toBe(false);
  });
  it("cleans zones: a country belongs to one zone, bad codes and empty zones are dropped", () => {
    expect(zones.map((z) => [z.name, z.countries])).toEqual([["UK", ["GB"]], ["Europe", ["IE", "FR"]]]);
  });
  it("charges first item plus extra items, per zone", () => {
    expect(quoteShipping({ ...base, shippingZones: zones }, "GB", 1, 2000)).toMatchObject({ ok: true, pence: 399, zone: "UK" });
    expect(quoteShipping({ ...base, shippingZones: zones }, "GB", 3, 2000)).toMatchObject({ pence: 599 });
    expect(quoteShipping({ ...base, shippingZones: zones }, "fr", 2, 2000)).toMatchObject({ pence: 1049, zone: "Europe" });
  });
  it("applies a zone's free-delivery threshold only to that zone", () => {
    expect(quoteShipping({ ...base, shippingZones: zones }, "GB", 2, 6000)).toMatchObject({ pence: 0 });
    expect(quoteShipping({ ...base, shippingZones: zones }, "IE", 2, 60000)).toMatchObject({ pence: 1049 });
  });
  it("refuses a country with no zone", () => {
    expect(quoteShipping({ ...base, shippingZones: zones }, "US", 1, 1000)).toMatchObject({ ok: false });
  });
  it("derives the list of countries the store ships to from its zones", () => {
    expect(normaliseCommerce({ shippingZones: zones, shippingCountries: ["US"] }).shippingCountries).toEqual(["GB", "IE", "FR"]);
  });
});

import { normaliseWeights, weightOf } from "@/lib/commerce-config";
describe("delivery by weight", () => {
  const z = normaliseZones([{ name: "UK", countries: ["GB"], firstItemPence: 0, extraItemPence: 0, freeOverPence: 8000, bands: [{ upToGrams: 2000, pence: 600 }, { upToGrams: 500, pence: 350 }, { upToGrams: 1000, pence: 450 }, { upToGrams: 1000, pence: 999 }, { upToGrams: 0, pence: 1 }], extraPerKgPence: 200 }]);
  const c = { ...base, shippingZones: z };
  it("tidies the bands: sorted, no repeats, no empty ones", () => {
    expect(z[0].bands).toEqual([{ upToGrams: 500, pence: 350 }, { upToGrams: 1000, pence: 450 }, { upToGrams: 2000, pence: 600 }]);
  });
  it("charges the first band the basket fits under", () => {
    expect(quoteShipping(c, "GB", 1, 2000, 300)).toMatchObject({ ok: true, pence: 350 });
    expect(quoteShipping(c, "GB", 1, 2000, 500)).toMatchObject({ pence: 350 });
    expect(quoteShipping(c, "GB", 5, 2000, 501)).toMatchObject({ pence: 450 });
    expect(quoteShipping(c, "GB", 5, 2000, 2000)).toMatchObject({ pence: 600 });
  });
  it("adds per kilogram above the heaviest band, and the heaviest price if no per-kg price", () => {
    expect(quoteShipping(c, "GB", 9, 2000, 2001)).toMatchObject({ pence: 800 });   // one started kg over
    expect(quoteShipping(c, "GB", 9, 2000, 4000)).toMatchObject({ pence: 1000 });  // two kg over
    const flat = normaliseZones([{ name: "UK", countries: ["GB"], firstItemPence: 0, extraItemPence: 0, freeOverPence: null, bands: [{ upToGrams: 1000, pence: 450 }] }]);
    expect(quoteShipping({ ...base, shippingZones: flat }, "GB", 9, 2000, 9000)).toMatchObject({ pence: 450 });
  });
  it("still honours free delivery over a spend, and zones without bands count items as before", () => {
    expect(quoteShipping(c, "GB", 5, 8000, 3000)).toMatchObject({ pence: 0 });
    expect(quoteShipping({ ...base, shippingZones: zones }, "GB", 3, 2000, 99999)).toMatchObject({ pence: 599 });
  });
  it("finds a weight: the product's own, then its category's, then the default", () => {
    const w = normaliseWeights({ defaultGrams: 300, byCategory: { mugs: 450, "bad key!": 5 }, byProduct: { tee: 220, junk: -5 } });
    expect(w).toEqual({ defaultGrams: 300, byCategory: { mugs: 450 }, byProduct: { tee: 220 } });
    expect(weightOf(w, "tee", "apparel")).toBe(220);
    expect(weightOf(w, "big-mug", "mugs")).toBe(450);
    expect(weightOf(w, "poster", "prints")).toBe(300);
    expect(normaliseWeights(undefined).defaultGrams).toBe(300);
  });
  it("is saved with the commerce settings", () => {
    const s = normaliseCommerce({ shippingZones: z, weights: { defaultGrams: 250, byCategory: {}, byProduct: {} } });
    expect(s.weights.defaultGrams).toBe(250); expect(s.shippingZones[0].bands).toHaveLength(3);
  });
});
