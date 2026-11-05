import type { Category, Franchise, Product, Variant } from "@/lib/types";

export type FranchiseRow = {
  slug: string; name: string; tagline: string; description: string; accent: string; sort_order: number; site_url?: string;
  seo_title?: string; seo_description?: string; og_image?: string; noindex?: boolean; focus_keyword?: string; updated_at?: string;
};
export type CategoryRow = {
  slug: string; name: string; description: string; sort_order: number;
  seo_title?: string; seo_description?: string; og_image?: string; noindex?: boolean; focus_keyword?: string; updated_at?: string;
};
export type ProductRow = {
  slug: string; sku: string; name: string; franchise_slug: string; category_slug: string;
  price_pence: number; compare_price_pence: number | null; short_description: string;
  description: string; details: string[] | null; images: string[] | null;
  in_stock: boolean; is_new: boolean; is_featured: boolean; published?: boolean; created_at: string;
  seo_title?: string; seo_description?: string; canonical_url?: string; og_image?: string; noindex?: boolean; focus_keyword?: string;
  tags?: string[] | null; image_alts?: string[] | null; track_stock?: boolean; stock_qty?: number; low_stock_threshold?: number;
  variants?: Variant[] | null; updated_at?: string;
};

export const franchiseFromRow = (r: FranchiseRow): Franchise => ({
  slug: r.slug, name: r.name, tagline: r.tagline, description: r.description, accent: r.accent, sortOrder: r.sort_order, siteUrl: r.site_url ?? "",
  seoTitle: r.seo_title ?? "", seoDescription: r.seo_description ?? "", ogImage: r.og_image ?? "", noindex: r.noindex ?? false,
  focusKeyword: r.focus_keyword ?? "", updatedAt: r.updated_at,
});
export const franchiseToRow = (f: Franchise): FranchiseRow => ({
  slug: f.slug, name: f.name, tagline: f.tagline, description: f.description, accent: f.accent, sort_order: f.sortOrder, site_url: f.siteUrl ?? "",
  seo_title: f.seoTitle ?? "", seo_description: f.seoDescription ?? "", og_image: f.ogImage ?? "", noindex: f.noindex ?? false, focus_keyword: f.focusKeyword ?? "",
});

export const categoryFromRow = (r: CategoryRow): Category => ({
  slug: r.slug, name: r.name, description: r.description, sortOrder: r.sort_order,
  seoTitle: r.seo_title ?? "", seoDescription: r.seo_description ?? "", ogImage: r.og_image ?? "", noindex: r.noindex ?? false,
  focusKeyword: r.focus_keyword ?? "", updatedAt: r.updated_at,
});
export const categoryToRow = (c: Category): CategoryRow => ({
  slug: c.slug, name: c.name, description: c.description, sort_order: c.sortOrder,
  seo_title: c.seoTitle ?? "", seo_description: c.seoDescription ?? "", og_image: c.ogImage ?? "", noindex: c.noindex ?? false, focus_keyword: c.focusKeyword ?? "",
});

export const productFromRow = (r: ProductRow): Product => {
  const trackStock = r.track_stock ?? false;
  const stockQty = r.stock_qty ?? 0;
  const variants = r.variants ?? [];
  const variantStock = variants.reduce((n, v) => n + (v.stockQty ?? 0), 0);
  const tracked = trackStock ? (variants.length ? variantStock : stockQty) : null;
  return {
    slug: r.slug, sku: r.sku, name: r.name, franchiseSlug: r.franchise_slug, categorySlug: r.category_slug,
    pricePence: r.price_pence, comparePricePence: r.compare_price_pence ?? undefined,
    shortDescription: r.short_description, description: r.description, details: r.details ?? [], images: r.images ?? [],
    // With stock tracking on, availability follows the counted stock; otherwise the manual flag decides.
    inStock: tracked === null ? r.in_stock : tracked > 0,
    isNew: r.is_new, isFeatured: r.is_featured, createdAt: r.created_at, published: r.published ?? true,
    imageAlts: r.image_alts ?? [], tags: r.tags ?? [], canonicalUrl: r.canonical_url ?? "",
    trackStock, stockQty, lowStockThreshold: r.low_stock_threshold ?? 5, variants,
    seoTitle: r.seo_title ?? "", seoDescription: r.seo_description ?? "", ogImage: r.og_image ?? "", noindex: r.noindex ?? false,
    focusKeyword: r.focus_keyword ?? "", updatedAt: r.updated_at,
  };
};
export const productToRow = (p: Product): ProductRow => ({
  slug: p.slug, sku: p.sku, name: p.name, franchise_slug: p.franchiseSlug, category_slug: p.categorySlug,
  price_pence: p.pricePence, compare_price_pence: p.comparePricePence ?? null,
  short_description: p.shortDescription, description: p.description, details: p.details, images: p.images,
  in_stock: p.inStock, is_new: p.isNew, is_featured: p.isFeatured, published: p.published ?? true, created_at: p.createdAt,
  seo_title: p.seoTitle ?? "", seo_description: p.seoDescription ?? "", canonical_url: p.canonicalUrl ?? "", og_image: p.ogImage ?? "",
  noindex: p.noindex ?? false, focus_keyword: p.focusKeyword ?? "", tags: p.tags ?? [], image_alts: p.imageAlts ?? [],
  track_stock: p.trackStock ?? false, stock_qty: p.stockQty ?? 0, low_stock_threshold: p.lowStockThreshold ?? 5, variants: p.variants ?? [],
});
