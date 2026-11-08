import type { Metadata } from "next";
import { BRAND_TOKEN, SITE, absoluteUrl } from "@/lib/site";
import type { Category, Franchise, Product } from "@/lib/types";

/** Absolute URL of the primary image for a product (generated art if no photo uploaded). */
export function productImageUrl(p: Product): string {
  const first = p.images[0];
  if (first) return first.startsWith("http") ? first : absoluteUrl(first);
  return absoluteUrl(`/art/${p.slug}`);
}

/** Trim to a SERP-friendly meta description length without cutting mid-word. */
export function clip(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function organizationLd(sameAs: string[] = SITE.sameAs, brand?: { name: string; logo: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: brand?.name ?? BRAND_TOKEN,
    url: absoluteUrl("/"),
    ...(brand?.logo === "" ? {} : { logo: /^https?:/.test(brand?.logo ?? "") ? brand!.logo : absoluteUrl(brand?.logo ?? "/sparkthunder-logo.png") }),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteLd(brand?: { name: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: absoluteUrl("/"),
    name: brand?.name ?? BRAND_TOKEN,
    description: brand?.description ?? "",
    publisher: { "@id": absoluteUrl("/#organization") },
    inLanguage: "en-GB",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: absoluteUrl("/search?q={search_term_string}") },
      "query-input": "required name=search_term_string",
    },
  };
}

function productOffers(p: Product) {
  const url = absoluteUrl(`/products/${p.slug}`);
  const upcoming = Boolean(p.launchAt && Date.parse(p.launchAt) > Date.now());
  const avail = (inStock: boolean) => (upcoming ? "https://schema.org/PreOrder" : inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock");
  const offer = (price: number, inStock: boolean, extra: Record<string, unknown> = {}) => ({
    "@type": "Offer", url, priceCurrency: SITE.currency, price: (price / 100).toFixed(2),
    itemCondition: "https://schema.org/NewCondition", availability: avail(inStock), seller: { "@id": absoluteUrl("/#organization") }, ...extra,
  });
  const vs = p.variants ?? [];
  if (!vs.length) return offer(p.pricePence, p.inStock);
  const each = vs.map((v) => offer(v.pricePence ?? p.pricePence, p.trackStock ? v.stockQty > 0 : p.inStock, { sku: v.sku || p.sku, name: `${p.name} (${v.name})` }));
  const prices = vs.map((v) => v.pricePence ?? p.pricePence);
  return { "@type": "AggregateOffer", url, priceCurrency: SITE.currency, lowPrice: (Math.min(...prices) / 100).toFixed(2), highPrice: (Math.max(...prices) / 100).toFixed(2), offerCount: vs.length, offers: each };
}

export function productLd(p: Product, franchise: Franchise | null, category: Category | null, reviews?: { count: number; average: number; reviews: { name: string; rating: number; title: string; body: string; createdAt: string }[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": absoluteUrl(`/products/${p.slug}#product`),
    name: p.name,
    description: p.description,
    sku: p.sku,
    mpn: p.sku,
    image: p.images.length ? p.images.map((src) => (src.startsWith("http") ? src : absoluteUrl(src))) : [productImageUrl(p)],
    url: absoluteUrl(`/products/${p.slug}`),
    brand: { "@type": "Brand", name: franchise?.name ?? BRAND_TOKEN },
    ...(category ? { category: category.name } : {}),
    manufacturer: { "@id": absoluteUrl("/#organization") },
    ...(reviews && reviews.count > 0 ? {
      aggregateRating: { "@type": "AggregateRating", ratingValue: reviews.average, reviewCount: reviews.count, bestRating: 5, worstRating: 1 },
      review: reviews.reviews.slice(0, 5).map((r) => ({ "@type": "Review", author: { "@type": "Person", name: r.name }, datePublished: r.createdAt.slice(0, 10), reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 }, ...(r.title ? { name: r.title } : {}), reviewBody: r.body })),
    } : {}),
    offers: productOffers(p),
  };
}

export function itemListLd(name: string, path: string, products: Product[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url: absoluteUrl(path),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/products/${p.slug}`),
        name: p.name,
      })),
    },
  };
}
