import type { MetadataRoute } from "next";
import { getCharacters } from "@/lib/characters";
import { getHelp } from "@/lib/help-ctx";
import { HELP_CATEGORIES, helpPath } from "@/lib/help";
import { getCommerce } from "@/lib/commerce";
import { enabledMethods } from "@/lib/pay-later";
import { getAllProducts, getCategories, getCollections, getFranchises } from "@/lib/catalog";
import { franchiseSeo, categorySeo, productSeo } from "@/lib/seo/effective";
import { LEGAL_PAGES, absoluteUrl } from "@/lib/site";
import { fillForRequest } from "@/lib/site-info";
import { currentStoreId, DEFAULT_STORE_ID } from "@/lib/db/stores";
import { getLanguages } from "@/lib/i18n/server";
import { LOCALE_INFO, localePath, type Locale } from "@/lib/i18n/config";

const inLocale = (url: string, l: Locale) => { const u = new URL(url); u.pathname = localePath(u.pathname, l); return u.toString(); };

export const revalidate = 3600;
const LEGAL_UPDATED = "2026-11-08";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payPages = enabledMethods((await getCommerce()).payLater);
  const help = (await getHelp()).articles;
  const isMain = (await currentStoreId()) === DEFAULT_STORE_ID;
  const [franchises, categories, products, collections, characters] = await Promise.all([getFranchises(), getCategories(), getAllProducts(), getCollections(), isMain ? getCharacters() : Promise.resolve([])]);
  const latest = products.reduce((m, p) => (p.createdAt > m ? p.createdAt : m), "2026-01-01");
  const languages = await getLanguages();
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: latest, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/franchises"), lastModified: latest, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/new"), lastModified: latest, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/shop"), lastModified: latest, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/collections"), lastModified: latest, changeFrequency: "weekly", priority: 0.7 },
    ...collections.map((c) => ({ url: absoluteUrl(`/collections/${c.slug}`), lastModified: latest, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: absoluteUrl("/characters"), lastModified: latest, changeFrequency: "weekly", priority: 0.6 },
    ...characters.filter((c) => c.count > 0).map((c) => ({ url: absoluteUrl(`/characters/${c.slug}`), lastModified: latest, changeFrequency: "weekly" as const, priority: 0.6 })),
    { url: absoluteUrl("/help"), lastModified: LEGAL_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    ...HELP_CATEGORIES.map((c) => ({ url: absoluteUrl(`/help/${c.slug}`), lastModified: LEGAL_UPDATED, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...help.map((a) => ({ url: absoluteUrl(helpPath(a)), lastModified: LEGAL_UPDATED, changeFrequency: "monthly" as const, priority: 0.5 })),
    { url: absoluteUrl("/help/contact"), lastModified: LEGAL_UPDATED, changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/gift-cards"), lastModified: latest, changeFrequency: "monthly", priority: 0.7 },
    ...(payPages.length ? [{ url: absoluteUrl("/payment-options"), lastModified: latest, changeFrequency: "monthly" as const, priority: 0.5 }, ...payPages.map((m) => ({ url: absoluteUrl(`/payment-options/${m}`), lastModified: latest, changeFrequency: "monthly" as const, priority: 0.5 }))] : []),
    { url: absoluteUrl("/gift-cards/send"), lastModified: latest, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/gifts"), lastModified: latest, changeFrequency: "weekly", priority: 0.7 },
    ...LEGAL_PAGES.map((l) => ({ url: absoluteUrl(l.href), lastModified: LEGAL_UPDATED, changeFrequency: "yearly" as const, priority: 0.2 })),
    ...franchises.filter((f) => !franchiseSeo(f).noindex).map((f) => ({ url: absoluteUrl(`/franchises/${f.slug}`), lastModified: f.updatedAt ?? latest, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...categories.filter((c) => !categorySeo(c).noindex).map((c) => ({ url: absoluteUrl(`/categories/${c.slug}`), lastModified: c.updatedAt ?? latest, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.filter((p) => !productSeo(p, null).noindex).map((p) => ({
      url: absoluteUrl(`/products/${p.slug}`),
      lastModified: p.updatedAt ?? p.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: p.images.length ? p.images.map((src) => (src.startsWith("http") ? src : absoluteUrl(src))) : [absoluteUrl(`/art/${p.slug}`)],
    })),
  ];
  // With more than one language on, every address is listed once per language and each names its siblings.
  const all = languages.length < 2 ? entries : entries.flatMap((e) => {
    const alternates = { languages: { ...Object.fromEntries(languages.map((l) => [LOCALE_INFO[l].html, inLocale(e.url, l)])), "x-default": e.url } };
    return languages.map((l) => ({ ...e, url: inLocale(e.url, l), alternates }));
  });
  return fillForRequest(all);
}
