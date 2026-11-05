import { clip, productImageUrl } from "@/lib/seo";
import { absoluteUrl, formatPrice } from "@/lib/site";
import type { Category, Franchise, Product } from "@/lib/types";

export type EffectiveSeo = { title: string; description: string; image?: string; noindex: boolean; canonical: string; path: string };

/** What the storefront actually emits for a page, honouring admin overrides. Shared with the admin previews. */
export function productSeo(p: Product, f: Franchise | null | undefined): EffectiveSeo {
  const path = `/products/${p.slug}`;
  return {
    path,
    title: p.seoTitle?.trim() || `${p.name}${f ? ` - ${f.name}` : ""} | ${formatPrice(p.pricePence)}`,
    description: p.seoDescription?.trim() || clip(`${p.shortDescription} ${p.description}`),
    image: p.ogImage?.trim() || productImageUrl(p),
    noindex: Boolean(p.noindex) || p.published === false,
    canonical: p.canonicalUrl?.trim() || absoluteUrl(path),
  };
}

export function franchiseSeo(f: Franchise): EffectiveSeo {
  const path = `/franchises/${f.slug}`;
  return {
    path,
    title: f.seoTitle?.trim() || `${f.name} Merchandise & Official Store`,
    description: f.seoDescription?.trim() || clip(`Shop official ${f.name} merchandise. ${f.tagline} ${f.description}`),
    image: f.ogImage?.trim() || undefined,
    noindex: Boolean(f.noindex),
    canonical: absoluteUrl(path),
  };
}

export function categorySeo(c: Category): EffectiveSeo {
  const path = `/categories/${c.slug}`;
  return {
    path,
    title: c.seoTitle?.trim() || `${c.name} - Official Sparkthunder Merchandise`,
    description: c.seoDescription?.trim() || clip(`Shop official ${c.name.toLowerCase()} from Knightverge, Occult Inc and the Sparkthunder universe. ${c.description}`),
    image: c.ogImage?.trim() || undefined,
    noindex: Boolean(c.noindex),
    canonical: absoluteUrl(path),
  };
}
