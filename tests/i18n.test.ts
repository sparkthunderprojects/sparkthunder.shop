import { describe, expect, it } from "vitest";
import { localePath, normaliseLanguages, splitLocale } from "../src/lib/i18n/config";
import { dictionary, translate, ENGLISH } from "../src/lib/i18n/dictionaries";

describe("locale paths", () => {
  it("splits the language off the address", () => {
    expect(splitLocale("/fr/products/x")).toEqual({ locale: "fr", path: "/products/x" });
    expect(splitLocale("/de")).toEqual({ locale: "de", path: "/" });
    expect(splitLocale("/products/x")).toEqual({ locale: "en", path: "/products/x" });
    expect(splitLocale("/fraud")).toEqual({ locale: "en", path: "/fraud" });
  });
  it("prefixes internal links only", () => {
    expect(localePath("/shop", "fr")).toBe("/fr/shop");
    expect(localePath("/", "es")).toBe("/es");
    expect(localePath("/shop?x=1#a", "de")).toBe("/de/shop?x=1#a");
    expect(localePath("/shop", "en")).toBe("/shop");
    expect(localePath("/fr/shop", "fr")).toBe("/fr/shop");
    expect(localePath("https://example.com/a", "fr")).toBe("https://example.com/a");
    expect(localePath("#top", "fr")).toBe("#top");
    expect(localePath("mailto:a@b.c", "fr")).toBe("mailto:a@b.c");
    expect(localePath("/admin/orders", "fr")).toBe("/admin/orders");
    expect(localePath("/api/x", "de")).toBe("/api/x");
  });
});

describe("languages setting", () => {
  it("always keeps English and ignores unknown codes", () => {
    expect(normaliseLanguages(null)).toEqual(["en"]);
    expect(normaliseLanguages({ enabled: ["de", "xx", "fr"] })).toEqual(["en", "fr", "de"]);
    expect(normaliseLanguages({ enabled: "fr" })).toEqual(["en"]);
  });
});

describe("dictionaries", () => {
  it("every language has every key (or falls back to English)", () => {
    for (const l of ["fr", "de", "es"] as const) {
      const d = dictionary(l);
      for (const k of Object.keys(ENGLISH)) expect(typeof (d as Record<string, string>)[k]).toBe("string");
    }
  });
  it("translates the keys that matter and fills in values", () => {
    expect(translate(dictionary("fr"), "nav.shopAll", { name: "Knightverge" })).toBe("Tout voir : Knightverge");
    expect(translate(dictionary("en"), "nav.shopAll", { name: "X" })).toBe("Shop all X");
  });
  it("keeps placeholders intact in every language", () => {
    for (const l of ["fr", "de", "es"] as const) for (const k of Object.keys(ENGLISH) as (keyof typeof ENGLISH)[]) {
      const want = (ENGLISH[k].match(/\{\w+\}/g) ?? []).sort().join();
      expect(((dictionary(l)[k]).match(/\{\w+\}/g) ?? []).sort().join(), `${l}:${k}`).toBe(want);
    }
  });
});
