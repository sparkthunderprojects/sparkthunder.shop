import { describe, expect, it } from "vitest";
import { applySmartRules, matchesRules, normaliseRules, normaliseSmartMap } from "@/lib/smart-collections";
import type { Collection } from "@/lib/types";

const p = (o: Record<string, unknown>) => ({ slug: "a", name: "Mug", franchiseSlug: "knightverge", categorySlug: "drinkware", pricePence: 1500, inStock: true, isNew: false, isFeatured: false, tags: ["gift"], comparePricePence: null, ...o }) as never;

describe("smart collection rules", () => {
  it("matches each kind of rule", () => {
    const m = (field: string, value: string, prod = p({})) => matchesRules(prod, { match: "all", conditions: [{ field: field as never, value }] });
    expect(m("franchise", "knightverge")).toBe(true); expect(m("franchise", "occult-inc")).toBe(false);
    expect(m("category", "drinkware")).toBe(true);
    expect(m("tag", "GIFT")).toBe(true); expect(m("tag", "sale")).toBe(false);
    expect(m("name", "mu")).toBe(true); expect(m("name", "")).toBe(false);
    expect(m("price_under", "20")).toBe(true); expect(m("price_under", "15")).toBe(false);
    expect(m("price_over", "10")).toBe(true); expect(m("price_over", "£15")).toBe(false);
    expect(m("in_stock", "")).toBe(true); expect(m("in_stock", "", p({ inStock: false }))).toBe(false);
    expect(m("is_new", "", p({ isNew: true }))).toBe(true);
    expect(m("featured", "", p({ isFeatured: true }))).toBe(true);
    expect(m("on_sale", "", p({ comparePricePence: 2000 }))).toBe(true); expect(m("on_sale", "")).toBe(false);
  });
  it("all vs any, and empty rules match nothing", () => {
    const conds = [{ field: "franchise" as const, value: "occult-inc" }, { field: "category" as const, value: "drinkware" }];
    expect(matchesRules(p({}), { match: "all", conditions: conds })).toBe(false);
    expect(matchesRules(p({}), { match: "any", conditions: conds })).toBe(true);
    expect(matchesRules(p({}), { match: "all", conditions: [] })).toBe(false);
  });
  it("cleans rules from the browser", () => {
    expect(normaliseRules({ match: "any", conditions: [{ field: "tag", value: "  gift " }, { field: "nope", value: "x" }, { field: "name", value: "" }, { field: "price_under", value: "abc" }, { field: "in_stock", value: "junk" }] }))
      .toEqual({ match: "any", conditions: [{ field: "tag", value: "gift" }, { field: "in_stock", value: "" }] });
    expect(normaliseRules({ conditions: [] })).toBeNull(); expect(normaliseRules(null)).toBeNull();
    expect(normaliseRules({ conditions: Array.from({ length: 20 }, () => ({ field: "in_stock" })) })!.conditions).toHaveLength(8);
    expect(normaliseSmartMap({ a: { conditions: [{ field: "featured" }] }, b: { conditions: [] }, c: 5 })).toEqual({ a: { match: "all", conditions: [{ field: "featured", value: "" }] } });
  });
  it("fills only collections that have rules", () => {
    const cols = [{ slug: "mugs", productSlugs: ["old"] }, { slug: "hand", productSlugs: ["x"] }] as Collection[];
    const out = applySmartRules(cols, [p({ slug: "m1" }), p({ slug: "t1", categorySlug: "apparel" })], { mugs: { match: "all", conditions: [{ field: "category", value: "drinkware" }] } });
    expect(out[0].productSlugs).toEqual(["m1"]); expect(out[1].productSlugs).toEqual(["x"]);
  });
});
