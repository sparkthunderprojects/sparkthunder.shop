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
  /** Set from a collection with a launch date; the product cannot be bought before it. */
  launchAt?: string;
  /** Admin-only: draft products are hidden from the storefront. */
  published?: boolean;
} & SeoFields;

/** A themed drop or collection. Products in a collection with a future launch date can be seen but not bought until then. */
export type Collection = {
  slug: string; name: string; description: string; image: string;
  /** ISO timestamp the collection goes on sale (empty = already live). */
  launchAt?: string; productSlugs: string[]; sortOrder: number; published: boolean;
};

export type Catalog = {
  franchises: Franchise[];
  categories: Category[];
  products: Product[];
  collections?: Collection[];
};
