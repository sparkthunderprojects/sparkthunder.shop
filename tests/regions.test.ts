import { describe, expect, it } from "vitest";
import { countryName, currenciesForCountries, currencyFor, currencySymbol } from "@/lib/regions";
describe("regions", () => {
  it("pairs countries with currencies", () => {
    expect(currencyFor("ie")).toBe("EUR"); expect(currencyFor("US")).toBe("USD"); expect(currencyFor("ZZ")).toBeNull();
  });
  it("names countries and symbols", () => {
    expect(countryName("GB")).toBe("United Kingdom"); expect(currencySymbol("EUR")).toBe("€"); expect(currencySymbol("USD")).toBe("$");
  });
  it("lists each needed currency once, leaving out the store's own", () => {
    expect(currenciesForCountries(["GB", "IE", "FR", "DE", "US", "ZZ"], "GBP")).toEqual(["EUR", "USD"]);
  });
});
