import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/catalog";
import { SITE, absoluteUrl, toRelative } from "@/lib/site";
import { getSiteInfo } from "@/lib/site-info";
import { LOCALE_INFO, localePath } from "@/lib/i18n/config";
import { getLanguages, getLocale } from "@/lib/i18n/server";

export async function buildMetadata(opts: {
  title: string | { absolute: string };
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  canonical?: string;
}): Promise<Metadata> {
  const [info, settings, locale, enabled] = await Promise.all([getSiteInfo(), getSiteSettings(), getLocale(), getLanguages()]);
  // Paths are resolved against the store's metadataBase; a custom canonical is kept as written.
  const english = toRelative(opts.canonical ?? absoluteUrl(opts.path));
  const url = localePath(english, locale); // each language's page is its own canonical
  // Every switched-on language names all of its siblings (and itself), plus the English page as the default.
  const languages: Record<string, string> = enabled.length > 1
    ? { ...Object.fromEntries(enabled.map((l) => [LOCALE_INFO[l].html, localePath(english, l)])), "x-default": english }
    : { [SITE.locale.replace("_", "-")]: url, "x-default": url };
  const plain = typeof opts.title === "string" ? opts.title : opts.title.absolute;
  const img = opts.image ? toRelative(opts.image) : undefined;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url, languages },
    robots: opts.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: opts.type ?? "website",
      url,
      siteName: info.brand,
      locale: LOCALE_INFO[locale].og,
      title: plain,
      description: opts.description,
      ...((img ?? settings.defaultOgImage) ? { images: [{ url: img ?? settings.defaultOgImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      site: settings.twitterHandle || SITE.twitter,
      title: plain,
      description: opts.description,
      ...((img ?? settings.defaultOgImage) ? { images: [img ?? settings.defaultOgImage] } : {}),
    },
  };
}
