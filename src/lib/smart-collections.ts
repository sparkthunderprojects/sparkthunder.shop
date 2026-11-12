import type { Collection, Product } from "@/lib/types";

/**
 * Smart collections fill themselves: a collection with rules holds every published product that matches, now and in future.
 * Rules are kept per collection in one store setting ("smart_collections"), so no database change is needed.
 */
export const FIELDS = ["franchise", "category", "tag", "name", "price_under", "price_over", "in_stock", "is_new", "featured", "on_sale"] as const;
export type RuleField = (typeof FIELDS)[number];
export type Condition = { field: RuleField; value: string };
export type SmartRules = { match: "all" | "any"; conditions: Condition[] };
export type SmartMap = Record<string, SmartRules>;

export const FIELD_LABEL: Record<RuleField, string> = {
  franchise: "Franchise is", category: "Category is", tag: "Has the tag", name: "Name contains", price_under: "Price is under (£)", price_over: "Price is over (£)",
  in_stock: "Is in stock", is_new: "Is marked New", featured: "Is featured", on_sale: "Is on sale (has a compare-at price)",
};
/** Fields that take no value. */
export const FLAG_FIELDS: readonly RuleField[] = ["in_stock", "is_new", "featured", "on_sale"];
export const MAX_CONDITIONS = 8;

type Matchable = Pick<Product, "name" | "franchiseSlug" | "categorySlug" | "pricePence" | "inStock" | "isNew" | "isFeatured"> & { tags?: string[]; comparePricePence?: number | null; slug?: string };

const pounds = (v: string) => { const n = Number(v.replace(/[£,\s]/g, "")); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null; };

export function conditionMatches(p: Matchable, c: Condition): boolean {
  const v = c.value.trim().toLowerCase();
  switch (c.field) {
    case "franchise": return p.franchiseSlug.toLowerCase() === v;
    case "category": return p.categorySlug.toLowerCase() === v;
    case "tag": return (p.tags ?? []).some((t) => t.trim().toLowerCase() === v);
    case "name": return v !== "" && p.name.toLowerCase().includes(v);
    case "price_under": { const n = pounds(v); return n !== null && p.pricePence < n; }
    case "price_over": { const n = pounds(v); return n !== null && p.pricePence > n; }
    case "in_stock": return p.inStock;
    case "is_new": return p.isNew;
    case "featured": return p.isFeatured;
    case "on_sale": return p.comparePricePence != null && p.comparePricePence > p.pricePence;
  }
}

/** A product matches when it meets every condition ("all") or at least one ("any"). Rules with no conditions match nothing. */
export function matchesRules(p: Matchable, rules: SmartRules): boolean {
  if (rules.conditions.length === 0) return false;
  return rules.match === "any" ? rules.conditions.some((c) => conditionMatches(p, c)) : rules.conditions.every((c) => conditionMatches(p, c));
}

/** Clean rules from anything the browser sent; returns null when there are no usable conditions. */
export function normaliseRules(raw: unknown): SmartRules | null {
  const r = raw as Partial<SmartRules> | null | undefined;
  if (!r || !Array.isArray(r.conditions)) return null;
  const conditions: Condition[] = [];
  for (const c of r.conditions.slice(0, MAX_CONDITIONS)) {
    const field = c?.field as RuleField;
    if (!(FIELDS as readonly string[]).includes(field)) continue;
    const value = FLAG_FIELDS.includes(field) ? "" : String(c.value ?? "").trim().slice(0, 80);
    if (!FLAG_FIELDS.includes(field) && !value) continue;
    if ((field === "price_under" || field === "price_over") && pounds(value) === null) continue;
    conditions.push({ field, value });
  }
  return conditions.length ? { match: r.match === "any" ? "any" : "all", conditions } : null;
}

export function normaliseSmartMap(raw: unknown): SmartMap {
  const out: SmartMap = {};
  if (raw && typeof raw === "object") for (const [slug, v] of Object.entries(raw as Record<string, unknown>)) { const n = normaliseRules(v); if (n) out[slug] = n; }
  return out;
}

/** The collections with their product lists filled from rules wherever a collection has some. Others are untouched. */
export function applySmartRules(collections: Collection[], products: Matchable[] & { slug?: string }[], map: SmartMap): Collection[] {
  return collections.map((c) => {
    const rules = map[c.slug];
    return rules ? { ...c, productSlugs: products.filter((p) => matchesRules(p, rules)).map((p) => p.slug!) } : c;
  });
}
