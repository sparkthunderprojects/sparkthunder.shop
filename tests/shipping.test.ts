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
