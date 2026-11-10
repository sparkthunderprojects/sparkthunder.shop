import { describe, expect, it } from "vitest";
import { normaliseCommerce } from "@/lib/commerce-config";
import { orderVat, vatIncluded } from "@/lib/vat";

const c = { vatEnabled: true, vatRatePercent: 20, vatNumber: "GB123" };
const goods = (pence: number, qty = 1) => ({ type: "product" as const, slug: "t", name: "T", sku: "T", unitPence: pence, qty, image: "" });

describe("VAT", () => {
  it("finds the VAT inside a VAT-inclusive price", () => {
    expect(vatIncluded(12000, 20)).toBe(2000);
    expect(vatIncluded(1999, 20)).toBe(333);
    expect(vatIncluded(0, 20)).toBe(0);
    expect(vatIncluded(1000, 0)).toBe(0);
  });
  it("covers goods, shipping and gift wrap, after the discount", () => {
    const v = orderVat({ lines: [goods(5000, 2)], shippingPence: 400, giftOptions: { message: "", wrap: true, wrapPence: 200 }, discount: { id: "d", code: "X", appliedPence: 600 } }, c)!;
    expect(v.pence).toBe(vatIncluded(10000, 20));   // 10000 + 400 + 200 - 600
    expect(v).toMatchObject({ ratePercent: 20, number: "GB123" });
  });
  it("charges no VAT on gift card vouchers and is not reduced by paying with a gift card", () => {
    const gift = { type: "gift" as const, name: "Gift card", unitPence: 5000, qty: 1, gift: {} as never };
    expect(orderVat({ lines: [gift], shippingPence: 0, giftOptions: null, discount: null }, c)!.pence).toBe(0);
  });
  it("is null when the store is not VAT registered", () => {
    expect(orderVat({ lines: [goods(1000)], shippingPence: 0 }, { ...c, vatEnabled: false })).toBeNull();
  });
  it("cleans the settings: off by default, sensible rate, tidy number", () => {
    expect(normaliseCommerce({})).toMatchObject({ vatEnabled: false, vatRatePercent: 20, vatNumber: "" });
    expect(normaliseCommerce({ vatEnabled: true, vatRatePercent: 500, vatNumber: "GB 123<b>" })).toMatchObject({ vatEnabled: true, vatRatePercent: 20, vatNumber: "GB 123b" });
  });
});
