import type { PfyProduct } from "./api";
import type { Product, Variant } from "@/lib/types";
import { HEX } from "@/lib/variants";

export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/** Plain text from Printify's HTML description. */
export const stripHtml = (s: string) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|li|div)>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, "\n\n").trim();

export type ImportChoices = { franchiseSlug: string; categorySlug: string };

/** The unique shop slug for a Printify product: its title plus the start of its id, so two products with the same title never clash and a re-import finds the same one. */
export const slugFor = (p: Pick<PfyProduct, "id" | "title">) => `${slugify(p.title) || "product"}-${p.id.slice(-6).toLowerCase()}`;

/**
 * Turn a Printify product into a shop product. Only options Printify has switched on and can currently print are offered.
 * Print on demand is made to order, so stock is not tracked: if it can be listed, it can be bought.
 * Returns null when nothing is available to sell.
 */
export function mapProduct(p: PfyProduct, choices: ImportChoices, existing?: Product | null): Product | null {
  const usable = p.variants.filter((v) => v.is_enabled && v.is_available !== false);
  if (!usable.length) return null;
  const optionNames = p.options.map((o) => o.name);
  const valueTitle = new Map<number, string>(), colour = new Map<string, string>();
  for (const o of p.options) for (const v of o.values) { valueTitle.set(v.id, v.title); const hex = v.colors?.[0]; if (hex && HEX.test(hex)) colour.set(v.title, hex); }
  const firstImageFor = (variantId: number) => (p.images.find((i) => i.variant_ids.includes(variantId) && i.is_default) ?? p.images.find((i) => i.variant_ids.includes(variantId)))?.src;
  const used = new Set<string>();
  const variants: Variant[] = usable.map((v) => {
    let name = v.options.map((id) => valueTitle.get(id) ?? "").filter(Boolean).join(" / ") || v.title || `Option ${v.id}`;
    if (used.has(name.toLowerCase())) name = `${name} (${v.id})`;
    used.add(name.toLowerCase());
    return { name, sku: v.sku ?? "", stockQty: 0, pricePence: v.price, image: firstImageFor(v.id), externalId: String(v.id) };
  });
  const lowest = Math.min(...usable.map((v) => v.price));
  const ordered = [...p.images].sort((a, b) => Number(!!b.is_default) - Number(!!a.is_default));
  const images = [...new Set(ordered.map((i) => i.src))].slice(0, 12);
  const swatches = Object.fromEntries([...colour].filter(([title]) => variants.some((v) => v.name.split(" / ").includes(title))));
  const text = stripHtml(p.description ?? "");
  const now = new Date().toISOString().slice(0, 10);
  return {
    // A product that has been edited in the admin keeps its own wording, photos order and feature flags; only what Printify controls is refreshed.
    ...(existing ?? {
      slug: slugFor(p), name: p.title, shortDescription: text.split("\n")[0].slice(0, 160), description: text, details: [], images, isNew: true, isFeatured: false, createdAt: now,
      tags: (p.tags ?? []).slice(0, 12), published: p.visible, imageAlts: [],
    }),
    sku: existing?.sku || `PFY-${p.id.slice(-8).toUpperCase()}`,
    franchiseSlug: existing?.franchiseSlug ?? choices.franchiseSlug, categorySlug: existing?.categorySlug ?? choices.categorySlug,
    pricePence: lowest, comparePricePence: undefined, inStock: true, trackStock: false, stockQty: 0, lowStockThreshold: 5,
    variants, optionNames: variants.length > 1 ? optionNames : [], swatches, printifyId: p.id,
  } as Product;
}
