import type { Metadata } from "next";
import { SITE, absoluteUrl } from "@/lib/site";
import type { Category, Franchise, Product } from "@/lib/types";

/** Absolute URL of the primary image for a product (generated art if no photo uploaded). */
export function productImageUrl(p: Product): string {
  const first = p.images[0];
  if (first) return first.startsWith("http") ? first : absoluteUrl(first);
  return absoluteUrl(`/art/${p.slug}`);
}

export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
}): Metadata {
  const url = absoluteUrl(opts.path);
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    robots: opts.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: opts.type ?? "website",
      url,
      siteName: SITE.name,
      locale: SITE.locale,
      title: opts.title,
      description: opts.description,
      ...(opts.image ? { images: [{ url: opts.image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: opts.title,
      description: opts.description,
      ...(opts.image ? { images: [opts.image] } : {}),
    },
  };
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

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: SITE.legalName,
    url: SITE.url,
    logo: absoluteUrl("/logo"),
    ...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    publisher: { "@id": absoluteUrl("/#organization") },
    inLanguage: "en-GB",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function productLd(p: Product, franchise: Franchise | null, category: Category | null) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": absoluteUrl(`/products/${p.slug}#product`),
    name: p.name,
    description: p.description,
    sku: p.sku,
    mpn: p.sku,
    image: [productImageUrl(p)],
    url: absoluteUrl(`/products/${p.slug}`),
    brand: { "@type": "Brand", name: franchise?.name ?? SITE.legalName },
    ...(category ? { category: category.name } : {}),
    manufacturer: { "@id": absoluteUrl("/#organization") },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${p.slug}`),
      priceCurrency: SITE.currency,
      price: (p.pricePence / 100).toFixed(2),
      itemCondition: "https://schema.org/NewCondition",
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@id": absoluteUrl("/#organization") },
    },
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
