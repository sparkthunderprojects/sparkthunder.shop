import { describe, expect, it } from "vitest";
import { fetchRates, formatMoney, normaliseCurrencies } from "@/lib/currency";
import { normaliseCommerce } from "@/lib/commerce-config";

describe("display currencies", () => {
  it("keeps good currencies and drops bad ones, the store's own and repeats", () => {
    const out = normaliseCurrencies([{ code: "usd", rate: "1.27" }, { code: "USD", rate: 2 }, { code: "GBP", rate: 1 }, { code: "EU", rate: 1 }, { code: "XXQ", rate: 1 }, { code: "EUR", rate: 0 }, { code: "JPY", rate: 190.123456789 }, { code: "CAD", rate: -2 }, null], "GBP");
    expect(out).toEqual([{ code: "USD", rate: 1.27 }, { code: "JPY", rate: 190.123457 }]);
    expect(normaliseCurrencies("nope", "GBP")).toEqual([]);
  });
  it("shows the store's own currency exactly and others as approximate", () => {
    expect(formatMoney(2499, "GBP")).toBe("£24.99");
    expect(formatMoney(2499, "GBP", { code: "GBP", rate: 1 })).toBe("£24.99");
    expect(formatMoney(2499, "GBP", { code: "USD", rate: 1.25 })).toBe("≈US$31.24");
    expect(formatMoney(2499, "GBP", { code: "JPY", rate: 190 })).toMatch(/^≈JP¥4,748$/);
  });
  it("is saved with the commerce settings, cleaned up", () => {
    expect(normaliseCommerce({ currencies: [{ code: "eur", rate: 1.17 }, { code: "gbp", rate: 1 }] }).currencies).toEqual([{ code: "EUR", rate: 1.17 }]);
    expect(normaliseCommerce({}).currencies).toEqual([]);
  });
  it("fetches today's rates and copes with a service that is down or odd", async () => {
    const ok = async (u: string) => { expect(u).toContain("base=GBP"); expect(u).toContain("symbols=USD,EUR"); return { ok: true, json: async () => ({ rates: { USD: 1.3, EUR: 1.17, ZZZ: 9 } }) }; };
    expect(await fetchRates("GBP", ["usd", "EUR", "GBP"], ok)).toEqual({ ok: true, rates: { USD: 1.3, EUR: 1.17 } });
    expect(await fetchRates("GBP", ["USD"], async () => ({ ok: false, json: async () => ({}) }))).toMatchObject({ ok: false });
    expect(await fetchRates("GBP", ["USD"], async () => { throw new Error("offline"); })).toMatchObject({ ok: false });
    expect(await fetchRates("GBP", [])).toMatchObject({ ok: false });
    expect(await fetchRates("GBP", ["USD"], async () => ({ ok: true, json: async () => ({ rates: {} }) }))).toMatchObject({ ok: false });
  });
});
