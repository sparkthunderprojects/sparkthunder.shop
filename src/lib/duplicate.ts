import type { Product } from "@/lib/types";

/** A slug and SKU not yet taken: "mug" becomes "mug-copy", then "mug-copy-2", and so on. */
export function freshIdentity(slug: string, sku: string, taken: { slugs: Iterable<string>; skus: Iterable<string> }): { slug: string; sku: string } {
  const slugs = new Set([...taken.slugs].map((s) => s.toLowerCase())), skus = new Set([...taken.skus].map((s) => s.toUpperCase()));
  for (let n = 1; n < 1000; n++) {
    const suffix = n === 1 ? "copy" : `copy-${n}`;
    const s = `${slug}-${suffix}`, k = `${sku}-${suffix.toUpperCase()}`;
    if (!slugs.has(s) && !skus.has(k.toUpperCase())) return { slug: s, sku: k.toUpperCase() };
  }
  throw new Error("Could not find a free name for the copy.");
}

/**
 * A copy of a product, saved as a draft so it never goes on sale by accident.
 * Photos, details, variants, tags and prices are kept; variant SKUs get the same suffix so they stay unique.
 * Links to Printify, bundle membership, sales history and launch dates are not copied.
 */
export function duplicateProduct(p: Product, taken: { slugs: Iterable<string>; skus: Iterable<string> }, today: string): Product {
  const id = freshIdentity(p.slug, p.sku, taken);
  const suffix = id.sku.slice(p.sku.length);
  return {
    ...p, ...id, name: `${p.name} (copy)`, published: false, isFeatured: false, isNew: false, createdAt: today,
    printifyId: undefined, launchAt: undefined, bestSeller: undefined,
    variants: (p.variants ?? []).map((v) => ({ ...v, sku: v.sku ? `${v.sku}${suffix}` : v.sku })),
    images: [...p.images], imageAlts: [...(p.imageAlts ?? [])], details: [...p.details], tags: [...(p.tags ?? [])],
    bundleItems: (p.bundleItems ?? []).map((b) => ({ ...b })),
    seoTitle: undefined, canonicalUrl: undefined,
  };
}
