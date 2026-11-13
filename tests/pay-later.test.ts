import { describe, expect, it } from "vitest";
import { enabledMethods, isPayMethod, normalisePayLater, PAY_INFO, PAY_METHODS, splitInstalments } from "../src/lib/pay-later";
import { normaliseCommerce } from "../src/lib/commerce-config";

describe("pay later settings", () => {
  it("is off unless switched on with true", () => {
    expect(normalisePayLater(undefined)).toEqual({ paypal: false, klarna: false, clearpay: false });
    expect(normalisePayLater({ klarna: true, paypal: "yes", clearpay: 1 })).toEqual({ paypal: false, klarna: true, clearpay: false });
    expect(enabledMethods(normalisePayLater({ clearpay: true, paypal: true }))).toEqual(["paypal", "clearpay"]);
  });
  it("is part of the commerce settings and survives a save", () => {
    expect(normaliseCommerce({}).payLater.klarna).toBe(false);
    expect(normaliseCommerce({ payLater: { paypal: false, klarna: true, clearpay: false } }).payLater.klarna).toBe(true);
  });
  it("only accepts the three methods", () => { expect(isPayMethod("klarna")).toBe(true); expect(isPayMethod("afterpay")).toBe(false); });
  it("has content for each method, with a schedule for every instalment", () => {
    for (const m of PAY_METHODS) { const i = PAY_INFO[m]; expect(i.schedule).toHaveLength(i.parts); expect(i.steps.length).toBeGreaterThanOrEqual(3); expect(i.faq.length).toBeGreaterThanOrEqual(3); }
  });
  it("does not describe Klarna UK as split into 4", () => { expect(JSON.stringify(PAY_INFO.klarna)).not.toMatch(/pay in 4|split into 4|4 interest-free/i); });
});

describe("splitInstalments", () => {
  it("splits evenly and puts odd pennies on the first payment", () => {
    expect(splitInstalments(6000, 4)).toEqual([1500, 1500, 1500, 1500]);
    expect(splitInstalments(1000, 3)).toEqual([334, 333, 333]);
    expect(splitInstalments(1000, 3).reduce((a, b) => a + b, 0)).toBe(1000);
  });
  it("copes with silly input", () => { expect(splitInstalments(-5, 3)).toEqual([0, 0, 0]); expect(splitInstalments(100, 0)).toEqual([100]); });
});
