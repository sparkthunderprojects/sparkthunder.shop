export type Franchise = {
  slug: string;
  name: string;
  tagline: string;
  /** Long-form, unique editorial copy (aim for 200+ words) shown on the franchise page. */
  description: string;
  accent: string; // hex colour used for placeholder art + UI accents
  sortOrder: number;
};

export type Category = {
  slug: string;
  name: string;
  /** Unique intro copy shown above the category grid. */
  description: string;
  sortOrder: number;
};

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
};

export type Catalog = {
  franchises: Franchise[];
  categories: Category[];
  products: Product[];
};
