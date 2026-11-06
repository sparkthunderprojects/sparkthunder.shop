export type Franchise = {
  slug: string;
  name: string;
  tagline: string;
  /** Long-form, unique editorial copy (aim for 200+ words) shown on the franchise page. */
  description: string;
  accent: string; // hex colour used for placeholder art + UI accents
  sortOrder: number;
  /** The universe's own website (e.g. https://knightverge.com). Shown as a link-out and used by the embeddable widget. */
  siteUrl?: string;
} & SeoFields;

export type Category = {
  slug: string;
  name: string;
  /** Unique intro copy shown above the category grid. */
  description: string;
  sortOrder: number;
} & SeoFields;

/** Search/social overrides editable in the admin. Empty strings mean "use the generated default". */
export type SeoFields = {
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  noindex?: boolean;
  focusKeyword?: string;
  updatedAt?: string;
};

export type BundleItem = { slug: string; qty: number };
export type Variant = { name: string; sku: string; stockQty: number; pricePence?: number };

export type Product = {
  slug: string;
  sku: string;
  name: string;
  franchiseSlug: string;
  categorySlug: string;
  /** Price in minor units (pence). */
  pricePence: number;
  /** Optional original price in pence for sale items. */
  comparePricePence?: number;
  shortDescription: string;
  description: string;
  details: string[];
  /** Public image URLs. Empty = generated placeholder art is used. */
  images: string[];
  inStock: boolean;
  isNew: boolean;
  isFeatured: boolean;
  createdAt: string; // ISO date
  /** Alt text per image, same order as `images`. */
  imageAlts?: string[];
  tags?: string[];
  canonicalUrl?: string;
  trackStock?: boolean;
  stockQty?: number;
  lowStockThreshold?: number;
  variants?: Variant[];
  /** A bundle contains these products (no variants) and sells at its own price. */
  bundleItems?: BundleItem[];
  /** Admin-only: draft products are hidden from the storefront. */
  published?: boolean;
} & SeoFields;

export type Catalog = {
  franchises: Franchise[];
  categories: Category[];
  products: Product[];
};
