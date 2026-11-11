import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/catalog";
import { SITE, absoluteUrl, toRelative } from "@/lib/site";
import { getSiteInfo } from "@/lib/site-info";

export async function buildMetadata(opts: {
  title: string | { absolute: string };
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  canonical?: string;
}): Promise<Metadata> {
  const [info, settings] = await Promise.all([getSiteInfo(), getSiteSettings()]);
  // Paths are resolved against the store's metadataBase; a custom canonical is kept as written.
  const url = toRelative(opts.canonical ?? absoluteUrl(opts.path));
  const plain = typeof opts.title === "string" ? opts.title : opts.title.absolute;
  const img = opts.image ? toRelative(opts.image) : undefined;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url, languages: { [SITE.locale.replace("_", "-")]: url, "x-default": url } }, // a page that names itself for its language and as the default: valid hreflang for a one-language store
    robots: opts.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: opts.type ?? "website",
      url,
      siteName: info.brand,
      locale: SITE.locale,
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
