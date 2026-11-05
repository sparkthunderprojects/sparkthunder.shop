import type { Product } from "@/lib/types";

/** The small, serialisable slice of a product that client widgets (quick view, suggestions) need. */
export type QuickProduct = {
  slug: string;
  name: string;
  pricePence: number;
  comparePricePence?: number;
  image: string;
  shortDescription: string;
  franchiseName?: string;
  inStock: boolean;
  images: string[];
  details: string[];
  trackStock: boolean;
  variants: { name: string; stockQty: number; pricePence?: number }[];
};

export const productImagePath = (p: Pick<Product, "slug" | "images">) => p.images[0] ?? `/art/${p.slug}`;

/** Generated placeholder art is served by our own route and must skip the image optimiser. */
export const isPlaceholderArt = (src: string) => src.startsWith("/art/");

export function toQuick(p: Product, franchiseName?: string): QuickProduct {
  return {
    slug: p.slug,
    name: p.name,
    pricePence: p.pricePence,
    comparePricePence: p.comparePricePence,
    image: productImagePath(p),
    shortDescription: p.shortDescription,
    franchiseName,
    inStock: p.inStock,
    images: (p.images.length ? p.images : [`/art/${p.slug}`]).slice(0, 5),
    details: p.details.slice(0, 5),
    trackStock: Boolean(p.trackStock),
    variants: (p.variants ?? []).map((v) => ({ name: v.name, stockQty: v.stockQty, pricePence: v.pricePence })),
  };
}

export function discountPercent(p: { pricePence: number; comparePricePence?: number }): number | null {
  if (!p.comparePricePence || p.comparePricePence <= p.pricePence) return null;
  return Math.round((1 - p.pricePence / p.comparePricePence) * 100);
}
